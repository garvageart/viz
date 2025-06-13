package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/render"

	gcp "imagine/common/gcp/storage"
	libhttp "imagine/common/http"
)

const (
	serverKey = "media-server"
)

type ImagineMediaServer struct {
	*libhttp.ImagineServer
}

func (server ImagineMediaServer) setupImageRouter() *chi.Mux {
	imageRouter := chi.NewRouter()
	logger := server.Logger

	gcsContext, gcsContextCancel := context.WithCancel(context.Background())
	defer gcsContextCancel()

	storageClient, err := gcp.SetupClient(gcsContext)
	if err != nil {
		panic("Failed to setup GCP Storage client" + err.Error())
	}

	imageRouter.Get("/download", func(res http.ResponseWriter, req *http.Request) {
		res.WriteHeader(http.StatusNotImplemented)
		res.Header().Add("Content-Type", "text/plain")
		res.Write([]byte("not implemented"))
	})

	imageRouter.Get("/upload", func(res http.ResponseWriter, req *http.Request) {
		res.WriteHeader(http.StatusNotImplemented)
		res.Header().Add("Content-Type", "text/plain")
		res.Write([]byte("not implemented"))
	})

	return imageRouter
}

func (server ImagineMediaServer) Launch(router *chi.Mux) {
	imageRouter := server.setupImageRouter()
	logger := server.Logger

	correctLogger := slog.NewLogLogger(logger.Handler(), slog.LevelDebug)

	router.Use(middleware.RequestLogger(&middleware.DefaultLogFormatter{
		Logger: correctLogger,
	}))

	router.Use(middleware.AllowContentEncoding("deflate", "gzip"))
	router.Use(middleware.RequestID)

	// Mount image router to main router
	router.Mount("/image", imageRouter)

	router.Get("/ping", func(res http.ResponseWriter, req *http.Request) {
		jsonResponse := map[string]any{"message": "pong"}
		render.JSON(res, req, jsonResponse)
	})

	address := fmt.Sprintf("%s:%d", server.Host, server.Port)

	logger.Info(fmt.Sprintf("Hey, you want some pics? 👀 - %s: %s", serverKey, address))
	err := http.ListenAndServe(address, router)
	if err != nil {
		errMsg := fmt.Sprintf("failed to start server: %s", err)
		logger.Error(errMsg)
		panic(errMsg)
	}
}

func main() {
	router := chi.NewRouter()
	logger := libhttp.SetupChiLogger(serverKey)

	server := ImagineMediaServer{ImagineServer: libhttp.ImagineServers[serverKey]}
	server.ImagineServer.Logger = logger

	server.Launch(router)
}
