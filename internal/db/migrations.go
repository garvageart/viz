package db

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"path/filepath"
	"reflect"
	"runtime"
	"strings"
	"time"

	"gorm.io/gorm"

	"viz/internal/entities"
	"viz/internal/uid"
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
	BackfillCollectionImageCounts,
	MigrateImageKeywords,
	MigrateLegacyWorkerJobs,
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

// MigrateLegacyWorkerJobs migrates the pre-redesign worker_jobs columns into
// the current shape and then drops them. It runs inside the centralized
// backfill transaction, so any failure rolls the whole step back and no data
// is lost. Rows are all-or-nothing by design: if any payload is not a valid
// JSON object, the step fails instead of silently dropping data. Payloads
// are validated one row at a time and each write is applied in small id
// ordered batches, so memory stays bounded regardless of table size.
func MigrateLegacyWorkerJobs(tx *gorm.DB, logger *slog.Logger) error {
	migrator := tx.Migrator()
	if !migrator.HasColumn("worker_jobs", "payload") {
		logger.Info("worker_jobs legacy columns already absent, skipping")
		return nil
	}

	// Refuse to proceed if any payload is not a valid JSON object. Payloads
	// live in a text column, so an SQL cast here could abort the surrounding
	// transaction and make the cause unreadable. Validate in Go instead:
	// a streaming pass over the payloads, no writes happen on this path.
	rows, err := tx.Raw(`SELECT id, payload FROM worker_jobs WHERE payload IS NOT NULL ORDER BY id`).Rows()
	if err != nil {
		return fmt.Errorf("scan worker_jobs payloads: %w", err)
	}

	var invalid []uint
	for rows.Next() {
		var id uint
		var payload string
		if err := rows.Scan(&id, &payload); err != nil {
			_ = rows.Close()
			return fmt.Errorf("read worker_jobs payload: %w", err)
		}

		var probe map[string]json.RawMessage
		if err := json.Unmarshal([]byte(payload), &probe); err != nil || probe == nil {
			invalid = append(invalid, id)
			if len(invalid) >= 10 {
				break
			}
		}
	}
	if err := rows.Err(); err != nil {
		_ = rows.Close()
		return fmt.Errorf("scan worker_jobs payloads: %w", err)
	}
	_ = rows.Close()
	if len(invalid) > 0 {
		return fmt.Errorf("worker_jobs contains payloads that are not JSON objects (offending ids %v); aborting migration, no data changed", invalid)
	}

	// runBackfillBatch applies one worker_jobs backfill step in small
	// id-ordered batches instead of a single statement over the whole table,
	// keeping memory and lock time bounded regardless of table size. Each
	// batch is selected by id under the same predicate the apply function
	// clears, so the loop terminates once no rows match.
	runBackfillBatch := func(step string, predicate string, apply func(tx *gorm.DB, ids []uint) (int64, error)) error {
		const batchSize = 1000
		var total int64
		for batch := 1; ; batch++ {
			var ids []uint
			query := fmt.Sprintf(`SELECT id FROM worker_jobs WHERE %s ORDER BY id LIMIT %d`, predicate, batchSize)
			if err := tx.Raw(query).Scan(&ids).Error; err != nil {
				return fmt.Errorf("select worker_jobs ids for %s: %w", step, err)
			}

			if len(ids) == 0 {
				break
			}

			updated, err := apply(tx, ids)
			if err != nil {
				return fmt.Errorf("apply worker_jobs %s batch %d: %w", step, batch, err)
			}

			if updated == 0 {
				return fmt.Errorf("worker_jobs %s batch %d selected %d rows but updated none; stopping to avoid an infinite loop", step, batch, len(ids))
			}

			total += updated
			logger.Info("worker_jobs backfill batch applied",
				slog.String("step", step),
				slog.Int("batch", batch),
				slog.Int64("rows_total", total),
			)
		}

		logger.Info("worker_jobs backfill step complete", slog.String("step", step), slog.Int64("rows", total))
		return nil
	}

	if err := runBackfillBatch("type remap",
		`type IN ('image_process', 'exif_process', 'xmp_generation')`,
		func(tx *gorm.DB, ids []uint) (int64, error) {
			res := tx.Exec(`UPDATE worker_jobs
				SET type = CASE type
					WHEN 'image_process' THEN 'ImageProcess'
					WHEN 'exif_process' THEN 'ExifProcess'
					WHEN 'xmp_generation' THEN 'XmpGeneration'
					ELSE type
				END
				WHERE id IN ?`, ids)
			return res.RowsAffected, res.Error
		}); err != nil {
		return err
	}

	// Move the enqueued timestamp into created_at, verbatim. Once it lives in
	// created_at it is the correct value: the moment the job was enqueued is
	// the job's creation time. The original created_at (row insert time) is
	// superseded intentionally. Must run before enqueued_at is dropped.
	// 
	// This code reads terribly. Don't mind it pls.
	if err := runBackfillBatch("enqueued_at to created_at",
		`enqueued_at IS NOT NULL AND created_at IS DISTINCT FROM enqueued_at`,
		func(tx *gorm.DB, ids []uint) (int64, error) {
			res := tx.Exec(`UPDATE worker_jobs SET created_at = enqueued_at WHERE id IN ?`, ids)
			return res.RowsAffected, res.Error
		}); err != nil {
		return err
	}

	if err := runBackfillBatch("payload copy",
		`data IS NULL AND payload IS NOT NULL`,
		func(tx *gorm.DB, ids []uint) (int64, error) {
			res := tx.Exec(`UPDATE worker_jobs SET data = payload::jsonb WHERE id IN ?`, ids)
			return res.RowsAffected, res.Error
		}); err != nil {
		return err
	}

	if err := runBackfillBatch("error migration",
		`error IS NULL AND (error_code IS NOT NULL OR error_msg IS NOT NULL)`,
		func(tx *gorm.DB, ids []uint) (int64, error) {
			res := tx.Exec(`UPDATE worker_jobs
				SET error = jsonb_build_object(
					'code', COALESCE(NULLIF(error_code, ''), 'worker_error'),
					'message', COALESCE(NULLIF(error_msg, ''), 'Unknown error')
				)
				WHERE id IN ?`, ids)
			return res.RowsAffected, res.Error
		}); err != nil {
		return err
	}

	dropped := tx.Exec(`ALTER TABLE worker_jobs
		DROP COLUMN IF EXISTS topic,
		DROP COLUMN IF EXISTS command,
		DROP COLUMN IF EXISTS payload,
		DROP COLUMN IF EXISTS image_uid,
		DROP COLUMN IF EXISTS error_code,
		DROP COLUMN IF EXISTS error_msg,
		DROP COLUMN IF EXISTS enqueued_at`)
	if dropped.Error != nil {
		return fmt.Errorf("drop legacy worker_jobs columns: %w", dropped.Error)
	}

	logger.Info("worker_jobs legacy columns migrated and dropped")
	return nil
}

