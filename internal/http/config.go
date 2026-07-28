package http

import (
	"log/slog"
	"viz/internal/config"
	"viz/internal/db"
)

type Server struct {
	*config.ServerConfig
	Logger   *slog.Logger
	Database *db.DB
	WSBroker *WSBroker
	LogLevel slog.Level
}
