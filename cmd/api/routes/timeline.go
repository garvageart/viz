package routes

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/render"
	"gorm.io/gorm"

	"viz/internal/db"
	"viz/internal/dto"
)

// TimelineRouter creates a new router for timeline-related endpoints
func TimelineRouter(dbClient *gorm.DB, logger *slog.Logger) chi.Router {
	r := chi.NewRouter()

	r.Get("/buckets", func(res http.ResponseWriter, req *http.Request) {
		buckets, err := db.GetTimelineBuckets(dbClient.WithContext(req.Context()), req)
		if err != nil {
			logger.Error("failed to get timeline buckets", slog.Any("error", err))
			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{
				Error: "Failed to fetch timeline buckets",
			})
			return
		}

		render.Status(req, http.StatusOK)
		render.JSON(res, req, buckets)
	})

	return r
}
