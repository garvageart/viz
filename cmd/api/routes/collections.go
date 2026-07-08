package routes

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/render"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"viz/internal/dto"
	"viz/internal/entities"
	libhttp "viz/internal/http"
	"viz/internal/uid"
	"viz/internal/utils"
)

var ErrCollectionUnauthorised = errors.New("unauthorized")

// isAuthorizedToModifyCollection returns true if the given user is the owner
// of the collection or has admin/superadmin role.
func isAuthorizedToModifyCollection(user *entities.User, collection entities.Collection) bool {
	if user == nil {
		return false
	}
	if collection.OwnerID != nil && *collection.OwnerID == user.Uid {
		return true
	}
	return user.Role == dto.UserRoleAdmin || user.Role == dto.UserRoleSuperadmin
}

func findCollectionImages(db *gorm.DB, collection entities.Collection, limit, offset int, sortBy, order string) ([]dto.ImagesResponse, error) {
	var images []entities.ImageAsset

	query := db.Model(&entities.ImageAsset{}).
		Preload("Owner").
		Preload("UploadedBy").
		Joins("JOIN collection_images ON collection_images.uid = images.uid").
		Where("collection_images.collection_id = ?", collection.ID)

	allowedSortBy := []string{"taken_at", "recently_added", "updated_at", "name"}
	validSortBy := slices.Contains(allowedSortBy, sortBy)

	if !validSortBy {
		sortBy = "taken_at"
	}

	upperOrder := "DESC"
	if order == "ASC" {
		upperOrder = "ASC"
	}

	var orderClause string
	if sortBy == "taken_at" {
		orderClause = fmt.Sprintf("images.taken_at %s NULLS LAST, images.name %s", upperOrder, upperOrder)
	} else if sortBy == "recently_added" {
		orderClause = fmt.Sprintf("images.created_at %s", upperOrder)
	} else {
		orderClause = fmt.Sprintf("images.%s %s", sortBy, upperOrder)
	}

	if err := query.Order(orderClause).Limit(limit).Offset(offset).Find(&images).Error; err != nil {
		return nil, err
	}

	// We need to fetch the added_at and added_by info from the join table
	// for the DTO conversion.
	var collectionImages []entities.CollectionImage
	if err := db.Where("collection_id = ? AND uid IN ?", collection.ID, func() []string {
		uids := make([]string, len(images))
		for i, img := range images {
			uids[i] = img.Uid
		}
		return uids
	}()).Preload("AddedBy").Find(&collectionImages).Error; err != nil {
		return nil, err
	}

	meta := make(map[string]entities.CollectionImage, len(collectionImages))
	for _, ci := range collectionImages {
		meta[ci.Uid] = ci
	}

	imgResponse := make([]dto.ImagesResponse, len(images))
	for i, img := range images {
		m := meta[img.Uid]
		userDTO := func() *dto.User {
			if m.AddedBy != nil {
				d := m.AddedBy.DTO()
				return &d
			}
			return nil
		}()

		imgResponse[i] = dto.ImagesResponse{
			AddedAt: m.AddedAt,
			AddedBy: userDTO,
			Image:   img.DTO(),
		}
	}

	return imgResponse, nil
}

