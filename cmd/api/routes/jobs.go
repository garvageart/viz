package routes

import (
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/render"
	"gorm.io/gorm"

	"viz/internal/auth"
	"viz/internal/dto"
	"viz/internal/entities"
	libhttp "viz/internal/http"
	"viz/internal/jobs"
)

// JobsRouter exposes the admin jobs API. It applies AuthMiddleware and
// AdminMiddleware internally so jobs are an admin-only route regardless of
// whether auth is done by cookie session or API key — the same pattern as
// AdminRouter. On top of that, individual API keys must carry the matching
// jobs scope; cookie sessions are role-gated by AdminMiddleware alone. Jobs
// live under their own base route.
func JobsRouter(db *gorm.DB, service *jobs.Service, logger *slog.Logger) *chi.Mux {
	router := chi.NewRouter()
	router.Use(libhttp.AuthMiddleware(db, logger))
	router.Use(libhttp.AdminMiddleware)

	router.With(libhttp.ScopeMiddleware([]auth.Scope{auth.JobsReadScope})).Get("/types", func(res http.ResponseWriter, req *http.Request) {
		render.JSON(res, req, dto.JobTypeListResponse{Items: service.ListTypes()})
	})

	router.With(libhttp.ScopeMiddleware([]auth.Scope{auth.JobsUpdateScope})).Patch("/types/{type}", func(res http.ResponseWriter, req *http.Request) {
		jobType, err := parseJobType(chi.URLParam(req, "type"))
		if err != nil {
			renderBadRequest(res, req, err.Error())
			return
		}

		var body dto.JobTypeConfig
		if err := render.DecodeJSON(req.Body, &body); err != nil {
			renderBadRequest(res, req, "Invalid request body")
			return
		}

		updated, err := service.UpdateType(req.Context(), jobType, body)
		if err != nil {
			renderJobError(res, req, err)
			return
		}

		render.JSON(res, req, updated)
	})

	router.With(libhttp.ScopeMiddleware([]auth.Scope{auth.JobsCreateScope})).Post("/", func(res http.ResponseWriter, req *http.Request) {
		var body dto.JobCreateRequest
		if err := render.DecodeJSON(req.Body, &body); err != nil {
			renderBadRequest(res, req, "Invalid request body")
			return
		}

		created, err := service.CreateJob(req.Context(), body.Type, body.Data)
		if err != nil {
			renderJobError(res, req, err)
			return
		}

		render.Status(req, http.StatusCreated)
		render.JSON(res, req, created)
	})

	router.With(libhttp.ScopeMiddleware([]auth.Scope{auth.JobsReadScope})).Get("/", func(res http.ResponseWriter, req *http.Request) {
		limit, page, err := parsePagination(req)
		if err != nil {
			renderBadRequest(res, req, err.Error())
			return
		}

		filter := jobs.JobListFilter{
			Limit: limit,
			Page:  page,
		}

		if raw := req.URL.Query().Get("type"); raw != "" {
			filter.Type, err = parseJobType(raw)
			if err != nil {
				renderBadRequest(res, req, err.Error())
				return
			}
		}

		if raw := req.URL.Query().Get("status"); raw != "" {
			filter.Status, err = parseJobStatus(raw)
			if err != nil {
				renderBadRequest(res, req, err.Error())
				return
			}
		}

		items, total, err := service.ListJobs(req.Context(), filter)
		if err != nil {
			renderJobError(res, req, err)
			return
		}

		render.JSON(res, req, dto.JobListResponse{
			Items: jobDTOs(items),
			Limit: limit,
			Page:  page,
			Total: int(total),
		})
	})

	router.With(libhttp.ScopeMiddleware([]auth.Scope{auth.JobsDeleteScope})).Delete("/", func(res http.ResponseWriter, req *http.Request) {
		jobType, err := parseJobType(req.URL.Query().Get("type"))
		if err != nil {
			renderBadRequest(res, req, err.Error())
			return
		}

		var statuses []dto.WorkerJobStatus
		if raw := req.URL.Query().Get("status"); raw != "" {
			for _, value := range strings.Split(raw, ",") {
				status, err := parseJobStatus(strings.TrimSpace(value))
				if err != nil {
					renderBadRequest(res, req, err.Error())
					return
				}

				statuses = append(statuses, status)
			}
		}

		count, err := service.CancelJobs(req.Context(), jobType, statuses)
		if err != nil {
			renderJobError(res, req, err)
			return
		}

		render.JSON(res, req, dto.JobCancelResponse{
			Count:   int(count),
			Message: "Cancellation requested",
		})
	})

	router.With(libhttp.ScopeMiddleware([]auth.Scope{auth.JobsReadScope})).Get("/stats", func(res http.ResponseWriter, req *http.Request) {
		stats, err := service.Stats(req.Context())
		if err != nil {
			renderJobError(res, req, err)
			return
		}

		render.JSON(res, req, stats)
	})

	router.With(libhttp.ScopeMiddleware([]auth.Scope{auth.JobsReadScope})).Get("/{uid}", func(res http.ResponseWriter, req *http.Request) {
		job, err := service.GetJob(req.Context(), chi.URLParam(req, "uid"))
		if err != nil {
			renderJobError(res, req, err)
			return
		}

		render.JSON(res, req, job.DTO())
	})

	router.With(libhttp.ScopeMiddleware([]auth.Scope{auth.JobsDeleteScope})).Delete("/{uid}", func(res http.ResponseWriter, req *http.Request) {
		if err := service.CancelJob(req.Context(), chi.URLParam(req, "uid")); err != nil {
			renderJobError(res, req, err)
			return
		}

		render.Status(req, http.StatusAccepted)
		render.JSON(res, req, dto.MessageResponse{Message: "Job cancellation requested"})
	})

	return router
}

