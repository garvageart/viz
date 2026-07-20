package routes

import (
	"bytes"
	"crypto/sha1"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/render"
	_ "github.com/joho/godotenv/autoload"
	"gorm.io/gorm"

	"viz/internal/config"
	dbops "viz/internal/db"
	"viz/internal/downloads"
	"viz/internal/dto"
	"viz/internal/entities"
	libhttp "viz/internal/http"
	"viz/internal/images"
	imageops "viz/internal/images/ops"
	libvips "viz/internal/images/ops/vips"
	"viz/internal/images/transform"
	"viz/internal/jobs"
	"viz/internal/jobs/workers"
	libos "viz/internal/os"
	"viz/internal/uid"
	"viz/internal/utils"
)

type ImageUpload struct {
	Name    string `json:"name,omitempty"`
	Private bool   `json:"private"`
}

type ImageUploadError struct {
	ID        string `json:"id"`
	Reason    string `json:"reason"`
	Retryable bool   `json:"retryable"`
	Error     string `json:"error"`
}

var ErrImageUnauthorised = errors.New("unauthorized")

func createNewImageEntity(logger *slog.Logger, fileName string, libvipsImg *libvips.Image, rawData []byte) (*entities.ImageAsset, error) {
	logger.Info("Generating ID", slog.String("file", fileName))
	id, err := uid.Generate()

	if err != nil {
		return nil, fmt.Errorf("failed to generate ID: %w", err)
	}

	if strings.Trim(fileName, " ") == "" {
		fileName = id
	}

	logger = logger.With(
		slog.String("name", fileName),
		slog.String("id", id),
	)

	logger.Info("reading exif data")
	exifData, err := imageops.GetExifData(rawData)
	if err != nil {
		return nil, fmt.Errorf("failed to extract exif: %w", err)
	}

	if len(exifData) == 0 {
		logger.Warn("No exif data found. Blank fields", slog.String("file", fileName))
	} else {
		logger.Debug("exif data", slog.Any("data", exifData), slog.Int("length", len(exifData)))
	}

	exif, fileCreatedAt, fileModifiedAt := imageops.BuildImageEXIF(exifData)

	// Apply post-hoc corrections and enrichments (MakerNote tags, etc.)
	imageops.HandleExifQuirks(&exif, rawData)

	// If EXIF contains a rating-like value, parse it and set the initial
	// canonical rating on the image entity (clamped to 0..5). We store the
	// raw EXIF rating in Exif.Rating as provenance but the top-level Rating
	// becomes the canonical value once DB column exists / migration runs.
	var initialRating *int
	if exif.Rating != nil {
		if r, err := strconv.Atoi(*exif.Rating); err == nil {
			if r < 0 {
				r = 0
			} else if r > 5 {
				r = 5
			}
			initialRating = &r
		}
	}

	var keywords []string
	keywordsPtr := imageops.FindExif(exifData, "Keywords", "Subject")
	if keywordsPtr != nil {
		keywords = strings.Split(*keywordsPtr, ",")
		// Filter out empty strings from comma-separated list
		filtered := keywords[:0]
		for _, k := range keywords {
			if strings.TrimSpace(k) != "" {
				filtered = append(filtered, k)
			}
		}
		keywords = filtered
	}

	metadata := dto.ImageMetadata{
		FileName:         fileName,
		OriginalFileName: &fileName,
		FileType:         string(libvipsImg.Format()),
		ColorSpace:       imageops.GetColourSpaceString(libvipsImg),
		FileModifiedAt:   fileModifiedAt,
		FileCreatedAt:    fileCreatedAt,
		Keywords:         &keywords,
	}

	// Seed canonical rating into the stored image metadata (NULL = unrated)
	metadata.Rating = initialRating

	// Construct paths with reasonable defaults matching the {uid}/file route params
	originalPath := fmt.Sprintf("/images/%s/file", id)

	thumbParams, _ := images.GetPermanentTransformParams(images.TransformThumbnail)
	previewParams, _ := images.GetPermanentTransformParams(images.TransformPreview)

	thumbnailPath := fmt.Sprintf("/images/%s/file?%s", id, thumbParams.ToQueryString())
	previewPath := fmt.Sprintf("/images/%s/file?%s", id, previewParams.ToQueryString())

	paths := dto.ImagePaths{
		Original:  originalPath,
		Thumbnail: thumbnailPath,
		Preview:   previewPath,
	}

	allImageData := entities.ImageAsset{
		Uid:           id,
		Name:          fileName,
		Private:       false,
		Processed:     false,
		Exif:          &exif,
		ImageMetadata: &metadata,
		ImagePaths:    paths,
		Width:         int32(libvipsImg.Width()),
		Height:        int32(libvipsImg.Height()),
		Description:   nil, // TODO: evaluate if necessary, blank for now
	}

	ta := imageops.GetTakenAt(allImageData)
	allImageData.TakenAt = &ta

	return &allImageData, nil
}

// moveDirWithFallback attempts to rename src->dst. If rename fails (e.g., cross-device),
// it copies the directory contents to dst and removes the src directory.
func moveDirWithFallback(src, dst string) error {
	return libos.MoveDirWithFallback(src, dst)
}

