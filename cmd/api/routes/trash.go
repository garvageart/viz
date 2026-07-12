package routes

import (
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/render"
	"gorm.io/gorm"

	"viz/internal/dto"
	"viz/internal/entities"
	libhttp "viz/internal/http"
	"viz/internal/images"
	libos "viz/internal/os"
)

// TrashRouter creates a new router for trash-related endpoints
func TrashRouter(db *gorm.DB, logger *slog.Logger) chi.Router {
	r := chi.NewRouter()

	r.Get("/", func(res http.ResponseWriter, req *http.Request) {
		limitStr := req.URL.Query().Get("limit")
		pageStr := req.URL.Query().Get("page")

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

		var imagesList []entities.ImageAsset
		var total int64

		query := db.WithContext(req.Context()).Unscoped().Model(&entities.ImageAsset{}).Where("deleted_at IS NOT NULL")

		// Access Control: Non-admins can only see their own trashed items
		if !libhttp.IsAdminFromRequest(req) {
			authUser, ok := libhttp.UserFromContext(req)
			if !ok {
				render.Status(req, http.StatusUnauthorized)
				render.JSON(res, req, dto.ErrorResponse{Error: "Unauthorized"})
				return
			}
			query = query.Where("owner_id = ?", authUser.Uid)
		}

		if err := query.Count(&total).Error; err != nil {
			logger.Error("failed to count trash images", slog.Any("error", err))
			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "Failed to fetch trash images"})
			return
		}

		pageOffset := max(page*limit, 0)
		if err := query.Preload("Owner").Preload("UploadedBy").Order("deleted_at DESC").Offset(pageOffset).Limit(limit).Find(&imagesList).Error; err != nil {
			logger.Error("failed to query trash images", slog.Any("error", err))
			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "Failed to fetch trash images"})
			return
		}

		items := make([]dto.ImagesResponse, len(imagesList))
		for i, img := range imagesList {
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

		render.Status(req, http.StatusOK)
		render.JSON(res, req, map[string]interface{}{
			"items": items,
			"page":  page,
			"limit": limit,
			"count": total,
		})
	})

	r.Delete("/", func(res http.ResponseWriter, req *http.Request) {
		var imagesList []entities.ImageAsset

		query := db.Unscoped().Model(&entities.ImageAsset{}).Where("deleted_at IS NOT NULL")

		// Access Control: Non-admins can only empty their own trashed items
		if !libhttp.IsAdminFromRequest(req) {
			authUser, ok := libhttp.UserFromContext(req)
			if !ok {
				render.Status(req, http.StatusUnauthorized)
				render.JSON(res, req, dto.ErrorResponse{Error: "Unauthorized"})
				return
			}
			query = query.Where("owner_id = ?", authUser.Uid)
		}

		if err := query.Find(&imagesList).Error; err != nil {
			logger.Error("failed to find trash images to empty", slog.Any("error", err))
			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "Failed to empty trash"})
			return
		}

		trashDir := images.TrashDirectory

		err := db.Transaction(func(tx *gorm.DB) error {
			for _, img := range imagesList {
				// Permanent delete from DB
				if err := tx.Unscoped().Delete(&img).Error; err != nil {
					return err
				}
				// Remove file directory from trash
				src := filepath.Join(trashDir, img.Uid)
				if err := os.RemoveAll(src); err != nil {
					logger.Error("failed to remove files from trash for image", slog.String("uid", img.Uid), slog.Any("error", err))
				}
			}
			return nil
		})

		if err != nil {
			logger.Error("failed to empty trash in transaction", slog.Any("error", err))
			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "Failed to empty trash"})
			return
		}

		render.Status(req, http.StatusOK)
		render.JSON(res, req, dto.MessageResponse{Message: "Trash emptied successfully"})
	})

	r.Post("/{uid}/restore", func(res http.ResponseWriter, req *http.Request) {
		uid := chi.URLParam(req, "uid")

		var img entities.ImageAsset
		if err := db.Unscoped().Where("uid = ? AND deleted_at IS NOT NULL", uid).First(&img).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				render.Status(req, http.StatusNotFound)
				render.JSON(res, req, dto.ErrorResponse{Error: "Image not found in trash"})
				return
			}
			logger.Error("failed to fetch image from trash", slog.Any("error", err))
			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "Failed to fetch image"})
			return
		}

		// Access Control: Only owner (or admin) can restore
		if !libhttp.IsAdminFromRequest(req) {
			authUser, ok := libhttp.UserFromContext(req)
			if !ok || (img.OwnerID != nil && *img.OwnerID != authUser.Uid) {
				render.Status(req, http.StatusNotFound)
				render.JSON(res, req, dto.ErrorResponse{Error: "Image not found in trash"})
				return
			}
		}

		// Restore files: Move from trash back to library directory
		src := filepath.Join(images.TrashDirectory, img.Uid)
		dst := filepath.Join(images.Directory, img.Uid)

		err := db.Transaction(func(tx *gorm.DB) error {
			// Clear DeletedAt in DB (Restore)
			if err := tx.Model(&img).Unscoped().Update("deleted_at", nil).Error; err != nil {
				return err
			}
			if err := libos.MoveDirWithFallback(src, dst); err != nil {
				return err
			}
			return nil
		})

		if err != nil {
			logger.Error("failed to restore image from trash", slog.String("uid", uid), slog.Any("error", err))
			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "Failed to restore image"})
			return
		}

		render.Status(req, http.StatusOK)
		render.JSON(res, req, dto.MessageResponse{Message: "Image restored successfully"})
	})

	r.Delete("/{uid}", func(res http.ResponseWriter, req *http.Request) {
		uid := chi.URLParam(req, "uid")

		var img entities.ImageAsset
		if err := db.Unscoped().Where("uid = ? AND deleted_at IS NOT NULL", uid).First(&img).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				render.Status(req, http.StatusNotFound)
				render.JSON(res, req, dto.ErrorResponse{Error: "Image not found in trash"})
				return
			}
			logger.Error("failed to fetch image from trash", slog.Any("error", err))
			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "Failed to fetch image"})
			return
		}

		// Access Control: Only owner (or admin) can delete permanently
		if !libhttp.IsAdminFromRequest(req) {
			authUser, ok := libhttp.UserFromContext(req)
			if !ok || (img.OwnerID != nil && *img.OwnerID != authUser.Uid) {
				render.Status(req, http.StatusNotFound)
				render.JSON(res, req, dto.ErrorResponse{Error: "Image not found in trash"})
				return
			}
		}

		trashDir := filepath.Join(images.TrashDirectory, img.Uid)

		err := db.Transaction(func(tx *gorm.DB) error {
			// Unscoped hard delete from DB
			if err := tx.Unscoped().Delete(&img).Error; err != nil {
				return err
			}
			// Remove files from trash directory
			if err := os.RemoveAll(trashDir); err != nil {
				return err
			}
			return nil
		})

		if err != nil {
			logger.Error("failed to permanently delete image", slog.String("uid", uid), slog.Any("error", err))
			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "Failed to permanently delete image"})
			return
		}

		render.Status(req, http.StatusOK)
		render.JSON(res, req, dto.MessageResponse{Message: "Image permanently deleted"})
	})

	return r
}
