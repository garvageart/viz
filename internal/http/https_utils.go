package http

import (
	"net/http"

	"github.com/go-chi/chi/v5/middleware"
)

func GetRequestID(request *http.Request) string {
	return middleware.GetReqID(request.Context())
}
