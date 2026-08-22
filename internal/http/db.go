package http

import (
	"log/slog"
	"os"
	"strconv"
	"time"
	"viz/internal/db"
	"viz/internal/settings"

	"gorm.io/gorm"
)

func (server Server) ConnectToDatabase(dst ...any) *gorm.DB {
	logger := server.Logger
	database := server.Database

	timeoutSeconds := 60
	if v := os.Getenv("DB_CONNECT_TIMEOUT"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			timeoutSeconds = parsed
		}
	}

	start := time.Now()
	var client *gorm.DB
	var dbError error
	for {
		client, dbError = database.Connect()
		if dbError == nil {
			break
		}

		logger.Error("error connecting to postgres, will retry", slog.Any("error", dbError))

		if time.Since(start) > time.Duration(timeoutSeconds)*time.Second {
			logger.Error("timed out waiting for database to become available", slog.Int("timeout_seconds", timeoutSeconds))
			panic("timed out waiting for database to become available")
		}

		time.Sleep(2 * time.Second)
	}

	// Manual migrations before AutoMigrate
	db.MigrateUsersTable(client, logger)

	dbError = client.AutoMigrate(dst...)
	if dbError != nil {
		logger.Error("error running auto-migration", slog.Any("error", dbError))
		panic("error running auto-migration: " + dbError.Error())
	}

	// Warm up GORM schema cache to prevent concurrent schema parsing race conditions/panics under load.
	// Because GORM publishes schemas to its shared cache before completing relation and serializer parsing
	// (to handle self-referencing models), concurrent queries/updates under high load can fetch partially
	// initialized schemas. This leads to map read/write data races where LookUpField returns nil for valid columns,
	// causing nil pointer dereferences (specifically callbacks/update.go:238 where field.AutoUpdateTime is dereferenced).
	// Warming up the schemas sequentially on startup ensures the cache is fully populated and read-only before concurrent handlers run.
	// See: https://github.com/go-gorm/gorm/issues/7539
	for _, model := range dst {
		stmt := &gorm.Statement{DB: client}
		if err := stmt.Parse(model); err != nil {
			logger.Warn("Failed to warm up GORM schema cache for model", slog.Any("model", model), slog.Any("error", err))
		}
	}

	if err := db.RunGooseMigrations(client, logger); err != nil {
		logger.Error("error running Goose migrations", slog.Any("error", err))
		panic("error running Goose migrations: " + err.Error())
	}

	// Run centralized data backfills in transaction
	if err := db.RunBackfills(client, logger); err != nil {
		logger.Error("error running database backfills", slog.Any("error", err))
		panic("error running database backfills: " + err.Error())
	}

	// Run cleanup for setting defaults after auto-migration
	settings.CleanupSettingDefaults(client, logger)
	settings.CleanupSettingOverrides(client, logger)

	// Seed default settings after migration
	settings.SeedDefaultSettings(client, logger)

	return client
}
