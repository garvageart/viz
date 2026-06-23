package routes

import (
	"archive/zip"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"path/filepath"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/render"
	"gorm.io/gorm"

	"viz/internal/downloads"
	"viz/internal/dto"
	"viz/internal/entities"
	"viz/internal/utils"
)

// streamZipResponse streams a zip of the given uids to the http.ResponseWriter using an io.Pipe
// to avoid buffering the entire archive in memory.
func streamZipResponse(res http.ResponseWriter, req *http.Request, db *gorm.DB, logger *slog.Logger, uids []string, filename string) {
	if filename == "" {
		filename = fmt.Sprintf("%s_export_%s.zip", utils.AppName, time.Now().Format("20060102T150405"))
	}

	var imgs []entities.ImageAsset
	if err := db.WithContext(req.Context()).Where("uid IN ? AND deleted_at IS NULL", uids).Find(&imgs).Error; err != nil {
		logger.Error("failed to query images for zip size/export calculation", slog.Any("error", err))
		render.Status(req, http.StatusInternalServerError)
		render.JSON(res, req, dto.ErrorResponse{Error: "Failed to query export images"})
		return
	}

	res.Header().Set("Content-Type", "application/octet-stream")
	// Provide both filename and filename* (UTF-8) to improve browser compatibility
	base := filepath.Base(filename)
	res.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"; filename*=UTF-8''%s", base, url.PathEscape(filename)))

	// for progress tracking
	expectedSize := downloads.CalculateZipSize(imgs, uids, true)
	res.Header().Set("Content-Length", fmt.Sprintf("%d", expectedSize))

	pr, pw := io.Pipe()

	go func() {
		// Ensure any writer-side errors are propagated to the reader via CloseWithError
		zw := zip.NewWriter(pw)
		if err := downloads.WriteImagesToZip(req.Context(), logger, zw, imgs, uids); err != nil {
			logger.Error("error while creating zip", slog.Any("error", err))
			_ = zw.Close()
			_ = pw.CloseWithError(err)
			return
		}

		if err := zw.Close(); err != nil {
			logger.Error("failed to close zip writer", slog.Any("error", err))
			_ = pw.CloseWithError(err)
			return
		}

		// Normal close
		_ = pw.Close()
	}()

	// flush headers early if possible so the client sees Content-Disposition
	if f, ok := res.(http.Flusher); ok {
		f.Flush()
	}

	// copy the pipe to the response writer (this will block until pw is closed)
	if _, err := io.Copy(res, pr); err != nil {
		logger.Error("failed to stream zip to client", slog.Any("error", err))
		return
	}
}

func DownloadRouter(db *gorm.DB, logger *slog.Logger) *chi.Mux {
	router := chi.NewRouter()

	router.Post("/sign", func(res http.ResponseWriter, req *http.Request) {
		var body dto.SignDownloadRequest

		if err := render.DecodeJSON(req.Body, &body); err != nil {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.ErrorResponse{Error: "Invalid request body"})
			return
		}

		// require uids present
		if body.Uids == nil || len(*body.Uids) == 0 {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.ErrorResponse{Error: "Image UIDs are required"})
			return
		}

		var ttl time.Duration
		if body.ExpiresIn != nil && *body.ExpiresIn > 0 {
			ttl = time.Duration(*body.ExpiresIn) * time.Second
		} else {
			ttl = 15 * time.Minute
		}

		// Build token options
		opts := downloads.TokenOptions{
			TTL:           ttl,
			AllowDownload: body.AllowDownload == nil || *body.AllowDownload, // Default: true
			AllowEmbed:    body.AllowEmbed != nil && *body.AllowEmbed,       // Default: false
			ShowMetadata:  body.ShowMetadata == nil || *body.ShowMetadata,   // Default: true
		}

		if body.Password != nil {
			opts.Password = *body.Password
		}
		if body.Description != nil {
			opts.Description = *body.Description
		}

		token, err := downloads.CreateTokenWithOptions(db, *body.Uids, opts)
		if err != nil {
			logger.Error("failed to create download token", slog.Any("error", err))
			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "Failed to create download token"})
			return
		}

		var tokenEntity entities.DownloadToken
		if err := db.First(&tokenEntity, "uid = ?", token).Error; err != nil {
			logger.Error("failed to fetch created token", slog.Any("error", err))
			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "Failed to retrieve token details"})
			return
		}

		render.Status(req, http.StatusOK)
		render.JSON(res, req, tokenEntity.DTO())
	})

	router.Post("/", func(res http.ResponseWriter, req *http.Request) {
		tokenParam := req.URL.Query().Get("token")
		passwordParam := req.URL.Query().Get("password")

		if tokenParam == "" {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.ErrorResponse{Error: "Missing token query param"})
			return
		}

		allowedUIDs, tokenEntity, ok := downloads.ValidateTokenWithPassword(db, tokenParam, passwordParam)
		if !ok {
			if tokenEntity != nil && tokenEntity.Password != nil {
				render.Status(req, http.StatusUnauthorized)
				render.JSON(res, req, dto.ErrorResponse{Error: "Invalid or missing password"})
				return
			}
			render.Status(req, http.StatusUnauthorized)
			render.JSON(res, req, dto.ErrorResponse{Error: "Invalid or expired token"})
			return
		}

		if !tokenEntity.AllowDownload {
			render.Status(req, http.StatusForbidden)
			render.JSON(res, req, dto.ErrorResponse{Error: "Downloads not permitted for this token"})
			return
		}

		var body dto.DownloadRequest

		if err := render.DecodeJSON(req.Body, &body); err != nil {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.ErrorResponse{Error: "Invalid request body"})
			return
		}

		if len(body.Uids) == 0 {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.ErrorResponse{Error: "Image UIDs are required"})
			return
		}

		allowedMap := make(map[string]bool, len(allowedUIDs))
		for _, uid := range allowedUIDs {
			allowedMap[uid] = true
		}

		for _, uid := range body.Uids {
			if !allowedMap[uid] {
				render.Status(req, http.StatusUnauthorized)
				render.JSON(res, req, dto.ErrorResponse{Error: "Token does not authorize all requested UIDs"})
				return
			}
		}

		// Stream ZIP using a pipe to avoid buffering the entire archive in memory
		var filename string
		if body.FileName != nil {
			filename = *body.FileName
		}
		streamZipResponse(res, req, db, logger, body.Uids, filename)
	})

	return router
}