func ImagesRouter(db *gorm.DB, logger *slog.Logger) *chi.Mux {
	router := chi.NewRouter()

	// List images with pagination
	router.Get("/", func(res http.ResponseWriter, req *http.Request) {
		limitStr := req.URL.Query().Get("limit")
		pageStr := req.URL.Query().Get("page")
		sortByParam := req.URL.Query().Get("sort_by")
		orderParam := req.URL.Query().Get("order")

		limit := 100
		page := 0

		if limitStr != "" {
			if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
				limit = parsed
			}
		}

		if pageStr != "" {
			if parsed, err := strconv.Atoi(pageStr); err == nil && parsed >= 0 {
				page = parsed
			}
		}

		sortBy := "taken_at"
		allowedSortBy := []string{"taken_at", "recently_added", "updated_at", "name"}
		if slices.Contains(allowedSortBy, sortByParam) {
			sortBy = sortByParam
		}

		order := "DESC"
		if strings.ToUpper(orderParam) == "ASC" {
			order = "ASC"
		}

		dbSortBy := sortBy
		if sortBy == "recently_added" {
			dbSortBy = "created_at"
		}

		var images []entities.ImageAsset
		var total int64

		if err := db.WithContext(req.Context()).Transaction(func(tx *gorm.DB) error {
			query := tx.Model(&entities.ImageAsset{}).Where("deleted_at IS NULL")

			// Access Control: Filter private images
			query = dbops.ApplyImageAccessControlFilter(query, req)

			// Count total non-deleted images for pagination metadata
			if err := query.Count(&total).Error; err != nil {
				return err
			}

			var orderClause string
			if dbSortBy == "taken_at" {
				orderClause = fmt.Sprintf("taken_at %s NULLS LAST, name %s", order, order)
			} else {
				orderClause = fmt.Sprintf("%s %s", dbSortBy, order)
			}

			pageOffset := max(page*limit, 0)
			if err := query.Preload("Owner").Preload("UploadedBy").Order(orderClause).Offset(pageOffset).Limit(limit).Find(&images).Error; err != nil {
				return err
			}

			return nil
		}); err != nil {
			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "Failed to fetch images"})
			return
		}

		items := make([]dto.ImagesResponse, len(images))
		for i, img := range images {
			items[i] = dto.ImagesResponse{
				AddedAt: img.CreatedAt,
				AddedBy: func() *dto.User {
					if img.UploadedBy != nil {
						d := img.UploadedBy.DTO()
						return &d
					}
					return nil
				}(),
				Image: img.DTO(),
			}
		}

		// Build pagination links
		queryParts := []string{fmt.Sprintf("limit=%d", limit)}
		if sortByParam != "" {
			queryParts = append(queryParts, fmt.Sprintf("sort_by=%s", sortBy))
		}
		if orderParam != "" {
			queryParts = append(queryParts, fmt.Sprintf("order=%s", strings.ToLower(order)))
		}

		baseQuery := strings.Join(queryParts, "&")
		href := fmt.Sprintf("/images?%s&page=%d", baseQuery, page)

		var prev *string
		var next *string
		hasPrev := page > 0
		hasNext := int64((page+1)*limit) < total
		if hasPrev {
			p := fmt.Sprintf("/images?%s&page=%d", baseQuery, page-1)
			prev = &p
		}

		if hasNext {
			nx := fmt.Sprintf("/images?%s&page=%d", baseQuery, page+1)
			next = &nx
		}

		count := int(total)
		response := dto.ImagesListResponse{
			Href:  &href,
			Prev:  prev,
			Next:  next,
			Limit: limit,
			Page:  page,
			Count: &count,
			Items: items,
		}

		render.Status(req, http.StatusOK)
		render.JSON(res, req, response)
	})

	router.Get("/{uid}/file", func(res http.ResponseWriter, req *http.Request) {
		uid := chi.URLParam(req, "uid")
		logger := logger.With(slog.String("uid", uid))

		params, err := imageops.ParseTransformParams(req.URL.String())
		if err != nil {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.ErrorResponse{Error: "Invalid transform parameters"})
			return
		}

		logger.Debug("params for image", slog.String("uid", uid), slog.Any("params", params))

		if params.Height < 0 || params.Width < 0 {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.ErrorResponse{Error: "Invalid width/height parameters"})
			return
		}

		var imgEnt entities.ImageAsset
		query := db.Model(&entities.ImageAsset{}).Where("uid = ? AND deleted_at IS NULL", uid)
		if req.URL.Query().Get("token") == "" {
			query = dbops.ApplyImageAccessControlFilter(query, req)
		}
		if result := query.First(&imgEnt); result.Error != nil {
			if result.Error == gorm.ErrRecordNotFound {
				render.Status(req, http.StatusNotFound)
				render.JSON(res, req, dto.ErrorResponse{Error: "Image not found"})
				return
			}

			logger.Error("failed to fetch image from database", slog.Any("error", result.Error))
			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "Failed to fetch image from database"})
			return
		}

		if imgEnt.ImageMetadata == nil {
			logger.Error("Image metadata is missing", slog.String("uid", uid))
			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "Image is corrupted (missing metadata)"})
			return
		}

		isDownload := req.URL.Query().Get("download") == "1"
		if isDownload {
			if !validateDownloadRequest(res, req, db, uid) {
				return
			}
		}

		hasTransformParams := params.Format != "" || params.Width > 0 || params.Height > 0 || params.Quality > 0 || params.Rotate > 0 || params.Flip != ""
		if !hasTransformParams {
			serveOriginalImage(res, req, logger, &imgEnt, isDownload)
			return
		}

		serveTransformedImage(res, req, logger, &imgEnt, params, isDownload)
	})

	router.Get("/{uid}/exif", func(res http.ResponseWriter, req *http.Request) {
		uid := chi.URLParam(req, "uid")
		simple := req.URL.Query().Get("simple") == "true"

		var imgEnt entities.ImageAsset
		query := db.Model(&entities.ImageAsset{}).Where("uid = ? AND deleted_at IS NULL", uid)
		query = dbops.ApplyImageAccessControlFilter(query, req)
		result := query.First(&imgEnt)

		if result.Error != nil {
			if result.Error == gorm.ErrRecordNotFound {
				render.Status(req, http.StatusNotFound)
				render.JSON(res, req, dto.ErrorResponse{Error: "Image not found"})
				return
			}

			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "Failed to retrieve image"})
			return
		}

		if simple {
			if imgEnt.Exif == nil {
				render.Status(req, http.StatusNotFound)
				render.JSON(res, req, dto.ErrorResponse{Error: "No exif data"})
				return
			}

			render.Status(req, http.StatusOK)
			render.JSON(res, req, imgEnt.Exif)
			return
		}

		if imgEnt.ImageMetadata == nil {
			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "Image metadata missing"})
			return
		}

		imageFile, err := images.ReadImage(imgEnt.Uid, imgEnt.ImageMetadata.FileName)
		if err != nil {
			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "Failed to read image"})
			return
		}

		exifData, err := imageops.GetExifData(imageFile)
		if err != nil {
			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "Failed to extract exif"})
			return
		}

		render.Status(req, http.StatusOK)
		render.JSON(res, req, exifData)
	})

	router.Get("/{uid}", func(res http.ResponseWriter, req *http.Request) {
		uid := chi.URLParam(req, "uid")

		var imgEnt entities.ImageAsset
		query := db.Preload("Owner").Preload("UploadedBy").Model(&entities.ImageAsset{}).Where("uid = ? AND deleted_at IS NULL", uid)
		query = dbops.ApplyImageAccessControlFilter(query, req)
		result := query.First(&imgEnt)

		if result.Error != nil {
			if result.Error == gorm.ErrRecordNotFound {
				render.Status(req, http.StatusNotFound)
				render.JSON(res, req, dto.ErrorResponse{Error: "Image not found"})
				return
			}

			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "Failed to retrieve image"})
			return
		}

		render.Status(req, http.StatusOK)
		render.JSON(res, req, imgEnt.DTO())
	})

	router.Patch("/{uid}", func(res http.ResponseWriter, req *http.Request) {
		uid := chi.URLParam(req, "uid")
		var update dto.ImageUpdate

		if err := render.DecodeJSON(req.Body, &update); err != nil {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.ErrorResponse{Error: "Invalid request body"})
			return
		}

		var img entities.ImageAsset
		err := db.Transaction(func(tx *gorm.DB) error {
			query := tx.Model(&entities.ImageAsset{}).Where("uid = ? AND deleted_at IS NULL", uid)
			query = dbops.ApplyImageAccessControlFilter(query, req)
			if e := query.First(&img); e.Error != nil {
				return e.Error
			}

			// Access Control: Only owner can update (admins may bypass)
			if !libhttp.IsAdminFromRequest(req) {
				authUser, ok := libhttp.UserFromContext(req)
				if !ok || (img.OwnerID != nil && *img.OwnerID != authUser.Uid) {
					return ErrImageUnauthorised
				}
			}

			updateImageFromDTO(&img, update)

			if err := tx.Save(&img).Error; err != nil {
				return err
			}

			// send updated data
			if err := tx.Preload("Owner").Preload("UploadedBy").First(&img, "uid = ?", uid).Error; err != nil {
				return err
			}

			return nil
		})

		if err != nil {
			if err == gorm.ErrRecordNotFound {
				render.Status(req, http.StatusNotFound)
				render.JSON(res, req, dto.ErrorResponse{Error: "Image not found"})
				return
			}

			if err.Error() == "unauthorized" {
				render.Status(req, http.StatusForbidden)
				render.JSON(res, req, dto.ErrorResponse{Error: "You do not have permission to update this image"})
				return
			}

			logger.Error("Failed to update image", slog.Any("error", err))
			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "Something went wrong, please try again later"})
			return
		}

		logger.Info("triggering background xmp update", slog.String("uid", img.Uid))
		_, err = jobs.Enqueue(db, workers.TopicXMPGeneration, &workers.XMPGenerationJob{Image: img}, nil, &img.Uid)
		if err != nil {
			logger.Error("failed to enqueue xmp generation job", slog.Any("error", err))
		}

		render.Status(req, http.StatusOK)
		render.JSON(res, req, img.DTO())
	})

	// Dedicated download route: creates a short-lived signed redirect to the
	// file endpoint with download=1 so clients (or browsers) can follow a URL
	// that forces a download and is authorized by HMAC signature.
	router.Get("/{uid}/download", func(res http.ResponseWriter, req *http.Request) {
		uid := chi.URLParam(req, "uid")

		// Create a short-lived opaque token and redirect to the file URL
		token, err := downloads.CreateToken(db, []string{uid}, 5*time.Minute)
		if err != nil {
			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "Failed to create download token"})
			return
		}

		redirectURL := fmt.Sprintf("/images/%s/file?download=1&token=%s", uid, token)
		http.Redirect(res, req, redirectURL, http.StatusFound)
	})

	router.Post("/", func(res http.ResponseWriter, req *http.Request) {
		var fileImageUpload dto.ImageUploadRequest

		// Parse the multipart form in the request
		err := req.ParseMultipartForm(10 << 20) // limit your max input length!
		if err != nil {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.ErrorResponse{Error: "Invalid request body"})
			return
		}

		fileImageUpload.FileName = req.FormValue("file_name")
		fileImageUpload.Checksum = utils.StringPtr(req.FormValue("checksum"))

		// Get the file and header from the form
		file, header, err := req.FormFile("data")
		if err != nil {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.ErrorResponse{Error: "Missing file data"})
			return
		}
		defer file.Close()

		// Initialize the DTO
		(&fileImageUpload.Data).InitFromMultipart(header)

		imageFileData, err := fileImageUpload.Data.Bytes()
		if err != nil {
			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "Failed to read file data"})
			return
		}

		if fileImageUpload.FileName == "" {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.ErrorResponse{Error: "Missing filename"})
			return
		}

		if len(imageFileData) == 0 {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.ErrorResponse{Error: "Empty file data"})
			return
		}

		if fileImageUpload.Checksum != nil && *fileImageUpload.Checksum != "" {
			calculatedChecksum, err := images.CalculateImageChecksum(imageFileData)
			if err != nil {
				render.Status(req, http.StatusInternalServerError)
				render.JSON(res, req, dto.ErrorResponse{Error: "Failed to calculate checksum"})
				return
			}

			if *fileImageUpload.Checksum != calculatedChecksum {
				res.WriteHeader(http.StatusBadRequest)
				render.JSON(res, req, dto.ErrorResponse{Error: "Checksum mismatch"})
				return
			}
		}

		libvipsImg, err := libvips.NewImageFromBuffer(imageFileData, libvips.DefaultLoadOptions())
		if err != nil {
			// Fallback: Try explicit RAW load via dcraw if generic load fails
			libvipsImg, err = libvips.NewDcrawloadBuffer(imageFileData, &libvips.DcrawloadBufferOptions{})
			if err != nil {
				render.Status(req, http.StatusBadRequest)
				render.JSON(res, req, dto.ErrorResponse{Error: "Invalid image data"})
				return
			}
		}
		defer libvipsImg.Close()

		imageEntity, err := createNewImageEntity(logger, fileImageUpload.FileName, libvipsImg, imageFileData)
		if err != nil {
			logger.Error("Failed to process image data", slog.Any("error", err))
			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "Failed to process image data"})
			return
		}

		authUser, _ := libhttp.UserFromContext(req)
		imageEntity.UploadedByID = &authUser.Uid
		imageEntity.OwnerID = &authUser.Uid

		var checksum string
		if fileImageUpload.Checksum != nil && *fileImageUpload.Checksum != "" {
			checksum = *fileImageUpload.Checksum
		} else {
			checksum, err = images.CalculateImageChecksum(imageFileData)
			if err != nil {
				logger.Error("Failed to create image", slog.Any("error", err))
				render.Status(req, http.StatusInternalServerError)
				render.JSON(res, req, dto.ErrorResponse{Error: "Failed to create image"})
				return
			}
		}

		fileSize := int64(len(imageFileData))
		imageEntity.ImageMetadata.FileSize = &fileSize
		imageEntity.ImageMetadata.Checksum = checksum

		var existing entities.ImageAsset
		dupErr := db.Where("image_metadata->>'checksum' = ?", checksum).First(&existing).Error
		if dupErr == nil {
			render.Status(req, http.StatusOK)
			render.JSON(res, req, dto.ImageUploadResponse{
				Uid:    existing.Uid,
				Status: dto.ImageUploadStatusDuplicate,
			})
			return
		} else if dupErr != gorm.ErrRecordNotFound {
			logger.Error("Failed to check for duplicates", slog.Any("error", dupErr))
			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "Failed to check for duplicates"})
			return
		}

		logger.Info("adding images to database", slog.String("uid", imageEntity.Uid))
		dbCreateTx := db.Create(&imageEntity)
		if dbCreateTx.Error != nil {
			logger.Error("Failed to create image", slog.Any("error", dbCreateTx.Error))
			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "Failed to create image"})
			return
		}

		logger.Info("starting image processing", slog.String("uid", imageEntity.Uid))
		workerJob := &workers.ImageProcessJob{
			Image: *imageEntity,
		}

		err = images.SaveImage(imageFileData, imageEntity.Uid, imageEntity.ImageMetadata.FileName)
		if err != nil {
			logger.Error("Failed to save image", slog.Any("error", err))
			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "Failed to save image"})
			return
		}

		jobUid, err := jobs.Enqueue(db, workers.TopicImageProcess, workerJob, nil, &imageEntity.Uid)
		if err != nil {
			logger.Error("Failed to create image", slog.Any("error", err))
			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "Failed to create image"})
			return
		}

		logger.Info("upload images success", slog.String("id", imageEntity.Uid))

		render.Status(req, http.StatusCreated)
		render.JSON(res, req, dto.ImageUploadResponse{
			Uid:    imageEntity.Uid,
			Status: dto.ImageUploadStatusUploaded,
			Metadata: &map[string]interface{}{
				"job_uid":   jobUid,
				"file_name": fileImageUpload.FileName,
				"duplicate": false,
			},
		})
	})

	// TODO: either this should be a config option or removed entirely.
	// it's possible that URL uploads could be a security problem.
	// cool idea in theory i guess tho
	router.Post("/url", func(res http.ResponseWriter, req *http.Request) {
		if os.Getenv("ENABLE_URL_UPLOAD") != "true" {
			render.Status(req, http.StatusForbidden)
			render.JSON(res, req, dto.ErrorResponse{Error: "URL uploads are disabled"})
			return
		}

		imageUrlBytes, err := io.ReadAll(req.Body)

		if err != nil {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.ErrorResponse{Error: "Invalid request body"})
			return
		}

		imageUrl := string(imageUrlBytes)

		// Any failed files should be added to a failed files array/slice
		// and returned to the user after all files have been uploaded
		// at this point in the process, if something has gone so
		// catastrophically wrong to crash the server or whatever, then
		// return a 5XX error but this shouldn't happen

		// Download image first:
		logger.Info("Downloading image", slog.String("url", imageUrl))
		fileBytes, err := libhttp.DownloadFile(imageUrl)

		if err != nil {
			logger.Error("Failed to download file", slog.Any("error", err), slog.String("url", imageUrl))
			return
		}

		urlParsed, err := url.Parse(imageUrl)

		if err != nil {
			logger.Error("Failed to parse url", slog.Any("error", err), slog.String("url", imageUrl))
			return
		}

		fileName, _ := strings.CutPrefix(urlParsed.Path, "/")
		libvipsImg, err := libvips.NewImageFromBuffer(fileBytes, libvips.DefaultLoadOptions())
		if err != nil {
			// Fallback: Try explicit RAW load via dcraw if generic load fails
			libvipsImg, err = libvips.NewDcrawloadBuffer(fileBytes, &libvips.DcrawloadBufferOptions{})
			if err != nil {
				render.Status(req, http.StatusBadRequest)
				render.JSON(res, req, dto.ErrorResponse{Error: "Invalid request body"})
				return
			}
		}
		defer libvipsImg.Close()
		imageEntity, err := createNewImageEntity(logger, fileName, libvipsImg, fileBytes)

		if err != nil {
			logger.Error("Failed to process image data", slog.Any("error", err))
			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "Failed to process image data"})
			return
		}

		// Set the uploader
		authUser, _ := libhttp.UserFromContext(req)
		imageEntity.UploadedByID = &authUser.Uid
		imageEntity.OwnerID = &authUser.Uid

		hasher := sha1.New()
		if _, err := io.Copy(hasher, bytes.NewReader(fileBytes)); err != nil {
			logger.Error("Failed to create image", slog.Any("error", err))
			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "Failed to create image"})
			return
		}

		fileSize := int64(len(fileBytes))
		imageEntity.ImageMetadata.FileSize = &fileSize
		checksum := hex.EncodeToString(hasher.Sum(nil))
		imageEntity.ImageMetadata.Checksum = checksum

		var existing entities.ImageAsset
		dupErr := db.Where("image_metadata->>'checksum' = ?", checksum).First(&existing).Error
		if dupErr == nil {
			// Duplicate: return existing UID as an ImageUploadResponse (200)
			render.Status(req, http.StatusOK)
			render.JSON(res, req, dto.ImageUploadResponse{
				Uid:    existing.Uid,
				Status: dto.ImageUploadStatusDuplicate,
			})
			return
		} else if dupErr != gorm.ErrRecordNotFound {
			logger.Error("Failed to check for duplicates", slog.Any("error", dupErr))
			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "Failed to check for duplicates"})
			return
		}

		logger.Info("adding image to database", slog.String("id", imageEntity.Uid))
		dbCreateTx := db.Create(&imageEntity)

		if dbCreateTx.Error != nil {
			logger.Error("Failed to create image", slog.Any("error", dbCreateTx.Error))
			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "Failed to create image"})
			return
		}

		logger.Info("starting image processing", slog.String("id", imageEntity.Uid))
		workerJob := &workers.ImageProcessJob{
			Image: *imageEntity,
		}

		err = images.SaveImage(fileBytes, imageEntity.Uid, imageEntity.ImageMetadata.FileName)
		if err != nil {
			logger.Error("Failed to process image", slog.Any("error", err))
			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "Failed to process image"})
			return
		}

		_, err = jobs.Enqueue(db, workers.TopicImageProcess, workerJob, nil, &imageEntity.Uid)
		if err != nil {
			logger.Error("Failed to process image", slog.Any("error", err))
			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "Failed to process image"})
			return
		}

		logger.Info("upload images success", slog.String("id", imageEntity.Uid))

		render.Status(req, http.StatusCreated)
		render.JSON(res, req, dto.ImageUploadResponse{
			Uid:    imageEntity.Uid,
			Status: dto.ImageUploadStatusUploaded,
		})
	})

	router.Delete("/", func(res http.ResponseWriter, req *http.Request) {
		var body struct {
			Uids  []string `json:"uids"`
			Force bool     `json:"force,omitempty"`
		}

		if err := render.DecodeJSON(req.Body, &body); err != nil {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.DeleteAssetsResponse{Results: nil})
			return
		}

		if len(body.Uids) == 0 {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.ErrorResponse{Error: "no UIDs provided"})
			return
		}

		libDir := images.Directory
		trashDir := images.TrashDirectory

		if !body.Force {
			if err := os.MkdirAll(trashDir, 0755); err != nil {
				render.Status(req, http.StatusInternalServerError)
				render.JSON(res, req, dto.DeleteAssetsResponse{Results: nil})
				return
			}
		}

		resultsArr := make([]dto.DeleteAssetResult, 0, len(body.Uids))
		var anyFailed bool

		// Get authenticated user (cookie) and admin status (cookie or API key)
		authUser, ok := libhttp.UserFromContext(req)
		isAdmin := libhttp.IsAdminFromRequest(req)
		if !ok && !isAdmin {
			render.Status(req, http.StatusUnauthorized)
			render.JSON(res, req, dto.ErrorResponse{Error: "Unauthorized"})
			return
		}

		for _, id := range body.Uids {
			src := filepath.Join(libDir, id)
			var deleted bool
			var errMsg *string

			// Check ownership before deleting
			var img entities.ImageAsset
			query := db.Select("owner_id")
			query = dbops.ApplyImageAccessControlFilter(query, req)
			if err := query.First(&img, "uid = ?", id).Error; err != nil {
				if err != gorm.ErrRecordNotFound {
					logger.Error("failed to check ownership", slog.String("uid", id), slog.Any("error", err))
					e := "failed to check ownership"
					errMsg = &e
				}
				// If not found, we can't delete it anyway, so let it proceed to fail naturally or skip
			} else {
				if img.OwnerID != nil && (!ok || *img.OwnerID != authUser.Uid) && !isAdmin {
					e := "permission denied"
					errMsg = &e
					deleted = false
					anyFailed = true
					resultsArr = append(resultsArr, dto.DeleteAssetResult{
						Uid:     id,
						Deleted: deleted,
						Error:   errMsg,
					})
					continue
				}
			}

			if body.Force {
				// Force delete: Remove from DB permanently and delete files
				err := db.Transaction(func(tx *gorm.DB) error {
					// Nullify collection thumbnails that use this image to avoid FK violation.
					// We use Unscoped() to ensure that even soft-deleted collections are updated,
					// otherwise a hard-delete of the image will still fail due to FK constraints
					// on those soft-deleted rows.
					if err := tx.Unscoped().Model(&entities.Collection{}).Where("thumbnail_id = ?", id).Updates(map[string]any{"thumbnail_id": nil}).Error; err != nil {
						return fmt.Errorf("failed to nullify collection thumbnails: %w", err)
					}

					// Remove from DB permanently
					if err := tx.Unscoped().Where("uid = ?", id).Delete(&entities.ImageAsset{}).Error; err != nil {
						return fmt.Errorf("failed to hard delete from DB: %w", err)
					}
					return nil
				})

				if err != nil {
					logger.Error("failed to force delete asset", slog.String("uid", id), slog.Any("error", err))
					e := err.Error()
					errMsg = &e
					deleted = false
					anyFailed = true
				} else if err := os.RemoveAll(src); err != nil {
					logger.Error("failed to force delete asset dir", slog.String("uid", id), slog.Any("error", err))
					e := err.Error()
					errMsg = &e
					deleted = false
					anyFailed = true
				} else {
					deleted = true
				}
			} else {
				// Soft delete: Set DeletedAt in DB and move files to trash
				if err := db.Where("uid = ?", id).Delete(&entities.ImageAsset{}).Error; err != nil {
					logger.Error("failed to soft delete from DB", slog.String("uid", id), slog.Any("error", err))
					e := err.Error()
					errMsg = &e
					deleted = false
					anyFailed = true
				} else {
					dst := filepath.Join(trashDir, id)
					if err := moveDirWithFallback(src, dst); err != nil {
						logger.Error("failed to move asset to trash", slog.String("uid", id), slog.Any("error", err))
						e := err.Error()
						errMsg = &e
						deleted = false
						anyFailed = true
					} else {
						deleted = true
					}
				}
			}

			resultsArr = append(resultsArr, dto.DeleteAssetResult{
				Uid:     id,
				Deleted: deleted,
				Error:   errMsg,
			})
		}

		var msg *string
		if anyFailed {
			m := fmt.Sprintf("failed to delete/move ids: %s", func() string {
				var failed []string
				for _, r := range resultsArr {
					if !r.Deleted {
						failed = append(failed, r.Uid)
					}
				}
				return strings.Join(failed, ",")
			}())
			msg = &m
		}

		resp := dto.DeleteAssetsResponse{
			Results: &resultsArr,
			Message: msg,
		}

		if anyFailed {
			render.Status(req, http.StatusMultiStatus)
		} else {
			render.Status(req, http.StatusOK)
		}

		render.JSON(res, req, resp)
	})

	router.Post("/duplicates", func(res http.ResponseWriter, req *http.Request) {
		var body dto.DuplicateCheckRequest
		if err := render.DecodeJSON(req.Body, &body); err != nil {
			logger.Error("Failed to decode duplicate check request", slog.Any("error", err))
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.ErrorResponse{Error: "Invalid request body"})

			return
		}

		if len(body.Checksums) == 0 {
			render.Status(req, http.StatusOK)
			render.JSON(res, req, dto.DuplicateCheckResponse{
				Duplicates: []dto.DuplicateCheckResult{},
			})

			return
		}

		var results []dto.DuplicateCheckResult

		query := db.Model(&entities.ImageAsset{})
		query = dbops.ApplyImageAccessControlFilter(query, req)
		err := query.
			Select("uid, image_metadata->>'checksum' as checksum").
			Where("image_metadata->>'checksum' IN ?", body.Checksums).
			Find(&results).Error

		if err != nil {
			logger.Error("Failed to query duplicates", slog.Any("error", err))
			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "Failed to query duplicates"})
			return
		}

		if results == nil {
			results = []dto.DuplicateCheckResult{}
		}

		render.Status(req, http.StatusOK)
		render.JSON(res, req, dto.DuplicateCheckResponse{
			Duplicates: results,
		})
	})

	return router
}

