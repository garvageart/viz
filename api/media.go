package main

***REMOVED***
***REMOVED***
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/render"

***REMOVED***

	libhttp "imagine/common/http"
***REMOVED***

type ImagineMediaServer struct {
	*libhttp.ImagineServer
***REMOVED***

func setupImageRouter(***REMOVED*** *chi.Mux {
	imageRouter := chi.NewRouter(***REMOVED***

	imageRouter.Get("/download", func(res http.ResponseWriter, req *http.Request***REMOVED*** {
		panic("not implemented"***REMOVED***
***REMOVED******REMOVED***

	imageRouter.Get("/upload", func(res http.ResponseWriter, req *http.Request***REMOVED*** {
		panic("not implemented"***REMOVED***
***REMOVED******REMOVED***

	return imageRouter
***REMOVED***

func (server ImagineMediaServer***REMOVED*** Launch(router *chi.Mux***REMOVED*** {
	imageRouter := setupImageRouter(***REMOVED***

	logger := libhttp.SetupChiLogger(***REMOVED***
	correctLogger := slog.NewLogLogger(logger.Handler(***REMOVED***, slog.LevelDebug***REMOVED***

	router.Use(middleware.RequestLogger(&middleware.DefaultLogFormatter{
		Logger: correctLogger,
***REMOVED******REMOVED******REMOVED***

	router.Use(middleware.AllowContentEncoding("deflate", "gzip"***REMOVED******REMOVED***
	router.Use(middleware.RequestID***REMOVED***

	// Mount image router to main router
	router.Mount("/image", imageRouter***REMOVED***

	router.Get("/ping", func(res http.ResponseWriter, req *http.Request***REMOVED*** {
		jsonResponse := map[string]any{"message": "pong"***REMOVED***
		render.JSON(res, req, jsonResponse***REMOVED***
***REMOVED******REMOVED***

	logger.Info(fmt.Sprint("Starting server on port ", server.Port***REMOVED******REMOVED***
	err := http.ListenAndServe(server.Host+":"+fmt.Sprint(server.Port***REMOVED***, router***REMOVED***

***REMOVED***
		logger.Error(fmt.Sprintf("failed to start server: %s", err***REMOVED******REMOVED***
***REMOVED***
***REMOVED***

func main(***REMOVED*** {
	router := chi.NewRouter(***REMOVED***
	var server = &ImagineMediaServer{
		ImagineServer: &libhttp.ImagineServer{
			Host: "localhost",
			Key:  "media-server",
***REMOVED***
***REMOVED***

	config, err := server.ReadConfig(server.Key***REMOVED***
***REMOVED***
		panic("Unable to read config file"***REMOVED***
***REMOVED***

	server.Port = config.GetInt(fmt.Sprintf("servers.%s.port", server.Key***REMOVED******REMOVED***
	server.Launch(router***REMOVED***
***REMOVED***
