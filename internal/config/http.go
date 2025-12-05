package config

import (
	"log/slog"
	"os"
	"strconv"
	"time"

	"gorm.io/gorm"
	
	"imagine/internal/db"
	"imagine/internal/entities"
	libhttp "imagine/internal/http"
	_ "github.com/joho/godotenv/autoload"
)

// cleanupSettingDefaults removes duplicate entries from the setting_defaults table
// to prepare for unique constraints. It keeps the entry with the smallest ID.
func cleanupSettingDefaults(db *gorm.DB, logger *slog.Logger) {
	var duplicates []struct {
		Name  string
		Count int
	}

	// Find names that have more than one entry (including soft-deleted ones)
	db.Unscoped().Model(&entities.SettingDefault{}).
		Select("name, count(*)").
		Group("name").
		Having("count(*) > ?", 1).
		Find(&duplicates)

	if len(duplicates) == 0 {
		logger.Info("no duplicate setting_defaults found, skipping cleanup")
	} else {
		for _, dup := range duplicates {
			logger.Warn("found duplicate setting_default entries, cleaning up...", slog.String("setting_name", dup.Name), slog.Int("count", dup.Count))

			var existingSettings []entities.SettingDefault
			db.Unscoped().Where("name = ?", dup.Name).Order("id ASC").Find(&existingSettings)

			// Keep the first one, delete the rest
			if len(existingSettings) > 1 {
				idsToDelete := make([]uint, 0, len(existingSettings)-1)
				for i := 1; i < len(existingSettings); i++ {
					idsToDelete = append(idsToDelete, existingSettings[i].ID)
				}
				if err := db.Unscoped().Delete(&entities.SettingDefault{}, idsToDelete).Error; err != nil {
					logger.Error("failed to delete duplicate setting_defaults", slog.String("setting_name", dup.Name), slog.Any("error", err))
				} else {
					logger.Info("deleted duplicate setting_defaults", slog.String("setting_name", dup.Name), slog.Int("deleted_count", len(idsToDelete)))
				}
			}
		}
	}
}

// cleanupSettingOverrides removes duplicate entries from the setting_overrides table.
func cleanupSettingOverrides(db *gorm.DB, logger *slog.Logger) {
	var duplicates []struct {
		UserId string
		Name   string
		Count  int
	}

	// Find duplicates based on user_id and name
	db.Unscoped().Model(&entities.SettingOverride{}).
		Select("user_id, name, count(*)").
		Group("user_id, name").
		Having("count(*) > ?", 1).
		Find(&duplicates)

	if len(duplicates) == 0 {
		logger.Info("no duplicate setting_overrides found, skipping cleanup")
		return
	}

	for _, dup := range duplicates {
		logger.Warn("found duplicate setting_override entries, cleaning up...", slog.String("user_id", dup.UserId), slog.String("name", dup.Name), slog.Int("count", dup.Count))

		var existingOverrides []entities.SettingOverride
		db.Unscoped().Where("user_id = ? AND name = ?", dup.UserId, dup.Name).Order("id ASC").Find(&existingOverrides)

		if len(existingOverrides) > 1 {
			idsToDelete := make([]uint, 0, len(existingOverrides)-1)
			for i := 1; i < len(existingOverrides); i++ {
				idsToDelete = append(idsToDelete, existingOverrides[i].ID)
			}
			if err := db.Unscoped().Delete(&entities.SettingOverride{}, idsToDelete).Error; err != nil {
				logger.Error("failed to delete duplicate setting_overrides", slog.String("user_id", dup.UserId), slog.String("name", dup.Name), slog.Any("error", err))
			} else {
				logger.Info("deleted duplicate setting_overrides", slog.String("user_id", dup.UserId), slog.String("name", dup.Name), slog.Int("deleted_count", len(idsToDelete)))
			}
		}
	}
}

type Server struct {
	Port int
	Host string
	Key  string
}

type ImagineServer struct {
	*Server
	Logger   *slog.Logger
	Database *db.DB
	WSBroker *libhttp.WSBroker
	LogLevel slog.Level
}

func (server ImagineServer) ConnectToDatabase(dst ...any) *gorm.DB {
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

	// Run cleanup for setting defaults before auto-migration
	cleanupSettingDefaults(client, logger)
	cleanupSettingOverrides(client, logger)

	logger.Info("Running auto-migration for auth server")
	dbError = client.AutoMigrate(dst...)
	if dbError != nil {
		logger.Error("error running auto-migration", slog.Any("error", dbError))
		panic("error running auto-migration: " + dbError.Error())
	}

	return client
}