package cors

import (
	"net/http"

	"viz/internal/config"

	"github.com/go-chi/cors"
)

const (
	APIKeyName     = "x-viz-key"
	APIUserVersion = "X-User-Version"
)

var DefaultAllowedHosts = []string{"*.localhost", "localhost", "127.0.0.1"}

// GetDefaults returns a default cors.Options for use with chi
// and the default allowed hosts, including in the app configuration
func GetDefaults() cors.Options {
	return cors.Options{
		AllowOriginFunc: func(r *http.Request, origin string) bool {
			allowedHosts := append(config.AppConfig.AllowedHosts, DefaultAllowedHosts...)
			return MatchOrigin(origin, allowedHosts)
		},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "OPTIONS", "DELETE"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Bearer", "Content-Type", "X-CSRF-Token", "X-Download-Password", APIKeyName, "If-None-Match", "If-Modified-Since"},
		ExposedHeaders:   []string{"Set-Cookie", "Content-Disposition"},
		AllowCredentials: true,
		MaxAge:           300,
	}
}