func serveOriginalImage(res http.ResponseWriter, req *http.Request, logger *slog.Logger, imgEnt *entities.ImageAsset, isDownload bool) {
	imageData, err := images.ReadImage(imgEnt.Uid, imgEnt.ImageMetadata.FileName)
	if err != nil {
		logger.Error("failed to read original image", slog.Any("error", err))
		render.Status(req, http.StatusInternalServerError)
		render.JSON(res, req, dto.ErrorResponse{Error: "Failed to read original image"})
		return
	}

	res.Header().Set("Etag", fmt.Sprintf(`"%s"`, imgEnt.ImageMetadata.Checksum))
	res.Header().Set("Last-Modified", imgEnt.UpdatedAt.UTC().Format(http.TimeFormat))
	// Prevent XSS if the image is an SVG or other dangerous type
	res.Header().Set("Content-Security-Policy", "sandbox")

	if isDownload {
		res.Header().Set("Cache-Control", "private, no-cache, no-store, must-revalidate")
		res.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, imgEnt.ImageMetadata.FileName))
	} else {
		res.Header().Set("Cache-Control", fmt.Sprintf("public, max-age=%d, immutable", config.AppConfig.Cache.Images.HTTPPermanentMaxAgeSeconds))
	}

	http.ServeContent(res, req, imgEnt.ImageMetadata.FileName, imgEnt.UpdatedAt, bytes.NewReader(imageData))
}

