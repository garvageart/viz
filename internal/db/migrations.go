package db

import (
	"fmt"
	"log/slog"
	"path/filepath"
	"reflect"
	"runtime"
	"strings"
	"time"

	"gorm.io/gorm"

	"viz/internal/entities"
)

// BackfillRecord tracks executed database backfills to ensure run-once semantics.
type BackfillRecord struct {
	Name      string    `gorm:"primaryKey;column:name"`
	AppliedAt time.Time `gorm:"column:applied_at"`
}

func (BackfillRecord) TableName() string {
	return "db_backfills"
}

// BackfillFn is the signature for all transactional database backfills.
type BackfillFn func(tx *gorm.DB, logger *slog.Logger) error

func getFunctionName(fn BackfillFn) string {
	fullName := runtime.FuncForPC(reflect.ValueOf(fn).Pointer()).Name()
	parts := strings.Split(fullName, ".")
	return parts[len(parts)-1]
}

// DefaultBackfills contains all registered backfills in sequential execution order.
var DefaultBackfills = []BackfillFn{
	MigrateCollectionImages,
	BackfillOwnership,
	BackfillOriginalFileName,
	TrimImageNameExtensions,
}

// RunBackfills executes all data backfills and post-migration data transformations sequentially inside a transaction.
func RunBackfills(client *gorm.DB, logger *slog.Logger) error {
	return RunBackfillSteps(client, logger, DefaultBackfills)
}

// RunBackfillSteps runs the given backfill functions with run-once tracking inside a transaction.
func RunBackfillSteps(client *gorm.DB, logger *slog.Logger, backfills []BackfillFn) error {
	logger.Info("Running database backfills and data migrations inside transaction...")

	err := client.Transaction(func(tx *gorm.DB) error {
		if err := tx.AutoMigrate(&BackfillRecord{}); err != nil {
			return fmt.Errorf("failed to auto-migrate backfill tracking table: %w", err)
		}

		var records []BackfillRecord
		if err := tx.Find(&records).Error; err != nil {
			return fmt.Errorf("failed to query applied backfills: %w", err)
		}

		applied := make(map[string]bool, len(records))
		for _, r := range records {
			applied[r.Name] = true
		}

		for _, fn := range backfills {
			name := getFunctionName(fn)
			if applied[name] {
				logger.Debug("Backfill already applied, skipping", slog.String("step", name))
				continue
			}

			logger.Info("Executing backfill step", slog.String("step", name))
			if err := fn(tx, logger); err != nil {
				logger.Error("Backfill step failed", slog.String("step", name), slog.Any("error", err))
				return fmt.Errorf("backfill step %s: %w", name, err)
			}

			if err := tx.Create(&BackfillRecord{Name: name, AppliedAt: time.Now()}).Error; err != nil {
				logger.Error("Failed to record backfill completion", slog.String("step", name), slog.Any("error", err))
				return fmt.Errorf("failed to record backfill step %s: %w", name, err)
			}
		}

		return nil
	})

	if err != nil {
		logger.Error("Database backfills failed, transaction rolled back", slog.Any("error", err))
		return err
	}

	logger.Info("Database backfills and data migrations completed successfully.")
	return nil
}

// MigrateUsersTable handles manual pre-migration adjustments for the users table.
func MigrateUsersTable(db *gorm.DB, logger *slog.Logger) {
	migrator := db.Migrator()

	// Check if 'username' column exists and 'name' does not
	if migrator.HasColumn("users", "username") && !migrator.HasColumn("users", "name") {
		logger.Info("Renaming users.username to users.name")
		if err := migrator.RenameColumn("users", "username", "name"); err != nil {
			logger.Error("Failed to rename users.username to users.name", slog.Any("error", err))
		}
	}
}

