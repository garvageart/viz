package http

import (
	"net/http"
)

func AuthTokenMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token, err := r.Cookie("imag-auth-token")
		if err != nil || token == nil {
			// TODO: Specify an error code
			http.Error(w, "Unauthorized: missing auth token", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}
