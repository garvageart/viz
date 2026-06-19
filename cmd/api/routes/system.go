package routes

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"runtime"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/render"
	"gorm.io/gorm"

	"viz/internal/config"
	"viz/internal/dto"
	"viz/internal/entities"
	libhttp "viz/internal/http"
	libvips "viz/internal/images/ops/vips"
	"viz/internal/settings"
	"viz/internal/utils"
)

// SystemRouter creates a router for system-related endpoints
func SystemRouter(db *gorm.DB, logger *slog.Logger) chi.Router {
	r := chi.NewRouter()
	r.Use(systemCacheMiddleware)

	// Pre-compute static server info once on startup
	goos := runtime.GOOS
	goarch := runtime.GOARCH
	env := utils.Environment
	gov := runtime.Version()
	vipsVersion := libvips.Version
	
	serverAbout := dto.ServerAbout{
		Version:       config.Version,
		Build:         &config.BuildID,
		Go:            &gov,
		Repository:    &config.Repository,
		RepositoryUrl: &config.RepositoryUrl,
		SourceCommit:  &config.SourceCommit,
		SourceRef:     &config.SourceRef,
		SourceUrl:     &config.SourceUrl,
		Os:            &goos,
		Architecture:  &goarch,
		Environment:   &env,
		Libvips:       &vipsVersion,
	}

	r.Get("/about", func(res http.ResponseWriter, req *http.Request) {
		render.Status(req, http.StatusOK)
		render.JSON(res, req, serverAbout)
	})

	// This is lowkey complicated and a mess but whatever
	r.Get("/status", func(res http.ResponseWriter, req *http.Request) {
		status, err := GetSystemStatus(db, logger, req)
		if err != nil {
			logger.Error("failed to get system status", slog.Any("error", err))
			render.Status(req, http.StatusInternalServerError)
			render.JSON(res, req, dto.ErrorResponse{Error: "failed to get system status"})
			return
		}

		render.Status(req, http.StatusOK)
		render.JSON(res, req, status)
	})

	r.Group(func(authRouter chi.Router) {
		authRouter.Use(libhttp.AuthMiddleware(db, logger))
		authRouter.Use(libhttp.AdminMiddleware)

		authRouter.Get("/config", func(res http.ResponseWriter, req *http.Request) {
			cfg := config.AppConfig
			// Sanitize sensitive fields
			cfg.Database.Password = "***"
			cfg.Queue.Password = "***"

			render.Status(req, http.StatusOK)
			render.JSON(res, req, cfg)
		})

		authRouter.Put("/config", func(res http.ResponseWriter, req *http.Request) {
			var body dto.VizConfig
			if err := render.Decode(req, &body); err != nil {
				render.Status(req, http.StatusBadRequest)
				render.JSON(res, req, dto.ErrorResponse{Error: "invalid request body: " + err.Error()})
				return
			}

			// Merge DTO into a copy of current AppConfig
			updatedConfig := config.AppConfig

			dtoBytes, err := json.Marshal(body)
			if err != nil {
				logger.Error("failed to marshal request DTO", slog.Any("error", err))
				render.Status(req, http.StatusInternalServerError)
				render.JSON(res, req, dto.ErrorResponse{Error: "failed to process configuration"})
				return
			}

			if err := json.Unmarshal(dtoBytes, &updatedConfig); err != nil {
				logger.Error("failed to unmarshal into config struct", slog.Any("error", err))
				render.Status(req, http.StatusBadRequest)
				render.JSON(res, req, dto.ErrorResponse{Error: "invalid configuration format: " + err.Error()})
				return
			}

			// Restore password fields if they were sanitized ("***")
			if updatedConfig.Database.Password == "***" {
				updatedConfig.Database.Password = config.AppConfig.Database.Password
			}
			if updatedConfig.Queue.Password == "***" {
				updatedConfig.Queue.Password = config.AppConfig.Queue.Password
			}

			// Write to viz.json
			if err := config.WriteConfig(updatedConfig); err != nil {
				logger.Error("failed to write config", slog.Any("error", err))
				render.Status(req, http.StatusInternalServerError)
				render.JSON(res, req, dto.ErrorResponse{Error: "failed to save configuration: " + err.Error()})
				return
			}

			// Return the sanitized updated configuration
			sanitizedConfig := updatedConfig
			sanitizedConfig.Database.Password = "***"
			sanitizedConfig.Queue.Password = "***"

			render.Status(req, http.StatusOK)
			render.JSON(res, req, sanitizedConfig)
		})
	})

	return r
}

