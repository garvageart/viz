package http

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5/middleware"
)

const (
	AuthTokenCookie    = "imag-auth_token"
	StateCookie        = "imag-state"
	RedirectCookie     = "imag-redirect_state"
	RefreshTokenCookie = "imag-refresh_token"
)

func GetRequestID(request *http.Request) string {
	return middleware.GetReqID(request.Context())
}

func ClearCookie(name string, w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Expires:  time.Unix(0, 0),
	})
}
