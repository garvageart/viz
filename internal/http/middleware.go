package http

import (
	"net/http"
)

// TODO: The client application should define a client-specific ID
// that verifies it is a client side application making the request and not
// a server side application. I guess if you're a client-side app, you have an
// auth-token and if you're a server-side app, you have the API key but I don't know.
// There might be flaws with this approach
func AuthedMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// if you have an API key, search for that in the DB,
		// if you have an auth token, verify that it is valid AND coming from a valid source (i.e the browser)
		// auth token can basically be a refresh token? have a valid auth token
		// and we can generate a new session id (lasts one hour) for you

		token, err := r.Cookie("imag-auth-token")
		if err != nil || token == nil {
			// TODO: Specify an error code
			http.Error(w, "Unauthorized: missing auth token", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}