func GetSystemStatus(db *gorm.DB, logger *slog.Logger, req *http.Request) (*dto.SystemStatusResponse, error) {
	var (
		initialized            bool
		userOnboardingRequired bool
		needsSuperadmin        bool
	)

	superadminCount, err := entities.CountSuperadmins(db)
	if err != nil {
		return nil, fmt.Errorf("failed to count superadmins: %w", err)
	}

	firstRunCompleteStr, err := settings.GetSetting(db, "first_run_complete", nil)
	if err != nil {
		logger.Warn("could not retrieve 'first_run_complete' setting, assuming false", slog.Any("error", err))
		firstRunCompleteStr = "false"
	}

	firstRunComplete, err := strconv.ParseBool(firstRunCompleteStr)
	if err != nil {
		logger.Error("failed to parse 'first_run_complete' setting to bool, assuming false", slog.String("value", firstRunCompleteStr), slog.Any("error", err))
		firstRunComplete = false
	}

	// The system is considered NOT initialized if there's no superadmin,
	// regardless of what the 'first_run_complete' setting says.
	if superadminCount == 0 {
		needsSuperadmin = true
		initialized = false
	} else {
		needsSuperadmin = false
		// If we have a superadmin, we consider it initialized if the setting also matches
		initialized = firstRunComplete
	}

	// For authenticated users, check 'onboarding_complete'
	// Since this endpoint is public, we must manually check for a session
	var user *entities.User
	if cookie, err := req.Cookie(libhttp.AuthTokenCookie); err == nil && cookie.Value != "" {
		if cachedUser, ok := libhttp.GetSessionCache(cookie.Value); ok {
			user = cachedUser
		} else {
			var sess entities.Session
			if err := db.Where("token = ?", cookie.Value).First(&sess).Error; err == nil {
				if sess.ExpiresAt == nil || sess.ExpiresAt.IsZero() || time.Now().Before(*sess.ExpiresAt) {
					var dbUser entities.User
					if err := db.Where("uid = ?", sess.UserUid).First(&dbUser).Error; err == nil {
						user = &dbUser
						libhttp.SetSessionCache(cookie.Value, user, sess.ExpiresAt)
					}
				}
			}
		}
	}

	if user != nil {
		onboardingCompleteStr, err := settings.GetSetting(db, settings.SettingNameOnboardingComplete, &user.Uid)
		if err != nil {
			logger.Warn("could not retrieve 'onboarding_complete' setting for user, assuming true", slog.String("user_id", user.Uid), slog.Any("error", err))
			// If setting not found for user, assume onboarding is NOT required to avoid blocking
			userOnboardingRequired = false
		} else {
			onboardingComplete, err := strconv.ParseBool(onboardingCompleteStr)
			if err != nil {
				logger.Error("failed to parse 'onboarding_complete' setting to bool, assuming true", slog.String("value", onboardingCompleteStr), slog.Any("error", err))
				userOnboardingRequired = false
			} else {
				userOnboardingRequired = !onboardingComplete
			}
		}
	} else {
		// Not authenticated, so user onboarding not applicable
		userOnboardingRequired = false
	}

	return &dto.SystemStatusResponse{
		Initialized:             initialized,
		UserOnboardingRequired:  userOnboardingRequired,
		NeedsSuperadmin:         needsSuperadmin,
		AllowManualRegistration: config.AppConfig.UserManagement.AllowManualRegistration,
	}, nil
}

func systemCacheMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			w.Header().Set("Cache-Control", "private, max-age=300")
			w.Header().Add("Vary", "Cookie")
		}
		next.ServeHTTP(w, r)
	})
}
