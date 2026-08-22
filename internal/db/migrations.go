package db

import (
	"log/slog"
	"path/filepath"
	"strings"

	"gorm.io/gorm"

	"viz/internal/entities"
)

// RunBackfills executes all data backfills and post-migration data transformations sequentially.
func RunBackfills(client *gorm.DB, logger *slog.Logger) {
	logger.Info("Running database backfills and data migrations...")

	MigrateCollectionImages(client, logger)
	BackfillOwnership(client, logger)
	BackfillOriginalFileName(client, logger)
	TrimImageNameExtensions(client, logger)

	logger.Info("Database backfills and data migrations completed.")
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
func MigrateCollectionImages(db *gorm.DB, logger *slog.Logger) {
	migrator := db.Migrator()

	// If the 'images' column exists in 'collections', we need to migrate it.
	if migrator.HasColumn("collections", "images") {
		logger.Info("Starting migration of collection images from JSONB to join table")

		type OldCollection struct {
			ID     uint
			Images []byte `gorm:"type:jsonb"`
		}

		var collections []OldCollection
		if err := db.Table("collections").Select("id", "images").Find(&collections).Error; err != nil {
			logger.Error("Failed to fetch old collections for migration", slog.Any("error", err))
			return
		}

		err := db.Transaction(func(tx *gorm.DB) error {
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
					return err
				}
			}

			// Rename the old column to avoid confusion
			logger.Info("Renaming 'collections.images' to 'collections.images_old'")
			return tx.Migrator().RenameColumn("collections", "images", "images_old")
		})

		if err != nil {
			logger.Error("Failed to migrate collection images", slog.Any("error", err))
		} else {
			logger.Info("Successfully migrated collection images")
		}
	}
}

// BackfillOwnership ensures owner_id is set on image assets and collections.
func BackfillOwnership(client *gorm.DB, logger *slog.Logger) {
	logger.Info("Backfilling ownership for images and collections...")

	if err := client.Model(&entities.ImageAsset{}).Exec("UPDATE images SET owner_id = uploaded_by_id WHERE owner_id IS NULL AND uploaded_by_id IS NOT NULL").Error; err != nil {
		logger.Error("Failed to backfill image ownership", slog.Any("error", err))
	}

	if err := client.Model(&entities.Collection{}).Exec("UPDATE collections SET owner_id = created_by_id WHERE owner_id IS NULL AND created_by_id IS NOT NULL").Error; err != nil {
		logger.Error("Failed to backfill collection ownership", slog.Any("error", err))
	}
}

// BackfillOriginalFileName copies the original file name from image_metadata to the new dedicated original_file_name column.
func BackfillOriginalFileName(client *gorm.DB, logger *slog.Logger) {
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
	if err := client.Exec(query).Error; err != nil {
		logger.Error("Failed to backfill original_file_name", slog.Any("error", err))
	}
}

// TrimImageNameExtensions strips file extensions from existing image names.
func TrimImageNameExtensions(client *gorm.DB, logger *slog.Logger) {
	logger.Info("Trimming file extensions from existing image names...")

	var images []struct {
		Uid  string `gorm:"column:uid"`
		Name string `gorm:"column:name"`
	}

	if err := client.Model(&entities.ImageAsset{}).Select("uid, name").Where("name LIKE '%.%' AND deleted_at IS NULL").Scan(&images).Error; err != nil {
		logger.Error("Failed to query images for extension trimming", slog.Any("error", err))
		return
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

		if err := client.Model(&entities.ImageAsset{}).Where("uid = ?", img.Uid).Update("name", trimmed).Error; err != nil {
			logger.Error("Failed to update image name", slog.String("uid", img.Uid), slog.Any("error", err))
			continue
		}

		updatedCount++
	}

	if updatedCount > 0 {
		logger.Info("Trimmed extensions from existing image names", slog.Int("count", updatedCount))
	}
}
