package db

import (
	"log/slog"

	"gorm.io/gorm"
)

// MigrateUsersTable handles manual migrations for the users table.
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

				// We'll use a raw query to insert into the new table to avoid entity dependency issues during migration
				// The new table 'collection_images' should have been created by AutoMigrate already
				// but we'll be safe.

				/*
				   The JSON structure was []dto.CollectionImage:
				   [{"uid": "...", "added_at": "...", "added_by": {...}}]
				*/

				// Instead of complex JSON parsing in Go, we can use Postgres JSON functions if we want,
				// but let's do it in Go for better cross-DB compatibility (though we are mostly Postgres).

				// Actually, since we're using GORM's JSON serializer usually, we can just use a slice of maps or a temp struct.
				// But wait, the easiest way is to just let Postgres do it if it's Postgres.

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
