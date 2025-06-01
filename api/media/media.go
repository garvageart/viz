package main

***REMOVED***
***REMOVED***
***REMOVED***
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/render"
***REMOVED***

	gcp "imagine/common/gcp/storage"
	libhttp "imagine/common/http"

***REMOVED***
***REMOVED***

type ImagineMediaServer struct {
	*libhttp.ImagineServer
***REMOVED***

func (server ImagineMediaServer***REMOVED*** setupImageRouter(***REMOVED*** *chi.Mux {
	imageRouter := chi.NewRouter(***REMOVED***
	logger := server.Logger

	gcsContext, gcsContextCancel := context.WithCancel(context.Background(***REMOVED******REMOVED***
	defer gcsContextCancel(***REMOVED***

	storageClient, err := gcp.SetupClient(gcsContext***REMOVED***
***REMOVED***
		panic("Failed to setup GCP Storage client" + err.Error(***REMOVED******REMOVED***
***REMOVED***

	imageRouter.Get("/download", func(res http.ResponseWriter, req *http.Request***REMOVED*** {
		res.WriteHeader(http.StatusNotImplemented***REMOVED***
		res.Header(***REMOVED***.Add("Content-Type", "text/plain"***REMOVED***
		res.Write([]byte("not implemented"***REMOVED******REMOVED***
***REMOVED******REMOVED***

	imageRouter.Get("/upload", func(res http.ResponseWriter, req *http.Request***REMOVED*** {
		res.WriteHeader(http.StatusNotImplemented***REMOVED***
		res.Header(***REMOVED***.Add("Content-Type", "text/plain"***REMOVED***
		res.Write([]byte("not implemented"***REMOVED******REMOVED***
***REMOVED******REMOVED***

	return imageRouter
***REMOVED***

func (server ImagineMediaServer***REMOVED*** Launch(router *chi.Mux***REMOVED*** {
	imageRouter := server.setupImageRouter(***REMOVED***
	logger := server.Logger

	correctLogger := slog.NewLogLogger(logger.Handler(***REMOVED***, slog.LevelDebug***REMOVED***

	router.Use(middleware.RequestLogger(&middleware.DefaultLogFormatter{
		Logger: correctLogger,
***REMOVED******REMOVED******REMOVED***

	router.Use(middleware.AllowContentEncoding("deflate", "gzip"***REMOVED******REMOVED***
	router.Use(middleware.RequestID***REMOVED***

	// Mount image router to main router
	router.Mount("/image", imageRouter***REMOVED***

	router.Get("/ping", func(res http.ResponseWriter, req *http.Request***REMOVED*** {
		jsonResponse := map[string]any{"message": "You have been PONGED by the media server. Hey... pssht kid. You want some media? 📸"***REMOVED***
		render.JSON(res, req, jsonResponse***REMOVED***
***REMOVED******REMOVED***

	address := fmt.Sprintf("%s:%d", server.Host, server.Port***REMOVED***

	logger.Info(fmt.Sprintf("Starting server at address: %s", address***REMOVED******REMOVED***
	err := http.ListenAndServe(address, router***REMOVED***

***REMOVED***
		logger.Error(fmt.Sprintf("failed to start server: %s", err***REMOVED******REMOVED***
***REMOVED***
***REMOVED***

func main(***REMOVED*** {
	key := "media-server"
	router := chi.NewRouter(***REMOVED***
	logger := libhttp.SetupChiLogger(key***REMOVED***

	var host string
	if utils.IsProduction {
		host = "0.0.0.0"
***REMOVED*** else {
		host = "localhost"
***REMOVED***

	var server = &ImagineMediaServer{
		ImagineServer: &libhttp.ImagineServer{
			Host:   host,
			Key:    key,
			Logger: logger,
***REMOVED***
***REMOVED***

	config, err := server.ReadConfig(key***REMOVED***
***REMOVED***
		panic("Unable to read config file"***REMOVED***
***REMOVED***

	portValue, found := config["port"]

	if !found {
		panic("Can't find port value"***REMOVED***
***REMOVED*** else {
		// This is fucking weird
		port, ok := portValue.(float64***REMOVED***

		if !ok {
			panic("port is not an float64"***REMOVED***
	***REMOVED***

		server.Port = int(port***REMOVED***
		server.Launch(router***REMOVED***
***REMOVED***
***REMOVED***