func serveTransformedImage(res http.ResponseWriter, req *http.Request, logger *slog.Logger, imgEnt *entities.ImageAsset, params *transform.TransformParams, isDownload bool) {
	// 1. Determine if this is a "permanent" transform path
	reqURI := req.URL.String()
	isPermanent := imgEnt.ImagePaths.Thumbnail == reqURI || imgEnt.ImagePaths.Preview == reqURI

	// Check if a 'v' (version/checksum) query parameter is present
	hasVersionParam := req.URL.Query().Get("v") != ""

	// 2. Generate ETag for the transform
	transformETag := *transform.CreateTransformEtag(*imgEnt, params)

	// 3. Check client-side cache first
	if match := req.Header.Get("If-None-Match"); match != "" {
		// Strip quotes from the If-None-Match header value for comparison
		match = strings.Trim(match, `"`)
		if match == transformETag {
			logger.Debug("client-side cache hit (If-None-Match)", slog.String("etag", transformETag))
			res.WriteHeader(http.StatusNotModified)
			return
		}
	}

	if modifiedSince := req.Header.Get("If-Modified-Since"); modifiedSince != "" {
		if t, err := http.ParseTime(modifiedSince); err == nil {
			if !imgEnt.UpdatedAt.After(t) {
				logger.Debug("client-side cache hit (If-Modified-Since)", slog.Time("last-modified", imgEnt.UpdatedAt))
				res.WriteHeader(http.StatusNotModified)
				return
			}
		}
	}

	ext := params.Format
	if ext == "" {
		ext = imgEnt.ImageMetadata.FileType
	}

	res.Header().Set("Content-Type", images.ImageContentType(ext))

	// 4. Check our server-side cache
	cacheKey := strings.Trim(transformETag, `"`)
	cachedData, err := images.ReadCachedTransform(imgEnt.Uid, cacheKey, ext)

	if err == nil {
		// Cache HIT: Serve the cached file
		images.IncrementCacheHits()
		logger.Debug("server-side cache hit", slog.String("key", cacheKey))
		res.Header().Set("Etag", transformETag)
		res.Header().Set("Last-Modified", imgEnt.UpdatedAt.UTC().Format(http.TimeFormat))
		// Prevent XSS if the image is an SVG or other dangerous type
		res.Header().Set("Content-Security-Policy", "sandbox")

		if isDownload {
			res.Header().Set("Cache-Control", "private, no-cache, no-store, must-revalidate")
			res.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, imgEnt.ImageMetadata.FileName))
		} else if isPermanent || hasVersionParam {
			// If it's a permanent path or has a version parameter, it's immutable
			res.Header().Set("Cache-Control", fmt.Sprintf("public, max-age=%d, immutable", config.AppConfig.Cache.Images.HTTPPermanentMaxAgeSeconds))
		} else {
			// Otherwise, use a shorter cache time
			res.Header().Set("Cache-Control", fmt.Sprintf("public, max-age=%d", config.AppConfig.Cache.Images.HTTPMaxAgeSeconds))
		}

		res.Header().Set("Content-Length", strconv.Itoa(len(cachedData)))
		res.WriteHeader(http.StatusOK)
		res.Write(cachedData)
		return
	}

	// 5a. If permanent path and not in cache, it's still processing.
	if isPermanent {
		logger.Info("permanent transform not ready, telling client to retry", slog.String("path", reqURI), slog.String("uid", imgEnt.Uid))
		res.Header().Set("Retry-After", "10") // Tell client to retry after 10 seconds
		res.WriteHeader(http.StatusAccepted)
		return
	}

	// 5b. If not permanent, generate on-the-fly
	logger.Info("server-side cache miss, generating on-demand transform", slog.String("key", cacheKey))
	images.IncrementCacheMisses()
	originalData, err := images.ReadImage(imgEnt.Uid, imgEnt.ImageMetadata.FileName)
	if err != nil {
		logger.Error("failed to read original for transform", slog.Any("error", err))
		render.Status(req, http.StatusInternalServerError)
		render.JSON(res, req, dto.ErrorResponse{Error: "Failed to read original for transform"})
		return
	}

	tresult, err := imageops.GenerateTransform(params, *imgEnt, originalData)
	if err != nil {
		logger.Error("failed to generate transform", slog.Any("error", err))
		render.Status(req, http.StatusInternalServerError)
		render.JSON(res, req, dto.ErrorResponse{Error: "Failed to generate transform"})
		return
	}

	if tresult.Ext != ext {
		logger.Warn("image format changed during transform",
			slog.String("uid", imgEnt.Uid),
			slog.String("requested_format", ext),
			slog.String("output_format", tresult.Ext),
		)
	}

	// Reflect actual generated extension in Content-Type header (e.g. image/jpeg if fallback occurred)
	res.Header().Set("Content-Type", images.ImageContentType(tresult.Ext))

	// Write to cache in the background
	go func() {
		if err := images.WriteCachedTransform(imgEnt.Uid, cacheKey, tresult.Ext, tresult.ImageData); err != nil {
			logger.Warn("failed to write on-demand transform to cache", slog.Any("error", err))
		}
	}()

	// Serve the newly generated image
	res.Header().Set("Etag", transformETag)
	res.Header().Set("Last-Modified", imgEnt.UpdatedAt.UTC().Format(http.TimeFormat))
	// Prevent XSS if the image is an SVG or other dangerous type
	res.Header().Set("Content-Security-Policy", "sandbox")

	if isDownload {
		res.Header().Set("Cache-Control", "private, no-cache, no-store, must-revalidate")
		res.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, imgEnt.ImageMetadata.FileName))
	} else if isPermanent || hasVersionParam {
		res.Header().Set("Cache-Control", fmt.Sprintf("public, max-age=%d, immutable", config.AppConfig.Cache.Images.HTTPPermanentMaxAgeSeconds))
	} else {
		res.Header().Set("Cache-Control", fmt.Sprintf("public, max-age=%d", config.AppConfig.Cache.Images.HTTPMaxAgeSeconds))
	}

	res.Header().Set("Content-Length", strconv.Itoa(len(tresult.ImageData)))
	res.WriteHeader(http.StatusOK)
	res.Write(tresult.ImageData)
}