func CollectionsRouter(db *gorm.DB, logger *slog.Logger, wsBroker *libhttp.WSBroker) *chi.Mux {
	router := chi.NewRouter()

	router.Post("/", func(res http.ResponseWriter, req *http.Request) {
		var create struct {
			Description *string `json:"description,omitempty"`
			Name        string  `json:"name"`
			Private     *bool   `json:"private"`
		}

		err := render.DecodeJSON(req.Body, &create)
		if err != nil {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.ErrorResponse{Error: "Invalid request body"})
			return
		}

		if create.Name == "" {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.ErrorResponse{Error: "Name is required"})
			return
		}

		colUid, err := uid.Generate()
		if err != nil {
			libhttp.ServerError(res, req, err, logger, nil,
				"Failed to generate collection ID",
				"Something went wrong, please try again later",
			)
		}

		authUser, _ := libhttp.UserFromContext(req)

		// Map request -> entity for persistence
		collection := entities.Collection{
			Uid:         colUid,
			Name:        create.Name,
			Private:     create.Private,
			Description: create.Description,
			CreatedByID: &authUser.Uid,
			OwnerID:     &authUser.Uid,
		}

		err = db.Create(&collection).Error
		if err != nil {
			render.JSON(res, req, dto.ErrorResponse{Error: "Failed to create collection"})
			return
		}

		if wsBroker != nil {
			_ = wsBroker.Broadcast("collection-created", collection.DTO())
		}

		logger.Info("Created collection", slog.String("name", collection.Name))

		render.Status(req, http.StatusCreated)
		render.JSON(res, req, collection.DTO())
	})

	router.Get("/", func(res http.ResponseWriter, req *http.Request) {
		limit, err := strconv.Atoi(req.URL.Query().Get("limit"))
		if err != nil {
			limit = 50
		}

		page, err := strconv.Atoi(req.URL.Query().Get("page"))
		if err != nil {
			page = 0
		}

		sortBy := req.URL.Query().Get("sort_by")
		if sortBy == "" {
			sortBy = "updated_at"
		}
		allowedSortBy := []string{"name", "recently_added", "updated_at"}
		if !slices.Contains(allowedSortBy, sortBy) {
			sortBy = "updated_at"
		}

		orderParam := req.URL.Query().Get("order")
		order := "DESC"
		if strings.ToUpper(orderParam) == "ASC" {
			order = "ASC"
		}

		dbSortBy := sortBy
		if sortBy == "recently_added" {
			dbSortBy = "created_at"
		}

		var collections []entities.Collection
		var total int64

		if err := db.Transaction(func(tx *gorm.DB) error {
			query := tx.Model(&entities.Collection{})

			authUser, ok := libhttp.UserFromContext(req)
			if ok {
				// Show: Public OR (Private AND Owned by me)
				query = query.Where("private = ? OR (private = ? AND owner_id = ?)", false, true, authUser.Uid)
			} else {
				// Show: Only Public
				query = query.Where("private = ?", false)
			}

			// Count total collections
			if err := query.Count(&total).Error; err != nil {
				return err
			}

			// Fetch current page
			return query.Preload("Thumbnail").Preload("CreatedBy").Preload("Images").Preload("Images.AddedBy").
				Order(fmt.Sprintf("%s %s", dbSortBy, order)).
				Limit(limit).
				Offset(page * limit).
				Find(&collections).Error
		}); err != nil {
			libhttp.ServerError(res, req, err, logger, nil,
				"Failed to get collections",
				"Something went wrong, please try again later",
			)
			return
		}

		// Convert entities to DTOs for response
		items := make([]dto.Collection, len(collections))
		for i := range collections {
			items[i] = collections[i].DTO()
		}

		// Build pagination links
		href := fmt.Sprintf("/collections/?limit=%d&page=%d", limit, page)
		var prev *string
		var next *string
		hasPrev := page > 0
		hasNext := int64((page+1)*limit) < total
		if hasPrev {
			p := fmt.Sprintf("/collections/?limit=%d&page=%d", limit, page-1)
			prev = &p
		}
		if hasNext {
			nx := fmt.Sprintf("/collections/?limit=%d&page=%d", limit, page+1)
			next = &nx
		}

		count := int(total)
		result := dto.CollectionListResponse{
			Href:  &href,
			Prev:  prev,
			Next:  next,
			Limit: limit,
			Page:  page,
			Count: &count,
			Items: items,
		}

		render.Status(req, http.StatusOK)
		render.JSON(res, req, result)
	})

	router.Get("/{uid}", func(res http.ResponseWriter, req *http.Request) {
		uid := chi.URLParam(req, "uid")
		defaultImageLimit := 100
		defaultImageOffset := 0

		sortBy := req.URL.Query().Get("sort_by")
		if sortBy == "" {
			sortBy = "taken_at"
		}
		orderParam := req.URL.Query().Get("order")
		order := "DESC"
		if strings.ToUpper(orderParam) == "ASC" {
			order = "ASC"
		}

		var collection entities.Collection
		var imgResponse []dto.ImagesResponse

		err := db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Preload("Thumbnail").Preload("CreatedBy").First(&collection, "uid = ?", uid).Error; err != nil {
				return err
			}

			// Access Control: If private, only owner can view
			if collection.Private != nil && *collection.Private {
				if !libhttp.IsAdminFromRequest(req) {
					authUser, ok := libhttp.UserFromContext(req)
					// If not authenticated or not the owner/admin, return not found to avoid leaking existence
					if !ok || !isAuthorizedToModifyCollection(authUser, collection) {
						return gorm.ErrRecordNotFound
					}
				}
			}

			var err error
			imgResponse, err = findCollectionImages(tx, collection, defaultImageLimit, defaultImageOffset, sortBy, order)
			if err != nil {
				return err
			}

			return nil
		})

		if err != nil {
			if err == gorm.ErrRecordNotFound {
				render.Status(req, http.StatusNotFound)
				render.JSON(res, req, dto.ErrorResponse{Error: "Collection not found"})
				return
			}

			libhttp.ServerError(res, req, err, logger, nil,
				"",
				"Something went wrong, please try again later",
			)
			return
		}

		defaultImagePage := 0
		href := fmt.Sprintf("/collections/%s/images/?page=%d&limit=%d&sort_by=%s&order=%s", uid, defaultImagePage, defaultImageLimit, sortBy, order)

		totalImages := collection.ImageCount

		var next *string
		if totalImages > defaultImageLimit {
			nxPtr := fmt.Sprintf("/collections/%s/images/?page=%d&limit=%d&sort_by=%s&order=%s", uid, defaultImagePage+1, defaultImageLimit, sortBy, order)
			next = &nxPtr
		}

		var prev *string

		ImagesListResponse := dto.ImagesListResponse{
			Href:  &href,
			Prev:  prev,
			Next:  next,
			Limit: defaultImageLimit,
			Page:  defaultImagePage,
			Count: &totalImages,
			Items: imgResponse,
		}

		// Use the entity's DTO() method which handles Thumbnail conversion
		collectionDTO := collection.DTO()

		result := dto.CollectionDetailResponse{
			Uid:         collectionDTO.Uid,
			Name:        collectionDTO.Name,
			ImageCount:  &collectionDTO.ImageCount,
			Private:     collectionDTO.Private,
			Images:      ImagesListResponse,
			CreatedBy:   collectionDTO.CreatedBy,
			CreatedAt:   collectionDTO.CreatedAt,
			UpdatedAt:   collectionDTO.UpdatedAt,
			Description: collectionDTO.Description,
			Thumbnail:   collectionDTO.Thumbnail,
		}

		render.JSON(res, req, result)
	})

	router.Patch("/{uid}", func(res http.ResponseWriter, req *http.Request) {
		uid := chi.URLParam(req, "uid")
		var update dto.CollectionUpdate
		var collection entities.Collection

		err := render.DecodeJSON(req.Body, &update)
		if err != nil {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.ErrorResponse{Error: "Invalid request body"})
			return
		}

		err = db.Transaction(func(tx *gorm.DB) error {
			if err := tx.First(&collection, "uid = ?", uid).Error; err != nil {
				return err
			}

			if !libhttp.IsAdminFromRequest(req) {
				authUser, ok := libhttp.UserFromContext(req)
				if !ok || !isAuthorizedToModifyCollection(authUser, collection) {
					return ErrCollectionUnauthorised
				}
			}

			updateCollectionFromDTO(&collection, update)

			if err := tx.Save(&collection).Error; err != nil {
				return err
			}

			logger.Info("Updated collection", slog.String("name", collection.Name))

			// Reload to ensure updated data is sent to clients
			return tx.Preload("Thumbnail").Preload("CreatedBy").Preload("Images").Preload("Images.AddedBy").First(&collection, "uid = ?", uid).Error
		})

		if err == nil && wsBroker != nil {
			_ = wsBroker.Broadcast("collection-updated", map[string]interface{}{
				"uid":    collection.Uid,
				"action": "updated",
			})
		}

		if err != nil {
			if err == gorm.ErrRecordNotFound {
				render.Status(req, http.StatusNotFound)
				render.JSON(res, req, dto.ErrorResponse{Error: "Collection not found"})
				return
			}

			if err == ErrCollectionUnauthorised {
				render.Status(req, http.StatusForbidden)
				render.JSON(res, req, dto.ErrorResponse{Error: "You do not have permission to update this collection"})
				return
			}

			libhttp.ServerError(res, req, err, logger, nil,
				"Failed to update collection",
				"Something went wrong, please try again later",
			)
			return
		}

		render.Status(req, http.StatusOK)
		render.JSON(res, req, collection.DTO())
	})

	router.Delete("/{uid}", func(res http.ResponseWriter, req *http.Request) {
		uid := chi.URLParam(req, "uid")

		err := db.Transaction(func(tx *gorm.DB) error {
			var collection entities.Collection
			if err := tx.First(&collection, "uid = ?", uid).Error; err != nil {
				return err
			}

			authUser, ok := libhttp.UserFromContext(req)
			if !ok || !isAuthorizedToModifyCollection(authUser, collection) {
				return ErrCollectionUnauthorised
			}

			// Remove any collection image join rows first to avoid foreign key
			// conflicts or other DB-level constraints when deleting the collection.
			if err := tx.Where("collection_id = ?", collection.ID).Delete(&entities.CollectionImage{}).Error; err != nil {
				return err
			}

			if err := tx.Delete(&collection).Error; err != nil {
				return err
			}

			logger.Info("Deleted collection", slog.String("name", collection.Name))

			return nil
		})

		if err == nil && wsBroker != nil {
			_ = wsBroker.Broadcast("collection-deleted", map[string]interface{}{
				"uid": uid,
			})
		}

		if err != nil {
			if err == gorm.ErrRecordNotFound {
				render.Status(req, http.StatusNotFound)
				render.JSON(res, req, dto.ErrorResponse{Error: "Collection not found"})
				return
			}

			if err == ErrCollectionUnauthorised {
				render.Status(req, http.StatusForbidden)
				render.JSON(res, req, dto.ErrorResponse{Error: "You do not have permission to delete this collection"})
				return
			}

			libhttp.ServerError(res, req, err, logger, nil,
				"Failed to delete collection",
				"Something went wrong, please try again later",
			)
			return
		}

		res.WriteHeader(http.StatusNoContent)
	})

	router.Get("/{uid}/images/uids", func(res http.ResponseWriter, req *http.Request) {
		uid := chi.URLParam(req, "uid")

		var collection entities.Collection
		if err := db.Select("id", "uid", "private", "owner_id").First(&collection, "uid = ?", uid).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				render.Status(req, http.StatusNotFound)
				render.JSON(res, req, dto.ErrorResponse{Error: "Collection not found"})
				return
			}

			libhttp.ServerError(res, req, err, logger, nil, "Failed to fetch collection image UIDs", "")
			return
		}

		if collection.Private != nil && *collection.Private {
			if !libhttp.IsAdminFromRequest(req) {
				authUser, ok := libhttp.UserFromContext(req)
				if !ok || !isAuthorizedToModifyCollection(authUser, collection) {
					render.Status(req, http.StatusForbidden)
					render.JSON(res, req, dto.ErrorResponse{Error: "Unauthorized"})
					return
				}
			}
		}

		var uids []string
		if err := db.Model(&entities.CollectionImage{}).
			Where("collection_id = ?", collection.ID).
			Pluck("uid", &uids).Error; err != nil {
			libhttp.ServerError(res, req, err, logger, nil, "Failed to fetch collection image UIDs", "")
			return
		}

		if uids == nil {
			uids = []string{}
		}

		render.Status(req, http.StatusOK)
		render.JSON(res, req, uids)
	})

	router.Get("/{uid}/images", func(res http.ResponseWriter, req *http.Request) {
		uid := chi.URLParam(req, "uid")
		// Parse pagination params (use page/limit like the main images route)
		limitStr := req.URL.Query().Get("limit")
		limit := 100
		if limitStr != "" {
			if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
				limit = parsed
			}
		}

		pageStr := req.URL.Query().Get("page")
		page := 0
		if pageStr != "" {
			if parsed, err := strconv.Atoi(pageStr); err == nil && parsed >= 0 {
				page = parsed
			}
		}

		offset := max(page*limit, 0)

		sortBy := req.URL.Query().Get("sort_by")
		if sortBy == "" {
			sortBy = "taken_at"
		}
		orderParam := req.URL.Query().Get("order")
		order := "DESC"
		if strings.ToUpper(orderParam) == "ASC" {
			order = "ASC"
		}

		var imgResponse []dto.ImagesResponse
		var collection entities.Collection

		if err := db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Select("image_count", "private", "owner_id", "id").First(&collection, "uid = ?", uid).Error; err != nil {
				return err
			}

			// Access Control: If private, only owner can view
			if collection.Private != nil && *collection.Private {
				authUser, ok := libhttp.UserFromContext(req)
				if !ok || !isAuthorizedToModifyCollection(authUser, collection) {
					return gorm.ErrRecordNotFound
				}
			}

			var innerErr error
			imgResponse, innerErr = findCollectionImages(tx, collection, limit, offset, sortBy, order)
			if innerErr != nil {
				return innerErr
			}

			return nil
		}); err != nil {
			if err == gorm.ErrRecordNotFound {
				render.Status(req, http.StatusNotFound)
				render.JSON(res, req, dto.ErrorResponse{Error: "Collection not found"})
				return
			}

			libhttp.ServerError(res, req, err, logger, nil,
				"",
				"Something went wrong, please try again later",
			)
			return
		}

		href := fmt.Sprintf("/collections/%s/images/?page=%d&limit=%d&sort_by=%s&order=%s", uid, page, limit, sortBy, order)

		var prev *string
		if page > 0 {
			pv := fmt.Sprintf("/collections/%s/images/?page=%d&limit=%d&sort_by=%s&order=%s", uid, page-1, limit, sortBy, order)
			prev = &pv
		}

		var next *string
		totalImages := collection.ImageCount

		if (page+1)*limit < totalImages {
			nx := fmt.Sprintf("/collections/%s/images/?page=%d&limit=%d&sort_by=%s&order=%s", uid, page+1, limit, sortBy, order)
			next = &nx
		}

		// Report total images in collection as the Count metadata
		count := totalImages

		result := dto.ImagesListResponse{
			Href:  &href,
			Prev:  prev,
			Next:  next,
			Limit: limit,
			Page:  page,
			Count: &count,
			Items: imgResponse,
		}

		render.JSON(res, req, result)
	})

	router.Put("/{uid}/images", func(res http.ResponseWriter, req *http.Request) {
		uid := chi.URLParam(req, "uid")
		var colImage struct {
			UIDs []string `json:"uids"`
		}

		err := render.DecodeJSON(req.Body, &colImage)
		if err != nil {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.AddImagesResponse{Added: false, Error: utils.StringPtr("Invalid request body")})
			return
		}

		if len(colImage.UIDs) == 0 {
			render.Status(req, http.StatusOK)
			render.JSON(res, req, dto.AddImagesResponse{Added: true})
			return
		}

		err = db.Transaction(func(tx *gorm.DB) error {
			var collection entities.Collection
			if err := tx.First(&collection, "uid = ?", uid).Error; err != nil {
				return err
			}

			authUser, ok := libhttp.UserFromContext(req)
			if !ok || !isAuthorizedToModifyCollection(authUser, collection) {
				return ErrCollectionUnauthorised
			}

			// Verify all images exist in one query
			var count int64
			if err := tx.Model(&entities.ImageAsset{}).Where("uid IN ?", colImage.UIDs).Count(&count).Error; err != nil {
				return err
			}

			if count != int64(len(colImage.UIDs)) {
				return gorm.ErrRecordNotFound
			}

			now := time.Now()

			// Prepare bulk insert for join table
			newColImages := make([]entities.CollectionImage, len(colImage.UIDs))
			for i, imgUID := range colImage.UIDs {
				newColImages[i] = entities.CollectionImage{
					CollectionID: &collection.ID,
					Uid:          imgUID,
					AddedAt:      now,
					AddedByID:    &authUser.Uid,
				}
			}

			// Bulk insert - ignore conflicts (already in collection)
			if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&newColImages).Error; err != nil {
				return err
			}

			// Update image count and timestamp
			var totalCount int64
			if err := tx.Model(&entities.CollectionImage{}).Where("collection_id = ?", collection.ID).Count(&totalCount).Error; err != nil {
				return err
			}

			collection.ImageCount = int(totalCount)
			collection.UpdatedAt = now

			selectFields := []string{"ImageCount", "UpdatedAt"}
			if collection.ThumbnailID == nil || *collection.ThumbnailID == "" {
				firstImgUID := colImage.UIDs[0]
				collection.ThumbnailID = &firstImgUID
				selectFields = append(selectFields, "ThumbnailID")
			}

			if err := tx.Model(&collection).Select(selectFields).Updates(&collection).Error; err != nil {
				return err
			}

			if wsBroker != nil {
				_ = wsBroker.Broadcast("collection-updated", map[string]interface{}{
					"uid":    collection.Uid,
					"action": "images-added",
					"count":  len(colImage.UIDs),
				})
			}

			return nil
		})

		if err != nil {
			if err == gorm.ErrRecordNotFound {
				render.Status(req, http.StatusNotFound)
				render.JSON(res, req, dto.AddImagesResponse{Added: false, Error: utils.StringPtr("Collection or image not found")})
				return
			}

			if err == ErrCollectionUnauthorised {
				render.Status(req, http.StatusForbidden)
				render.JSON(res, req, dto.AddImagesResponse{Added: false, Error: utils.StringPtr("Unauthorized")})
				return
			}

			libhttp.ServerError(res, req, err, logger, nil,
				"",
				"Something went wrong, please try again later",
			)
			return
		}

		render.Status(req, http.StatusOK)
		render.JSON(res, req, dto.AddImagesResponse{Added: true})
	})

	router.Delete("/{uid}/images", func(res http.ResponseWriter, req *http.Request) {
		uid := chi.URLParam(req, "uid")
		var body struct {
			UIDs       []string `json:"uids"`
			All        bool     `json:"all"`
			Exclusions []string `json:"exclusions"`
		}

		if err := render.DecodeJSON(req.Body, &body); err != nil {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.AddImagesResponse{Added: false, Error: utils.StringPtr("invalid request body")})
			return
		}

		err := db.Transaction(func(tx *gorm.DB) error {
			var collection entities.Collection
			if err := tx.First(&collection, "uid = ?", uid).Error; err != nil {
				return err
			}

			authUser, ok := libhttp.UserFromContext(req)
			if !ok || !isAuthorizedToModifyCollection(authUser, collection) {
				return ErrCollectionUnauthorised
			}

			query := tx.Model(&entities.CollectionImage{}).Where("collection_id = ?", collection.ID)

			if body.All {
				if len(body.Exclusions) > 0 {
					query = query.Where("uid NOT IN ?", body.Exclusions)
				}
			} else {
				if len(body.UIDs) > 0 {
					query = query.Where("uid IN ?", body.UIDs)
				} else {
					return nil // Nothing to do
				}
			}

			if err := query.Delete(&entities.CollectionImage{}).Error; err != nil {
				return err
			}

			// Update image count and timestamp
			var totalCount int64
			if err := tx.Model(&entities.CollectionImage{}).Where("collection_id = ?", collection.ID).Count(&totalCount).Error; err != nil {
				return err
			}

			collection.ImageCount = int(totalCount)
			collection.UpdatedAt = time.Now()

			selectFields := []string{"ImageCount", "UpdatedAt"}
			if collection.ThumbnailID != nil && *collection.ThumbnailID != "" {
				var count int64
				if err := tx.Model(&entities.CollectionImage{}).
					Where("collection_id = ? AND uid = ?", collection.ID, *collection.ThumbnailID).
					Count(&count).Error; err != nil {
					return err
				}
				if count == 0 {
					var remaining []entities.CollectionImage
					if err := tx.Where("collection_id = ?", collection.ID).
						Order("added_at ASC, id ASC").
						Limit(1).
						Find(&remaining).Error; err != nil {
						return err
					}

					if len(remaining) > 0 {
						collection.ThumbnailID = &remaining[0].Uid
					} else {
						collection.ThumbnailID = nil
					}
					selectFields = append(selectFields, "ThumbnailID")
				}
			}

			if err := tx.Model(&collection).Select(selectFields).Updates(&collection).Error; err != nil {
				return err
			}

			if wsBroker != nil {
				_ = wsBroker.Broadcast("collection-updated", map[string]interface{}{
					"uid":    collection.Uid,
					"action": "images-removed",
				})
			}

			return nil
		})

		if err != nil {
			if err == gorm.ErrRecordNotFound {
				render.Status(req, http.StatusNotFound)
				render.JSON(res, req, dto.DeleteImagesResponse{Deleted: false, Error: utils.StringPtr("collection not found")})
				return
			}

			if err == ErrCollectionUnauthorised {
				render.Status(req, http.StatusForbidden)
				render.JSON(res, req, dto.DeleteImagesResponse{Deleted: false, Error: utils.StringPtr("unauthorized")})
				return
			}

			libhttp.ServerError(res, req, err, logger, nil,
				"Failed to remove images from collection",
				"Something went wrong, please try again later",
			)
			return
		}

		render.Status(req, http.StatusOK)
		render.JSON(res, req, dto.DeleteImagesResponse{Deleted: true})
	})

	return router
}

// updateCollectionFromDTO updates collection entity fields from a CollectionUpdate DTO
func updateCollectionFromDTO(collection *entities.Collection, update dto.CollectionUpdate) {
	if update.Name != nil {
		collection.Name = *update.Name
	}
	if update.Description != nil {
		collection.Description = update.Description
	}
	if update.Private != nil {
		collection.Private = update.Private
	}
	if update.Favourited != nil {
		collection.Favourited = update.Favourited
	}
	if update.ThumbnailUID != nil {
		if *update.ThumbnailUID == "" {
			collection.ThumbnailID = nil
		} else {
			collection.ThumbnailID = update.ThumbnailUID
		}
	}
	if update.OwnerUID != nil {
		collection.OwnerID = update.OwnerUID
	}
}
