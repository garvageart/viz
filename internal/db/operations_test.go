package db_test

import (
	"io"
	"log/slog"
	"testing"
	"viz/internal/db"
	"viz/internal/entities"
	"viz/internal/tests"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
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