func validateDownloadRequest(res http.ResponseWriter, req *http.Request, db *gorm.DB, uid string) bool {
	token := req.URL.Query().Get("token")
	password := req.URL.Query().Get("password")

	if token == "" {
		render.Status(req, http.StatusBadRequest)
		render.JSON(res, req, dto.ErrorResponse{Error: "Missing token query param"})
		return false
	}

	uids, tokenEntity, ok := downloads.ValidateTokenWithPassword(db, token, password)
	if !ok {
		if tokenEntity != nil && tokenEntity.Password != nil {
			render.Status(req, http.StatusUnauthorized)
			render.JSON(res, req, dto.ErrorResponse{Error: "Invalid or missing password"})
			return false
		}
		render.Status(req, http.StatusUnauthorized)
		render.JSON(res, req, dto.ErrorResponse{Error: "Invalid or expired token"})
		return false
	}

	if !tokenEntity.AllowDownload {
		render.Status(req, http.StatusForbidden)
		render.JSON(res, req, dto.ErrorResponse{Error: "Downloads not permitted for this token"})
		return false
	}

	if !downloads.ValidateEmbedAccess(tokenEntity, req) {
		render.Status(req, http.StatusForbidden)
		render.JSON(res, req, dto.ErrorResponse{Error: "Embedding not allowed for this token"})
		return false
	}

	if !slices.Contains(uids, uid) {
		render.Status(req, http.StatusUnauthorized)
		render.JSON(res, req, dto.ErrorResponse{Error: "Token not valid for this resource"})
		return false
	}

	return true
}