// MigrateCollectionImages moves data from the old JSONB 'images' column in 'collections'
// to the new 'collection_images' join table.
func MigrateCollectionImages(tx *gorm.DB, logger *slog.Logger) error {
	migrator := tx.Migrator()

	// If the 'images' column exists in 'collections', we need to migrate it.
	if !migrator.HasColumn("collections", "images") {
		return nil
	}

	logger.Info("Starting migration of collection images from JSONB to join table")

	type OldCollection struct {
		ID     uint
		Images []byte `gorm:"type:jsonb"`
	}

	var collections []OldCollection
	if err := tx.Table("collections").Select("id", "images").Find(&collections).Error; err != nil {
		logger.Error("Failed to fetch old collections for migration", slog.Any("error", err))
		return err
	}

	for _, col := range collections {
		if len(col.Images) == 0 || string(col.Images) == "null" || string(col.Images) == "[]" {
			continue
		}

		query := `
			INSERT INTO collection_images (collection_id, uid, added_at, added_by_id, created_at, updated_at)
			SELECT ?, (obj->>'uid'), (obj->>'added_at')::timestamp, (obj->'added_by'->>'uid'), NOW(), NOW()
			FROM jsonb_array_elements(?) AS obj
			ON CONFLICT DO NOTHING
		`
		if err := tx.Exec(query, col.ID, col.Images).Error; err != nil {
			logger.Error("Failed to insert collection images from JSONB", slog.Any("error", err))
			return err
		}
	}

	// Rename the old column to avoid confusion
	logger.Info("Renaming 'collections.images' to 'collections.images_old'")
	if err := tx.Migrator().RenameColumn("collections", "images", "images_old"); err != nil {
		logger.Error("Failed to rename collections.images to collections.images_old", slog.Any("error", err))
		return err
	}

	logger.Info("Successfully migrated collection images")
	return nil
}

// BackfillOwnership ensures owner_id is set on image assets and collections.
func BackfillOwnership(tx *gorm.DB, logger *slog.Logger) error {
	logger.Info("Backfilling ownership for images and collections...")

	if err := tx.Model(&entities.ImageAsset{}).Exec("UPDATE images SET owner_id = uploaded_by_id WHERE owner_id IS NULL AND uploaded_by_id IS NOT NULL").Error; err != nil {
		logger.Error("Failed to backfill image ownership", slog.Any("error", err))
		return err
	}

	if err := tx.Model(&entities.Collection{}).Exec("UPDATE collections SET owner_id = created_by_id WHERE owner_id IS NULL AND created_by_id IS NOT NULL").Error; err != nil {
		logger.Error("Failed to backfill collection ownership", slog.Any("error", err))
		return err
	}

	return nil
}

// BackfillOriginalFileName copies the original file name from image_metadata to the new dedicated original_file_name column.
func BackfillOriginalFileName(tx *gorm.DB, logger *slog.Logger) error {
	logger.Info("Backfilling original_file_name from image_metadata...")

	query := `
		UPDATE images
		SET original_file_name = COALESCE(
			image_metadata->>'original_file_name',
			image_metadata->>'file_name'
		)
		WHERE original_file_name IS NULL
		  AND image_metadata IS NOT NULL
		  AND (
			  image_metadata->>'original_file_name' IS NOT NULL
			  OR image_metadata->>'file_name' IS NOT NULL
		  )
	`
	if err := tx.Exec(query).Error; err != nil {
		logger.Error("Failed to backfill original_file_name", slog.Any("error", err))
		return err
	}

	return nil
}

// TrimImageNameExtensions strips file extensions from existing image names.
func TrimImageNameExtensions(tx *gorm.DB, logger *slog.Logger) error {
	logger.Info("Trimming file extensions from existing image names...")

	var images []struct {
		Uid  string `gorm:"column:uid"`
		Name string `gorm:"column:name"`
	}

	if err := tx.Model(&entities.ImageAsset{}).Select("uid, name").Where("name LIKE '%.%' AND deleted_at IS NULL").Scan(&images).Error; err != nil {
		logger.Error("Failed to query images for extension trimming", slog.Any("error", err))
		return err
	}

	updatedCount := 0
	for _, img := range images {
		ext := filepath.Ext(img.Name)
		if ext == "" {
			continue
		}

		trimmed := strings.TrimSuffix(img.Name, ext)
		if trimmed == "" || trimmed == img.Name {
			continue
		}

		if err := tx.Model(&entities.ImageAsset{}).Where("uid = ?", img.Uid).Update("name", trimmed).Error; err != nil {
			logger.Error("Failed to update image name", slog.String("uid", img.Uid), slog.Any("error", err))
			return err
		}

		updatedCount++
	}

	if updatedCount > 0 {
		logger.Info("Trimmed extensions from existing image names", slog.Int("count", updatedCount))
	}

	return nil
}
