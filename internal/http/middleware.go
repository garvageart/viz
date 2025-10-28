package http

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"gorm.io/gorm"

	"github.com/go-chi/render"

	imaAuth "imagine/internal/auth"
	"imagine/internal/dto"
	"imagine/internal/entities"
)

// context keys
type ctxKey string

const (
	ctxUserKey ctxKey = "currentUser"
	ctxAPIKey  ctxKey = "apiKeyAuth"
)

// WithUser returns a request with the authenticated user added to the context.
func WithUser(r *http.Request, user *entities.User) *http.Request {
	ctx := context.WithValue(r.Context(), ctxUserKey, user)
	return r.WithContext(ctx)
}

// UserFromContext returns the authenticated user from the request context, if present.
func UserFromContext(r *http.Request) (*entities.User, bool) {
	v := r.Context().Value(ctxUserKey)
	if v == nil {
		return nil, false
	}
	u, ok := v.(*entities.User)
	return u, ok
}

// AuthMiddleware validates the auth cookie against the sessions table, loads the user,
// and injects it into the request context. 401 is returned for missing/invalid/expired sessions.
func AuthMiddleware(db *gorm.DB, logger *slog.Logger) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			apiKey := getAPIKeyFromRequest(r)
			if apiKey != "" {
				hashed, _ := imaAuth.HashSecret(apiKey)

				var count int64
				query := db.Table("api_keys").Where("key_hashed = ? OR key = ?", hashed, hashed).Count(&count)
				if query.Error != nil || count == 0 {
					w.WriteHeader(http.StatusUnauthorized)
					render.JSON(w, r, dto.ErrorResponse{Error: "invalid api key"})
					return
				}

				r = r.WithContext(context.WithValue(r.Context(), ctxAPIKey, true))
				next.ServeHTTP(w, r)
				return
			}

			cookie, err := r.Cookie(AuthTokenCookie)
			if err != nil || cookie == nil || cookie.Value == "" {
				w.WriteHeader(http.StatusUnauthorized)
				render.JSON(w, r, dto.ErrorResponse{Error: "token missing"})
				return
			}

			var sess entities.Session
			if err := db.Where("token = ?", cookie.Value).First(&sess).Error; err != nil {
				// clear auth cookie
				ClearCookie(AuthTokenCookie, w)
				ClearCookie(StateCookie, w)
				w.WriteHeader(http.StatusUnauthorized)
				render.JSON(w, r, dto.ErrorResponse{Error: "invalid session"})
				return
			}

			if !sess.ExpiresAt.IsZero() && time.Now().After(sess.ExpiresAt) {
				w.WriteHeader(http.StatusUnauthorized)
				render.JSON(w, r, dto.ErrorResponse{Error: "session expired"})
				return
			}

			var user entities.User
			if sess.UserUID == "" {
				w.WriteHeader(http.StatusUnauthorized)
				render.JSON(w, r, dto.ErrorResponse{Error: "user missing"})
				return
			}

			err = db.Where("uid = ?", sess.UserUID).First(&user).Error

			if err != nil {
				w.WriteHeader(http.StatusUnauthorized)
				render.JSON(w, r, dto.ErrorResponse{Error: "user not found"})
				return
			}

			r = WithUser(r, &user)
			next.ServeHTTP(w, r)
		})
	}
}

// CORSMiddleware allows all origins with credentials support
// This is safe for public APIs that need to accept requests from any origin
func CORSMiddleware() func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origin == "" {
				origin = "*"
			}

			// Set CORS headers
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Accept, Authorization, Content-Type, X-CSRF-Token, X-API-Key, X-Imagine-Key")
			w.Header().Set("Access-Control-Expose-Headers", "Set-Cookie")
			w.Header().Set("Access-Control-Max-Age", "300")

			// Handle preflight requests
			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// getAPIKeyFromRequest checks common header locations for an API key
func getAPIKeyFromRequest(r *http.Request) string {
	// Prefer Authorization: Bearer <key>
	authHead := r.Header.Get("Authorization")
	if authHead != "" {
		// Case-insensitive prefix match
		if len(authHead) > 7 && (authHead[:7] == "Bearer " || authHead[:7] == "bearer ") {
			return authHead[7:]
		}
	}

	apiKey := r.Header.Get("X-API-Key")
	if apiKey == "" {
		apiKey = r.Header.Get(APIKeyName)
	}
	if apiKey != "" {
		return apiKey
	}

	return ""
}