func jobDTOs(items []entities.WorkerJob) []dto.WorkerJob {
	result := make([]dto.WorkerJob, 0, len(items))
	for _, item := range items {
		result = append(result, item.DTO())
	}

	return result
}

func parseJobType(raw string) (dto.JobTypeName, error) {
	jobType := dto.JobTypeName(raw)
	if jobType == "" || !jobType.Valid() {
		return "", errors.New("invalid job type")
	}

	return jobType, nil
}

func parseJobStatus(raw string) (dto.WorkerJobStatus, error) {
	status := dto.WorkerJobStatus(raw)
	if status == "" || !status.Valid() {
		return "", errors.New("invalid job status")
	}

	return status, nil
}

func parsePagination(req *http.Request) (int, int, error) {
	limit := 25
	page := 0

	if raw := req.URL.Query().Get("limit"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed < 1 || parsed > 200 {
			return 0, 0, errors.New("limit must be between 1 and 200")
		}

		limit = parsed
	}

	if raw := req.URL.Query().Get("page"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed < 0 {
			return 0, 0, errors.New("page must be a non-negative integer")
		}

		page = parsed
	}

	return limit, page, nil
}

func renderBadRequest(res http.ResponseWriter, req *http.Request, message string) {
	render.Status(req, http.StatusBadRequest)
	render.JSON(res, req, dto.ErrorResponse{Error: message})
}

func renderJobError(res http.ResponseWriter, req *http.Request, err error) {
	switch {
	case errors.Is(err, jobs.ErrUnknownJobType), errors.Is(err, jobs.ErrJobNotFound):
		render.Status(req, http.StatusNotFound)
	case errors.Is(err, jobs.ErrInvalidData):
		render.Status(req, http.StatusBadRequest)
	case errors.Is(err, jobs.ErrJobConflict):
		render.Status(req, http.StatusConflict)
	default:
		render.Status(req, http.StatusInternalServerError)
	}

	render.JSON(res, req, dto.ErrorResponse{Error: err.Error()})
}