// updateImageFromDTO updates image entity fields from a small ImageUpdate
func updateImageFromDTO(image *entities.ImageAsset, update dto.ImageUpdate) {
	if update.Name != nil {
		image.Name = *update.Name
	}

	if update.Description != nil {
		image.Description = update.Description
	}

	if update.Private != nil {
		image.Private = *update.Private
	}

	if update.Favourited != nil {
		image.Favourited = update.Favourited
	}

	if update.Exif != nil {
		image.Exif = update.Exif
	}

	if update.ImageMetadata != nil {
		if image.ImageMetadata == nil {
			image.ImageMetadata = &dto.ImageMetadata{}
		}

		if update.ImageMetadata.Rating != nil {
			// Clamp rating 0..5
			// Treat 0 as "unrated" -> nil
			r := *update.ImageMetadata.Rating
			if r == 0 {
				image.ImageMetadata.Rating = nil
			} else {
				if r < 0 {
					r = 0
				} else if r > 5 {
					r = 5
				}
				image.ImageMetadata.Rating = &r
			}
		}

		if update.ImageMetadata.Label != nil {
			image.ImageMetadata.Label = update.ImageMetadata.Label
		} else {
			// Explicitly set to nil if the label is being cleared
			image.ImageMetadata.Label = nil
		}

		if update.ImageMetadata.Keywords != nil {
			image.ImageMetadata.Keywords = update.ImageMetadata.Keywords
		}
	}

	if update.OwnerUid != nil {
		image.OwnerID = update.OwnerUid
	}

	if update.TakenAt != nil {
		image.TakenAt = update.TakenAt
	}
}
