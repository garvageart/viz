package routes

import (
	"fmt"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/render"
	"gorm.io/gorm"

	"imagine/internal/dto"
	"imagine/internal/entities"
	libhttp "imagine/internal/http"
)

func SessionsRouter(db *gorm.DB, logger *slog.Logger) *chi.Mux {
	router := chi.NewRouter()
	router.Use(libhttp.UserAuthMiddleware)

	// GET /sessions - List all sessions for the current user
	router.Get("/", func(res http.ResponseWriter, req *http.Request) {
		user, _ := libhttp.UserFromContext(req)

		var sessions []entities.Session
		// Sort by last active descending
		if err := db.Where("user_uid = ?", user.Uid).Order("last_active desc").Find(&sessions).Error; err != nil {
			libhttp.ServerError(res, req, err, logger, nil,
				"failed to list sessions",
				"Something went wrong, please try again later",
			)
			return
		}

		sessionDTOs := make([]dto.Session, len(sessions))
		for i, s := range sessions {
			sessionDTOs[i] = s.DTO()
		}

		render.Status(req, http.StatusOK)
		render.JSON(res, req, sessionDTOs)
	})

	// GET /sessions/{uid} - Get a specific session by ID for the current user
	router.Get("/{uid}", func(res http.ResponseWriter, req *http.Request) {
		user, _ := libhttp.UserFromContext(req)
		sessionID := chi.URLParam(req, "uid")

		var session entities.Session
		if err := db.Where("uid = ? AND user_uid = ?", sessionID, user.Uid).First(&session).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				render.Status(req, http.StatusNotFound)
				render.JSON(res, req, dto.ErrorResponse{Error: "Session not found"})
				return
			}
			libhttp.ServerError(res, req, err, logger, nil, "failed to get session", "Internal server error")
			return
		}

		lastActiveNano := int64(0)
		if session.LastActive != nil {
			lastActiveNano = session.LastActive.UnixNano()
		}
		etag := fmt.Sprintf("W/\"%s-%d\"", session.Uid, lastActiveNano)

		res.Header().Set("Cache-Control", "private, max-age=60, must-revalidate")
		res.Header().Set("ETag", etag)

		if match := req.Header.Get("If-None-Match"); match == etag {
			res.WriteHeader(http.StatusNotModified)
			return
		}

		render.Status(req, http.StatusOK)
		render.JSON(res, req, session.DTO())
	})

	// PUT /sessions/{uid} - Update a specific session
	router.Put("/{uid}", func(res http.ResponseWriter, req *http.Request) {
		user, _ := libhttp.UserFromContext(req)
		sessionID := chi.URLParam(req, "uid")

		var updatePayload dto.SessionUpdate
		if err := render.DecodeJSON(req.Body, &updatePayload); err != nil {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.ErrorResponse{Error: "Invalid request body"})
			return
		}

		var session entities.Session
		if err := db.Where("uid = ? AND user_uid = ?", sessionID, user.Uid).First(&session).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				render.Status(req, http.StatusNotFound)
				render.JSON(res, req, dto.ErrorResponse{Error: "Session not found"})
				return
			}
			libhttp.ServerError(res, req, err, logger, nil, "failed to find session", "Internal server error")
			return
		}

		updates := make(map[string]interface{})
		if updatePayload.ClientName != nil {
			updates["client_name"] = *updatePayload.ClientName
		}
		if updatePayload.Status != nil {
			updates["status"] = *updatePayload.Status
		}

		if len(updates) == 0 {
			render.Status(req, http.StatusBadRequest)
			render.JSON(res, req, dto.ErrorResponse{Error: "No fields provided for update"})
			return
		}

		if err := db.Model(&session).Updates(updates).Error; err != nil {
			libhttp.ServerError(res, req, err, logger, nil, "failed to update session", "Internal server error")
			return
		}

		// Re-fetch updated session
		if err := db.Where("uid = ?", sessionID).First(&session).Error; err != nil {
			libhttp.ServerError(res, req, err, logger, nil, "failed to re-fetch updated session", "Internal server error")
			return
		}

		render.Status(req, http.StatusOK)
		render.JSON(res, req, session.DTO())
	})


	// DELETE /sessions - Delete ALL sessions for the current user
	router.Delete("/", func(res http.ResponseWriter, req *http.Request) {
		user, _ := libhttp.UserFromContext(req)

		// Delete all sessions for this user from the DB
		if err := db.Where("user_uid = ?", user.Uid).Delete(&entities.Session{}).Error; err != nil {
			libhttp.ServerError(res, req, err, logger, nil,
				"failed to delete all sessions",
				"Something went wrong, please try again later",
			)
			return
		}

		// Clear cookies for the current session (if any) and clear its cache entry
		cookie, err := req.Cookie(libhttp.AuthTokenCookie)
		if err == nil {
			libhttp.ClearCookie(libhttp.AuthTokenCookie, res)
			libhttp.ClearSessionCache(cookie.Value)
		}
		// Clear other auth-related cookies
		libhttp.ClearCookie(libhttp.StateCookie, res)
		libhttp.ClearCookie(libhttp.RedirectCookie, res)
		libhttp.ClearCookie(libhttp.RefreshTokenCookie, res)

		render.Status(req, http.StatusOK)
		render.JSON(res, req, dto.MessageResponse{Message: "All sessions logged out"})
	})

	// DELETE /sessions/{uid} - Delete a specific session
	router.Delete("/{uid}", func(res http.ResponseWriter, req *http.Request) {
		user, _ := libhttp.UserFromContext(req)
		sessionID := chi.URLParam(req, "uid")

		var session entities.Session
		// Ensure the session belongs to the requesting user
		if err := db.Where("uid = ? AND user_uid = ?", sessionID, user.Uid).First(&session).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				render.Status(req, http.StatusNotFound)
				render.JSON(res, req, dto.ErrorResponse{Error: "Session not found"})
				return
			}
			libhttp.ServerError(res, req, err, logger, nil, "failed to find session", "Internal server error")
			return
		}

		// Delete the session
		if err := db.Delete(&session).Error; err != nil {
			libhttp.ServerError(res, req, err, logger, nil, "failed to delete session", "Internal server error")
			return
		}

		// If the deleted session is the *current* one, clear cookies
		cookie, err := req.Cookie(libhttp.AuthTokenCookie)
		if err == nil && cookie.Value == session.Token {
			libhttp.ClearCookie(libhttp.AuthTokenCookie, res)
			libhttp.ClearSessionCache(cookie.Value)
		} else {
			// If it wasn't current, just clear it from server cache to be safe
			libhttp.ClearSessionCache(session.Token)
		}

		render.Status(req, http.StatusOK)
		render.JSON(res, req, dto.MessageResponse{Message: "Session revoked"})
	})

	return router
}