// MigrateCollectionImages moves data from the old JSONB 'images' column in 'collections'
// to the new 'collection_images' join table.
func MigrateCollectionImages(tx *gorm.DB, logger *slog.Logger) error {
	migrator := tx.Migrator()

	hasImagesCol := false
	if cols, err := migrator.ColumnTypes("collections"); err == nil {
		for _, col := range cols {
			if col.Name() == "images" {
				hasImagesCol = true
				break
			}
		}
	}

	// If the 'images' column exists in 'collections', we need to migrate it.
	if !hasImagesCol {
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
		WHERE (original_file_name IS NULL OR original_file_name = '')
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

// BackfillCollectionImageCounts recalculates and updates image_count for all collections in batches based on active images.
func BackfillCollectionImageCounts(tx *gorm.DB, logger *slog.Logger) error {
	logger.Info("Backfilling collection image counts in batches...")

	var collections []entities.Collection
	batchSize := 200
	totalUpdated := 0

	err := tx.Model(&entities.Collection{}).
		FindInBatches(&collections, batchSize, func(batchTx *gorm.DB, batch int) error {
			for _, coll := range collections {
				var activeCount int64
				subquery := batchTx.Model(&entities.CollectionImage{}).Select("uid").Where("collection_id = ?", coll.ID)
				if err := batchTx.Model(&entities.ImageAsset{}).Where("uid IN (?)", subquery).Count(&activeCount).Error; err != nil {
					logger.Error("Failed to count active images for collection", slog.String("uid", coll.Uid), slog.Any("error", err))
					return err
				}

				if coll.ImageCount != int(activeCount) {
					logger.Info("Updating collection image count", slog.String("name", coll.Name), slog.String("uid", coll.Uid))
					coll.ImageCount = int(activeCount)
					if err := batchTx.Save(&coll).Error; err != nil {
						logger.Error("Failed to update collection image count", slog.String("uid", coll.Uid), slog.Any("error", err))
						return err
					}
					totalUpdated++
				}
			}

			return nil
		}).Error

	if err != nil {
		logger.Error("Failed to backfill collection image counts", slog.Any("error", err))
		return err
	}

	logger.Info("Successfully backfilled collection image counts", slog.Int("updated", totalUpdated))
	return nil
}

// RecoverImageNameExtensions restores file extensions to image names from original_file_name.
func RecoverImageNameExtensions(tx *gorm.DB, logger *slog.Logger) error {
	logger.Info("Recovering file extensions for image names from original_file_name...")

	var images []struct {
		Uid              string `gorm:"column:uid"`
		Name             string `gorm:"column:name"`
		OriginalFileName string `gorm:"column:original_file_name"`
	}

	if err := tx.Model(&entities.ImageAsset{}).
		Select("uid, name, original_file_name").
		Where("original_file_name IS NOT NULL AND original_file_name != '' AND deleted_at IS NULL").
		Scan(&images).Error; err != nil {
		logger.Error("Failed to query images for extension recovery", slog.Any("error", err))
		return err
	}

	updatedCount := 0
	for _, img := range images {
		ext := filepath.Ext(img.OriginalFileName)
		if ext == "" {
			continue
		}

		if filepath.Ext(img.Name) != "" || strings.HasSuffix(strings.ToLower(img.Name), strings.ToLower(ext)) {
			continue
		}

		recoveredName := img.Name + ext
		if err := tx.Model(&entities.ImageAsset{}).Where("uid = ?", img.Uid).Update("name", recoveredName).Error; err != nil {
			logger.Error("Failed to update recovered image name", slog.String("uid", img.Uid), slog.Any("error", err))
			return err
		}

		updatedCount++
	}

	if updatedCount > 0 {
		logger.Info("Recovered extensions for existing image names", slog.Int("count", updatedCount))
	}

	return nil
}

// MigrateImageKeywords moves legacy keywords from image_metadata JSON
// to the keywords table and image_keywords many-to-many join table.
func MigrateImageKeywords(tx *gorm.DB, logger *slog.Logger) error {
	logger.Info("Starting migration of image keywords from image_metadata to keywords table...")

	keywordCache := make(map[string]entities.Keyword)
	const batchSize = 100
	var images []entities.ImageAsset

	err := tx.Model(&entities.ImageAsset{}).
		Preload("Keywords").
		FindInBatches(&images, batchSize, func(batchTx *gorm.DB, batch int) error {
			for i := range images {
				img := &images[i]

				var rawMeta []byte
				row := batchTx.Table("images").Where("id = ?", img.ID).Select("image_metadata").Row()
				if err := row.Scan(&rawMeta); err != nil || len(rawMeta) == 0 {
					continue
				}

				var meta struct {
					Keywords []string `json:"keywords"`
				}
				if err := json.Unmarshal(rawMeta, &meta); err != nil || len(meta.Keywords) == 0 {
					continue
				}

				var kwsToAssociate []entities.Keyword
				for _, kwName := range meta.Keywords {
					kwName = strings.TrimSpace(kwName)
					if kwName == "" {
						continue
					}

					kw, found := keywordCache[kwName]
					if !found {
						var existing entities.Keyword
						if err := batchTx.Where("name = ?", kwName).First(&existing).Error; err != nil {
							newKw := entities.Keyword{
								Uid:  uid.MustGenerate(),
								Name: kwName,
							}
							if err := batchTx.Create(&newKw).Error; err != nil {
								logger.Error("Failed to create keyword", slog.String("name", kwName), slog.Any("error", err))
								return err
							}
							kw = newKw
						} else {
							kw = existing
						}
						keywordCache[kwName] = kw
					}

					kwsToAssociate = append(kwsToAssociate, kw)
				}

				if len(kwsToAssociate) > 0 {
					img.Keywords = kwsToAssociate
					if err := batchTx.Model(img).Association("Keywords").Append(&kwsToAssociate); err != nil {
						logger.Error("Failed to associate keywords with image", slog.String("image_uid", img.Uid), slog.Any("error", err))
						return err
					}
				}
			}
			return nil
		}).Error

	if err != nil {
		logger.Error("Failed to migrate image keywords in batches", slog.Any("error", err))
		return err
	}

	logger.Info("Completed image keywords migration successfully")
	return nil
}
