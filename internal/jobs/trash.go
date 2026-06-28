package jobs

import (
	"log/slog"
	"os"
	"path/filepath"
	"time"

	"gorm.io/gorm"

	"viz/internal/config"
	"viz/internal/entities"
)

// batchSize is the number of expired image records to process per batch when
// purging trash. Processing in batches prevents loading millions of records
// into memory at once.
const trashBatchSize = 1000

// PurgeExpiredTrash permanently deletes image records and their trash directory
// for images whose soft-delete timestamp (deleted_at) exceeds the configured
// trash_max_age_days threshold. It processes records in batches to avoid
// loading the entire result set into memory at once.
func PurgeExpiredTrash(db *gorm.DB, cfg config.VizConfig, logger *slog.Logger) {
	cutoff := time.Now().UTC().AddDate(0, 0, -cfg.Cache.TrashMaxAgeDays)

	var totalPurged int64

	for {
		var batch []entities.ImageAsset
		if err := db.Unscoped().
			Where("deleted_at IS NOT NULL AND deleted_at < ?", cutoff).
			Limit(trashBatchSize).
			Find(&batch).Error; err != nil {
			logger.Error("failed to query expired trash batch", slog.Any("error", err))
			return
		}

		if len(batch) == 0 {
			break
		}

		for i := range batch {
			img := &batch[i]
			// Remove trash directory for this image
			trashDir := filepath.Join(cfg.BaseDir, "trash", img.Uid)
			if err := os.RemoveAll(trashDir); err != nil {
				logger.Error("failed to remove trash directory",
					slog.String("uid", img.Uid),
					slog.String("path", trashDir),
					slog.Any("error", err))
				// Continue even if file removal fails — still clean up the DB record
			}

			// Hard-delete the database record
			if err := db.Unscoped().Delete(&img).Error; err != nil {
				logger.Error("failed to hard-delete expired image record",
					slog.String("uid", img.Uid),
					slog.Any("error", err))
			}
		}

		totalPurged += int64(len(batch))
	}

	if totalPurged == 0 {
		logger.Debug("no expired trash images to purge")
		return
	}

	logger.Info("completed purging expired trash images", slog.Int64("purged", totalPurged))
}
