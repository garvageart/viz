package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/render"

	"viz/api/routes"
	"viz/internal/auth"
	"viz/internal/config"
	"viz/internal/db"
	"viz/internal/debug"
	"viz/internal/entities"
	libhttp "viz/internal/http"
	libcors "viz/internal/http/cors"
	"viz/internal/images"
	imageops "viz/internal/images/ops"
	libvips "viz/internal/images/ops/vips"
	"viz/internal/jobs"
	"viz/internal/jobs/workers"
	imalog "viz/internal/logger"
	libos "viz/internal/os"
	"viz/internal/settings"
	"viz/internal/utils"
	toolsMigrations "viz/tools/migrations"
)

var (
	StorageStatsHolder *images.StorageStatsHolder
)

type APIServer struct {
	*libhttp.Server
}

// TODO: Create a `createServer/Router` function that returns a router
// with common defaults for each server type
func (server APIServer) Launch(router *chi.Mux) *http.Server {
	logger := server.Logger
	serverLogger := slog.NewLogLogger(logger.Handler(), slog.LevelDebug)

	// Setup general middleware - CORS must be first!
	router.Use(cors.Handler(libcors.GetDefaults()))
	router.Use(libhttp.SecurityHeaders)
	router.Use(middleware.RequestLogger(&middleware.DefaultLogFormatter{
		Logger: serverLogger,
	}))
	router.Use(middleware.AllowContentEncoding("deflate", "gzip"))
	router.Use(middleware.RequestID)
	router.Use(middleware.Recoverer)
	router.Use(middleware.GetHead)
	router.Use(middleware.Timeout(60 * time.Second))
	// Note: AuthMiddleware is applied per-route, not globally

	database := server.Database
	dbClient := database.Client

	healthService := debug.NewHealthService(dbClient)

	server.WSBroker = libhttp.NewWSBroker(logger)

	// API Routes
	router.Route("/api", func(r chi.Router) {
		// Public routes (no auth required)
		r.Mount("/auth", routes.AuthRouter(dbClient, logger))
		r.Mount("/accounts", routes.AccountsRouter(dbClient, logger)) // auth middleware added internally
		r.Mount("/system", routes.SystemRouter(dbClient, logger, server.WSBroker))
		r.Mount("/setup", routes.SetupRouter(dbClient, logger)) // superadmin setup
		r.Get("/health", func(res http.ResponseWriter, req *http.Request) {
			render.JSON(res, req, healthService.Check(req.Context()))
		})

		r.Get("/ping", func(res http.ResponseWriter, req *http.Request) {
			jsonResponse := map[string]any{"message": "pong"}
			render.JSON(res, req, jsonResponse)
		})

		// Protected routes (auth required)
		r.Group(func(r chi.Router) {
			r.Use(libhttp.AuthMiddleware(dbClient, logger))
			r.Group(func(r chi.Router) {
				r.Use(libhttp.ScopeMiddleware([]auth.Scope{auth.EventsReadScope}))
				r.Mount("/events", routes.EventsRouter(dbClient, logger, server.WSBroker))
			})
			r.Group(func(r chi.Router) {
				r.Use(libhttp.ScopeMiddleware([]auth.Scope{
					auth.CollectionsCreateScope,
					auth.CollectionsDeleteScope,
					auth.CollectionsReadScope,
					auth.CollectionsUpdateScope,
				}))
				r.Mount("/collections", routes.CollectionsRouter(dbClient, logger, server.WSBroker))
			})
			r.Group(func(r chi.Router) {
				r.Use(libhttp.ScopeMiddleware([]auth.Scope{
					auth.ImagesReadScope,
					auth.ImagesDownloadScope,
					auth.ImagesDeleteScope,
					auth.ImagesUpdateScope,
					auth.ImagesUploadScope,
				}))
				r.Mount("/images", routes.ImagesRouter(dbClient, logger, server.WSBroker))
			})
			r.Group(func(r chi.Router) {
				r.Use(libhttp.ScopeMiddleware([]auth.Scope{
					auth.ImagesReadScope,
				}))
				r.Mount("/timeline", routes.TimelineRouter(dbClient, logger))
			})
			r.Group(func(r chi.Router) {
				r.Use(libhttp.ScopeMiddleware([]auth.Scope{
					auth.ImagesReadScope,
					auth.ImagesDeleteScope,
					auth.ImagesUpdateScope,
				}))
				r.Mount("/trash", routes.TrashRouter(dbClient, logger))
			})
			r.Group(func(r chi.Router) {
				r.Use(libhttp.ScopeMiddleware([]auth.Scope{
					auth.ImagesReadScope,
					auth.CollectionsReadScope,
				}))
				r.Mount("/search", routes.SearchRouter(dbClient, logger))
			})
			r.Group(func(r chi.Router) {
				r.Use(libhttp.ScopeMiddleware([]auth.Scope{
					auth.DownloadsCreateScope,
				}))
				r.Mount("/download", routes.DownloadRouter(dbClient, logger))
			})
			r.Group(func(r chi.Router) {
				r.Use(libhttp.ScopeMiddleware([]auth.Scope{
					auth.APIKeysReadScope,
					auth.APIKeysCreateScope,
					auth.APIKeysRevokeScope,
					auth.APIKeysListScope,
					auth.APIKeysRotateScope,
					auth.APIKeysDeleteScope,
				}))
				r.Mount("/api-keys", routes.APIKeysRouter(dbClient, logger))
			})

			r.Mount("/sessions", routes.SessionsRouter(dbClient, logger))
		})

		// Admin routes (auth + admin required)
		r.Mount("/admin", routes.AdminRouter(dbClient, logger, StorageStatsHolder))
		r.Mount("/jobs", routes.JobsRouter(dbClient, logger))
	})

	// Serve Frontend (SPA + Static Files)
	frontendPath := os.Getenv("VIZ_FRONTEND_BUILD_PATH")
	if frontendPath == "" {
		frontendPath = "../../build/viewfinder" // Default for dev/local
	}

	frontendHandler := routes.NewFrontendHandler(frontendPath, logger, dbClient)
	router.NotFound(frontendHandler.ServeHTTP)

	address := fmt.Sprintf("%s:%d", server.Host, server.Port)
	srv := &http.Server{Addr: address, Handler: router}

	go func() {
		logger.Info(fmt.Sprintf("Hey, you want some pics? 👀: %s", address))

		if server.LogLevel == slog.LevelDebug {
			var allRoutes []string
			chi.Walk(router, func(method string, route string, handler http.Handler, middlewares ...func(http.Handler) http.Handler) error {
				allRoutes = append(allRoutes, fmt.Sprintf("%s %s", method, route))
				return nil
			})

			logger.Debug("mounted routes", slog.Any("routes", allRoutes))
		}

		if err := srv.ListenAndServe(); err != nil {
			if !errors.Is(err, http.ErrServerClosed) {
				logger.Error(fmt.Sprintf("failed to start server: %s", err))
				panic(err)
			}
		}
	}()

	// return the server so the caller can gracefully shutdown
	return srv
}

