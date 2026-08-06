package jobs

import (
	"io"
	"os"
	"path/filepath"
	"testing"
	"time"

	"log/slog"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"

	"viz/internal/config"
	"viz/internal/entities"
	"viz/internal/tests"
)

// testLogger returns a discard logger for tests.
func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

// insertTrashImage inserts an ImageAsset with a specific DeletedAt timestamp and UID.
func insertTrashImage(t *testing.T, db *gorm.DB, uid string, deletedAt time.Time) {
	t.Helper()
	img := entities.ImageAsset{
		Uid:       uid,
		Name:      "test-" + uid,
		DeletedAt: gorm.DeletedAt{Time: deletedAt, Valid: true},
	}
	err := db.Create(&img).Error
	require.NoError(t, err)
}

func TestPurgeExpiredTrash_RemovesExpiredImages(t *testing.T) {
	db := tests.NewTestDB(t)
	logger := testLogger()

	// Insert images with deleted_at well before the 30-day cutoff
	oldTime := time.Now().UTC().AddDate(0, 0, -60) // 60 days ago
	insertTrashImage(t, db, "expired-1", oldTime)
	insertTrashImage(t, db, "expired-2", oldTime)

	cfg := config.VizConfig{}
	cfg.Cache.TrashMaxAgeDays = 30

	PurgeExpiredTrash(db, cfg, logger)

	// Verify both expired images are hard-deleted
	var count int64
	db.Unscoped().Model(&entities.ImageAsset{}).Where("uid IN ?", []string{"expired-1", "expired-2"}).Count(&count)
	assert.Equal(t, int64(0), count, "expired images should be permanently deleted")
}

func TestPurgeExpiredTrash_KeepsRecentSoftDeletes(t *testing.T) {
	db := tests.NewTestDB(t)
	logger := testLogger()

	// Insert images with deleted_at that is recent (within the 30-day window)
	recentTime := time.Now().UTC().AddDate(0, 0, -5) // 5 days ago
	insertTrashImage(t, db, "recent-1", recentTime)
	insertTrashImage(t, db, "recent-2", recentTime)

	// Also insert one that is near the boundary but still within (29 days ago < 30 days)
	nearBoundaryTime := time.Now().UTC().AddDate(0, 0, -29)
	insertTrashImage(t, db, "near-boundary", nearBoundaryTime)

	cfg := config.VizConfig{}
	cfg.Cache.TrashMaxAgeDays = 30

	PurgeExpiredTrash(db, cfg, logger)

	// Recent images should still exist
	var count int64
	db.Unscoped().Model(&entities.ImageAsset{}).Where("uid IN ?", []string{"recent-1", "recent-2"}).Count(&count)
	assert.Equal(t, int64(2), count, "recently soft-deleted images should not be purged")

	// Near-boundary image (29 days < 30 day cutoff) should also still exist
	db.Unscoped().Model(&entities.ImageAsset{}).Where("uid = ?", "near-boundary").Count(&count)
	assert.Equal(t, int64(1), count, "image before boundary should not be purged")
}

func TestPurgeExpiredTrash_RemovesTrashDirectories(t *testing.T) {
	db := tests.NewTestDB(t)
	logger := testLogger()

	// Create a temp base directory
	tmpDir, err := os.MkdirTemp("", "viz-trash-test-*")
	require.NoError(t, err)
	defer os.RemoveAll(tmpDir)

	// Create trash directories for two expired images
	trashDir := filepath.Join(tmpDir, "trash")
	err = os.MkdirAll(filepath.Join(trashDir, "expired-dir-1"), 0755)
	require.NoError(t, err)
	err = os.MkdirAll(filepath.Join(trashDir, "expired-dir-2"), 0755)
	require.NoError(t, err)

	// Insert one expired and one recent image
	insertTrashImage(t, db, "expired-dir-1", time.Now().UTC().AddDate(0, 0, -60))
	insertTrashImage(t, db, "expired-dir-2", time.Now().UTC().AddDate(0, 0, -60))
	insertTrashImage(t, db, "recent-dir-1", time.Now().UTC().AddDate(0, 0, -5))

	cfg := config.VizConfig{}
	cfg.Cache.TrashMaxAgeDays = 30
	cfg.BaseDir = tmpDir

	PurgeExpiredTrash(db, cfg, logger)

	// Expired trash directories should be removed
	_, err = os.Stat(filepath.Join(trashDir, "expired-dir-1"))
	assert.True(t, os.IsNotExist(err), "trash directory for expired image should be removed")

	_, err = os.Stat(filepath.Join(trashDir, "expired-dir-2"))
	assert.True(t, os.IsNotExist(err), "trash directory for expired image should be removed")

	// Recent image's trash directory should NOT be removed (but since we never created it, it shouldn't matter)
	// Verify the recent image record still exists
	var count int64
	db.Unscoped().Model(&entities.ImageAsset{}).Where("uid = ?", "recent-dir-1").Count(&count)
	assert.Equal(t, int64(1), count, "recently soft-deleted image should not be purged")
}

func TestPurgeExpiredTrash_MissingTrashDir(t *testing.T) {
	db := tests.NewTestDB(t)
	logger := testLogger()

	tmpDir, err := os.MkdirTemp("", "viz-trash-test-*")
	require.NoError(t, err)
	defer os.RemoveAll(tmpDir)

	// Insert expired image but don't create its trash directory
	insertTrashImage(t, db, "no-dir", time.Now().UTC().AddDate(0, 0, -60))

	cfg := config.VizConfig{}
	cfg.Cache.TrashMaxAgeDays = 30
	cfg.BaseDir = tmpDir

	// Should not panic or error - should just log and continue
	PurgeExpiredTrash(db, cfg, logger)

	// Image should still be hard-deleted from DB
	var count int64
	db.Unscoped().Model(&entities.ImageAsset{}).Where("uid = ?", "no-dir").Count(&count)
	assert.Equal(t, int64(0), count, "expired image should be purged even without trash directory")
}

func TestPurgeExpiredTrash_NoExpiredImages(t *testing.T) {
	db := tests.NewTestDB(t)
	logger := testLogger()

	// Only images with no deleted_at (still active)
	img := entities.ImageAsset{
		Uid:  "active-1",
		Name: "active",
	}
	err := db.Create(&img).Error
	require.NoError(t, err)

	cfg := config.VizConfig{}
	cfg.Cache.TrashMaxAgeDays = 30

	PurgeExpiredTrash(db, cfg, logger)

	// Active image should remain
	var count int64
	db.Unscoped().Model(&entities.ImageAsset{}).Where("uid = ?", "active-1").Count(&count)
	assert.Equal(t, int64(1), count, "active image should not be affected")
}
