package db

import (
	"context"
	"log/slog"

	"gorm.io/gorm"
)

// DB wraps a GORM client with connection metadata and pool configuration.
// Connection pool limits (MaxOpenConns, MaxIdleConns, ConnMaxLifetimeMinutes)
// are read from viz.json under the "database" key and applied via sql.DB
// setters in Connect(). Defaults (25 / 25 / 5 min) are set in config.go.
// See docs/architecture/IMAGE_PROCESSING_MEMORY.md for rationale.
type DB struct {
	Address         string
	Protocol        string
	Port            int
	User            string
	Password        string
	DatabaseName    string
	Client          *gorm.DB
	AppName         string
	TableNameString string
	Table           *gorm.DB
	Context         context.Context
	Logger          *slog.Logger
	LogLevel        slog.Level

	// Connection pool limits — configurable in viz.json (database block).
	// Applied in Connect() via sql.DB.SetMaxOpenConns / SetMaxIdleConns /
	// SetConnMaxLifetime. Zero values fall back to the Go sql.DB defaults
	// (unlimited open, 2 idle, no lifetime cap), so always provide explicit
	// values from config.go defaults.
	MaxOpenConns           int
	MaxIdleConns           int
	ConnMaxLifetimeMinutes int
}