func main() {
	router := chi.NewRouter()

	// setup logging stuff
	logLevel := imalog.GetLevelFromString(config.AppConfig.Logging.Level)
	useLocal := config.AppConfig.Logging.Timezone == "local"
	logger := libhttp.SetupChiLogger("api", logLevel, useLocal)

	// looool?
	apiServer := APIServer{Server: &libhttp.Server{ServerConfig: &config.ServerConfig{
		Host: config.AppConfig.Server.Host,
		Port: config.AppConfig.Server.Port,
	}}}
	apiServer.LogLevel = logLevel
	apiServer.Logger = logger
	apiServer.Key = "api"

	// db stuff
	if os.Getenv("POSTGRES_PASSWORD") != "" {
		config.AppConfig.Database.Password = os.Getenv("POSTGRES_PASSWORD")
	}

	if config.AppConfig.Database.Password == "" {
		logger.Error("Database password not set, please set a password")
		panic("Database password not set")
	}

	if config.AppConfig.BaseDir == "" {
		logger.Error("Base directory not set, please set BASE_DIRECTORY")
		panic("BASE_DIRECTORY environment variable is required")
	}

	if config.AppConfig.Upload.Location == "" {
		logger.Error("Upload location not set, please set UPLOAD_LOCATION")
		panic("UPLOAD_LOCATION environment variable is required")
	}

	appConfig := config.AppConfig

	logger.Debug("initializing server storage and working paths",
		slog.String("project_root", libos.ProjectRoot),
		slog.String("current_working_directory", libos.CurrentWorkingDirectory),
		slog.String("base_directory", images.BaseDirectory),
		slog.String("library_directory", images.Library),
		slog.String("trash_directory", images.TrashDirectory),
		slog.String("logs_directory", imalog.LogDirectoryDefault),
	)

	apiServer.Database = &db.DB{
		Address: func() string {
			if host := os.Getenv("DB_HOST"); host != "" {
				return host
			}
			return "localhost"
		}(),
		Port: func() int {
			if appConfig.Database.Port == 0 {
				return 5432
			}
			return appConfig.Database.Port
		}(),
		User: func() string {
			if user := os.Getenv("POSTGRES_USER"); user != "" {
				return user
			}
			return appConfig.Database.User
		}(),
		Password:               appConfig.Database.Password,
		AppName:                utils.AppName,
		DatabaseName:           appConfig.Database.Name,
		Logger:                 logger,
		LogLevel:               logLevel,
		MaxOpenConns:           appConfig.Database.MaxOpenConns,
		MaxIdleConns:           appConfig.Database.MaxIdleConns,
		ConnMaxLifetimeMinutes: appConfig.Database.ConnMaxLifetimeMinutes,
	}

	client := apiServer.ConnectToDatabase(toolsMigrations.EmbedFS, entities.Models()...)
	apiServer.Database.Client = client

	settings.SeedDefaultSettings(client, logger)

	var libvipsLogLevel libvips.LogLevel = libvips.LogLevelInfo
	if appConfig.Libvips.MatchSystemLogging {
		switch logLevel {
		case slog.LevelDebug:
			libvipsLogLevel = libvips.LogLevelDebug
		case slog.LevelInfo:
			libvipsLogLevel = libvips.LogLevelInfo
		case slog.LevelWarn:
			libvipsLogLevel = libvips.LogLevelWarning
		case slog.LevelError:
			libvipsLogLevel = libvips.LogLevelError
		default:
			libvipsLogLevel = libvips.LogLevelInfo
		}
	} else {
		// TODO: fix this error message, it sucks and is confusing
		logger.Info("libvipsLogLevel: matching server level is off. using default: info")
	}

	var libvipsLogHandler libvips.LoggingHandlerFunction = func(messageDomain string, messageLevel libvips.LogLevel, message string) {
		switch messageLevel {
		case libvips.LogLevelCritical:
			imalog.Fatal(logger, fmt.Sprintf("%s: %s", messageDomain, message))
		case libvips.LogLevelError:
			logger.Error(fmt.Sprintf("%s: %s", messageDomain, message))
		case libvips.LogLevelWarning:
			logger.Warn(fmt.Sprintf("%s: %s", messageDomain, message))
		case libvips.LogLevelMessage, libvips.LogLevelInfo:
			logger.Info(fmt.Sprintf("%s: %s", messageDomain, message))
		case libvips.LogLevelDebug:
			logger.Debug(fmt.Sprintf("%s: %s", messageDomain, message))
		}
	}

	libvips.SetLogging(libvipsLogHandler, libvipsLogLevel)
	imageops.WarmupAllOps(appConfig.Libvips)

	StorageStatsHolder = images.NewStorageStatsHolder(appConfig.BaseDir)

	// Initialize persistent cache metrics (Redis or file system fallback)
	images.InitCache(appConfig.Queue, appConfig.BaseDir, logger)

	httpServer := apiServer.Launch(router)

	// create a cancelable context used by background tasks
	ctx, globalCancel := context.WithCancel(context.Background())
	defer globalCancel()

	// Start cache stats writer for file-based fallback
	go images.StartCacheStatsWriter(ctx, logger)

	// Start transform cache GC if enabled in config.
	if appConfig.Cache.GCEnabled {
		images.StartTransformCacheGC(ctx, logger, client)
	} else {
		logger.Debug("transform cache gc: disabled by config")
	}

	if appConfig.StorageMetrics.Enabled {
		interval := time.Duration(appConfig.StorageMetrics.IntervalSeconds) * time.Second
		if interval <= 0 {
			interval = 5 * time.Minute
		}

		go StorageStatsHolder.StartStorageStatsWorker(ctx, logger, interval)
	}

	imageWorker := workers.NewImageWorker(client, apiServer.WSBroker)
	xmpWorker := workers.NewXMPWorker(client, apiServer.WSBroker)
	exifWorker := workers.NewExifWorker(client, apiServer.WSBroker)

	// Run the job router in a goroutine so we can wait for shutdown signals here
	go func() {
		jobs.RunJobQueue(appConfig.Queue, logger, imageWorker, xmpWorker, exifWorker)
	}()

	// Start the scheduled job scheduler (cron-based periodic jobs)
	if err := jobs.Start(client, logger, appConfig); err != nil {
		logger.Error("failed to start job scheduler", slog.Any("error", err))
	}

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)
	s := <-sigCh
	logger.Info("shutting down", slog.String("signal", s.String()))

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()

	if httpServer != nil {
		if err := httpServer.Shutdown(shutdownCtx); err != nil {
			logger.Error("server shutdown failed", slog.Any("error", err))
		}
	}

	globalCancel()

	// Save any pending cache stats if file fallback is used
	images.SaveCacheStats(logger)

	if jobs.Router != nil {
		_ = jobs.Router.Close()
	}

	if err := jobs.Shutdown(); err != nil {
		logger.Error("failed to shutdown job scheduler", slog.Any("error", err))
	}

	time.Sleep(500 * time.Millisecond)
	logger.Info("shutdown complete")
}
