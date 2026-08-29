package db_test

import (
	"io"
	"log/slog"
	"testing"
	"viz/internal/db"
	"viz/internal/dto"
	"viz/internal/entities"
	"viz/internal/tests"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestTrimImageNameExtensions(t *testing.T) {
	gdb := tests.NewTestDB(t)

	testCases := []struct {
		uid      string
		input    string
		expected string
	}{
		{"img-1", "sunset.jpg", "sunset"},
		{"img-2", "landscape_photo.PNG", "landscape_photo"},
		{"img-3", "portrait", "portrait"},
		{"img-4", "fancy photo. jpeg", "fancy photo"},
	}

	for _, tc := range testCases {
		require.NoError(t, gdb.Create(&entities.ImageAsset{Uid: tc.uid, Name: tc.input}).Error)
	}

	require.NoError(t, db.TrimImageNameExtensions(gdb, slog.New(slog.NewTextHandler(io.Discard, nil))))

	for _, tc := range testCases {
		var img entities.ImageAsset
		require.NoError(t, gdb.First(&img, "uid = ?", tc.uid).Error)
		assert.Equal(t, tc.expected, img.Name)
	}
}

func TestRunBackfills_RunOnceSemantics(t *testing.T) {
	gdb := tests.NewTestDB(t)
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	runCount := 0
	dummyBackfill := func(tx *gorm.DB, log *slog.Logger) error {
		runCount++
		return nil
	}

	steps := []db.BackfillFn{dummyBackfill}

	// First run: should execute
	err := db.RunBackfillSteps(gdb, logger, steps)
	require.NoError(t, err)
	assert.Equal(t, 1, runCount)

	// Verify record exists in db_backfills
	var count int64
	require.NoError(t, gdb.Table("db_backfills").Count(&count).Error)
	assert.Equal(t, int64(1), count)

	// Second run: should skip
	err = db.RunBackfillSteps(gdb, logger, steps)
	require.NoError(t, err)
	assert.Equal(t, 1, runCount, "backfill should not execute a second time")
}

func TestRunBackfills_RollbackOnError(t *testing.T) {
	gdb := tests.NewTestDB(t)
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	failingBackfill := func(tx *gorm.DB, log *slog.Logger) error {
		require.NoError(t, tx.Create(&entities.ImageAsset{Uid: "should-rollback-img"}).Error)
		return assert.AnError
	}

	steps := []db.BackfillFn{failingBackfill}

	err := db.RunBackfillSteps(gdb, logger, steps)
	require.Error(t, err)

	// Verify the image was rolled back
	var imgCount int64
	gdb.Model(&entities.ImageAsset{}).Where("uid = ?", "should-rollback-img").Count(&imgCount)
	assert.Equal(t, int64(0), imgCount)

	// Verify no backfill record was committed
	var backfillCount int64
	gdb.Table("db_backfills").Count(&backfillCount)
	assert.Equal(t, int64(0), backfillCount)
}

func TestBackfillOriginalFileName(t *testing.T) {
	gdb := tests.NewTestDB(t)
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	img := entities.ImageAsset{
		Uid: "test-orig-name-img",
		ImageMetadata: dto.ImageMetadata{
			FileName: "original_photo.raw",
		},
	}
	require.NoError(t, gdb.Create(&img).Error)

	require.NoError(t, db.BackfillOriginalFileName(gdb, logger))

	var updated entities.ImageAsset
	require.NoError(t, gdb.First(&updated, "uid = ?", "test-orig-name-img").Error)
	assert.NotNil(t, updated.OriginalFileName)
	assert.Equal(t, "original_photo.raw", *updated.OriginalFileName)
}
