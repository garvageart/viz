package routes

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/render"
	"gorm.io/gorm"

	"viz/internal/db/queries"
	"viz/internal/dto"
	"viz/internal/entities"
	libhttp "viz/internal/http"
	"viz/internal/uid"
)

// KeywordsRouter manages keyword routes.
func KeywordsRouter(db *gorm.DB, logger *slog.Logger) *chi.Mux {
	r := chi.NewRouter()

	r.Post("/", func(res http.ResponseWriter, req *http.Request) {
		var body dto.KeywordCreate
		if err := render.DecodeJSON(req.Body, &body); err != nil {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.ErrorResponse{Error: "Invalid request payload"})
			return
		}

		name := strings.TrimSpace(body.Name)
		if name == "" {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.ErrorResponse{Error: "Keyword name is required"})
			return
		}

		if body.Parent != nil && *body.Parent != "" {
			var parent entities.Keyword
			if err := db.WithContext(req.Context()).Where("uid = ?", *body.Parent).First(&parent).Error; err != nil {
				render.Status(req, http.StatusBadRequest)
				render.JSON(res, req, dto.ErrorResponse{Error: "Parent keyword not found"})
				return
			}
		}

		keywordUid := uid.MustGenerate()
		keyword := entities.Keyword{
			Uid:    keywordUid,
			Name:   name,
			Colour: body.Colour,
			Parent: body.Parent,
		}

		if err := db.WithContext(req.Context()).Create(&keyword).Error; err != nil {
			libhttp.ServerError(res, req, err, logger, nil, "failed to create keyword", "Failed to create keyword")
			return
		}

		render.Status(req, http.StatusCreated)
		render.JSON(res, req, keyword.DTO())
	})

	r.Get("/", func(res http.ResponseWriter, req *http.Request) {
		var keywords []entities.Keyword
		if err := db.WithContext(req.Context()).Order("name ASC").Find(&keywords).Error; err != nil {
			libhttp.ServerError(res, req, err, logger, nil, "failed to list keywords", "Failed to fetch keywords")
			return
		}

		items := make([]dto.Keyword, len(keywords))
		for i, kw := range keywords {
			items[i] = kw.DTO()
		}

		render.Status(req, http.StatusOK)
		render.JSON(res, req, dto.KeywordListResponse{
			Keywords: items,
		})
	})

	r.Post("/asset", func(res http.ResponseWriter, req *http.Request) {
		var body dto.KeywordAssetRequest
		if err := render.DecodeJSON(req.Body, &body); err != nil {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.ErrorResponse{Error: "Invalid request payload"})
			return
		}

		if len(body.KeywordUids) == 0 || len(body.AssetUids) == 0 {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.ErrorResponse{Error: "keyword_uids and asset_uids must not be empty"})
			return
		}

		var keywords []entities.Keyword
		if err := db.WithContext(req.Context()).Where("uid IN ?", body.KeywordUids).Find(&keywords).Error; err != nil || len(keywords) == 0 {
			render.Status(req, http.StatusNotFound)
			render.JSON(res, req, dto.ErrorResponse{Error: "Keyword not found"})
			return
		}

		var assets []entities.ImageAsset
		if err := db.WithContext(req.Context()).Where("uid IN ?", body.AssetUids).Find(&assets).Error; err != nil || len(assets) == 0 {
			render.Status(req, http.StatusNotFound)
			render.JSON(res, req, dto.ErrorResponse{Error: "Asset not found"})
			return
		}

		for _, asset := range assets {
			if err := db.WithContext(req.Context()).Model(&asset).Association("Keywords").Append(&keywords); err != nil {
				logger.Error("failed to associate keywords with asset", slog.Any("error", err), slog.String("asset_uid", asset.Uid))
			}
		}

		render.Status(req, http.StatusOK)
		render.JSON(res, req, dto.KeywordAssetResponse{
			KeywordUid: body.KeywordUids[0],
			AssetUid:   body.AssetUids[0],
			CreatedAt:  time.Now(),
		})
	})

	r.Delete("/asset", func(res http.ResponseWriter, req *http.Request) {
		var body dto.KeywordAssetRequest
		if err := render.DecodeJSON(req.Body, &body); err != nil {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.ErrorResponse{Error: "Invalid request payload"})
			return
		}

		if len(body.KeywordUids) == 0 || len(body.AssetUids) == 0 {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.ErrorResponse{Error: "keyword_uids and asset_uids must not be empty"})
			return
		}

		var keywords []entities.Keyword
		if err := db.WithContext(req.Context()).Where("uid IN ?", body.KeywordUids).Find(&keywords).Error; err != nil || len(keywords) == 0 {
			render.Status(req, http.StatusNotFound)
			render.JSON(res, req, dto.ErrorResponse{Error: "Keyword not found"})
			return
		}

		var assets []entities.ImageAsset
		if err := db.WithContext(req.Context()).Where("uid IN ?", body.AssetUids).Find(&assets).Error; err != nil || len(assets) == 0 {
			render.Status(req, http.StatusNotFound)
			render.JSON(res, req, dto.ErrorResponse{Error: "Asset not found"})
			return
		}

		if err := db.WithContext(req.Context()).Transaction(func(tx *gorm.DB) error {
			for _, asset := range assets {
				if err := tx.Model(&asset).Association("Keywords").Delete(&keywords); err != nil {
					return err
				}
			}
			return nil
		}); err != nil {
			libhttp.ServerError(res, req, err, logger, nil, "failed to remove keywords from assets", "Failed to remove keywords from assets")
			return
		}

		render.Status(req, http.StatusNoContent)
		res.WriteHeader(http.StatusNoContent)
	})

	r.Get("/{uid}/assets", func(res http.ResponseWriter, req *http.Request) {
		keywordUID := chi.URLParam(req, "uid")
		if keywordUID == "" {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.ErrorResponse{Error: "Keyword UID is required"})
			return
		}

		var keyword entities.Keyword
		if err := db.WithContext(req.Context()).Where("uid = ?", keywordUID).First(&keyword).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				render.Status(req, http.StatusNotFound)
				render.JSON(res, req, dto.ErrorResponse{Error: "Keyword not found"})
				return
			}

			libhttp.ServerError(res, req, err, logger, nil, "failed to find keyword", "Failed to fetch keyword")
			return
		}

		var images []entities.ImageAsset
		query := db.WithContext(req.Context()).
			Model(&entities.ImageAsset{}).
			Joins("JOIN image_keywords ON image_keywords.image_asset_id = images.id").
			Where("image_keywords.keyword_id = ?", keyword.ID).
			Where("images.deleted_at IS NULL").
			Preload("Owner").
			Preload("UploadedBy").
			Preload("Keywords", func(db *gorm.DB) *gorm.DB {
				return db.Order("LOWER(keywords.name) ASC")
			}).
			Order("images.taken_at DESC NULLS LAST, images.name ASC")

		query = queries.ApplyImageAccessControlFilter(query, req)

		if err := query.Find(&images).Error; err != nil {
			libhttp.ServerError(res, req, err, logger, nil, "failed to list assets for keyword", "Failed to fetch assets for keyword")
			return
		}

		items := make([]dto.ImagesResponse, len(images))
		for i, img := range images {
			items[i] = dto.ImagesResponse{
				AddedAt: img.CreatedAt,
				Image:   img.DTO(),
			}
		}

		render.Status(req, http.StatusOK)
		render.JSON(res, req, dto.ImagesListResponse{
			Limit: len(items),
			Page:  0,
			Count: len(items),
			Items: items,
		})
	})

	r.Route("/{uid}", func(r chi.Router) {
		r.Get("/", func(res http.ResponseWriter, req *http.Request) {
			keywordUID := chi.URLParam(req, "uid")
			if keywordUID == "" {
				render.Status(req, http.StatusBadRequest)
				render.JSON(res, req, dto.ErrorResponse{Error: "Keyword UID is required"})
				return
			}

			var keyword entities.Keyword
			if err := db.WithContext(req.Context()).Where("uid = ?", keywordUID).First(&keyword).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					render.Status(req, http.StatusNotFound)
					render.JSON(res, req, dto.ErrorResponse{Error: "Keyword not found"})
					return
				}

				libhttp.ServerError(res, req, err, logger, nil, "failed to get keyword", "Failed to get keyword")
				return
			}

			render.Status(req, http.StatusOK)
			render.JSON(res, req, keyword.DTO())
		})

		r.Put("/", func(res http.ResponseWriter, req *http.Request) {
			keywordUID := chi.URLParam(req, "uid")
			if keywordUID == "" {
				render.Status(req, http.StatusBadRequest)
				render.JSON(res, req, dto.ErrorResponse{Error: "Keyword UID is required"})
				return
			}

			var body dto.KeywordUpdate
			if err := render.DecodeJSON(req.Body, &body); err != nil {
				render.Status(req, http.StatusBadRequest)
				render.JSON(res, req, dto.ErrorResponse{Error: "Invalid request payload"})
				return
			}

			name := strings.TrimSpace(body.Name)
			if name == "" {
				render.Status(req, http.StatusBadRequest)
				render.JSON(res, req, dto.ErrorResponse{Error: "Keyword name is required"})
				return
			}

			var keyword entities.Keyword
			if err := db.WithContext(req.Context()).Where("uid = ?", keywordUID).First(&keyword).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					render.Status(req, http.StatusNotFound)
					render.JSON(res, req, dto.ErrorResponse{Error: "Keyword not found"})
					return
				}

				libhttp.ServerError(res, req, err, logger, nil, "failed to find keyword for update", "Failed to update keyword")
				return
			}

			if body.Parent != nil && *body.Parent != "" {
				if *body.Parent == keywordUID {
					render.Status(req, http.StatusBadRequest)
					render.JSON(res, req, dto.ErrorResponse{Error: "Keyword cannot be its own parent"})
					return
				}

				var parent entities.Keyword
				if err := db.WithContext(req.Context()).Where("uid = ?", *body.Parent).First(&parent).Error; err != nil {
					render.Status(req, http.StatusBadRequest)
					render.JSON(res, req, dto.ErrorResponse{Error: "Parent keyword not found"})
					return
				}
			}

			keyword.Name = name
			keyword.Colour = body.Colour
			keyword.Parent = body.Parent

			if err := db.WithContext(req.Context()).Save(&keyword).Error; err != nil {
				libhttp.ServerError(res, req, err, logger, nil, "failed to update keyword", "Failed to update keyword")
				return
			}

			render.Status(req, http.StatusOK)
			render.JSON(res, req, keyword.DTO())
		})

		r.Delete("/", func(res http.ResponseWriter, req *http.Request) {
			keywordUID := chi.URLParam(req, "uid")
			if keywordUID == "" {
				render.Status(req, http.StatusBadRequest)
				render.JSON(res, req, dto.ErrorResponse{Error: "Keyword UID is required"})
				return
			}

			if err := entities.HardDeleteKeyword(db.WithContext(req.Context()), keywordUID); err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					render.Status(req, http.StatusNotFound)
					render.JSON(res, req, dto.ErrorResponse{Error: "Keyword not found"})
					return
				}

				libhttp.ServerError(res, req, err, logger, nil, "failed to delete keyword", "Failed to delete keyword")
				return
			}

			render.Status(req, http.StatusNoContent)
			res.WriteHeader(http.StatusNoContent)
		})
	})

	return r
}
