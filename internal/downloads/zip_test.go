package downloads

import (
	"archive/zip"
	"bytes"
	"context"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"testing"
	"time"

	"viz/internal/dto"
	"viz/internal/entities"
	"viz/internal/images"
)

func TestZipSizeCalculationAndWriting(t *testing.T) {
	// Set up temporary images directory structure to mock images.GetImagePath
	tempDir, err := os.MkdirTemp("", "viz-zip-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Redirect global images.Directory to our temp dir
	oldDirectory := images.Library
	images.Library = tempDir
	defer func() {
		images.Library = oldDirectory
	}()

	// Define test files with different sizes and paths
	testFiles := []struct {
		uid      string
		filename string
		content  []byte
	}{
		{
			uid:      "img1-uid",
			filename: "landscape.jpg",
			content:  bytes.Repeat([]byte{0xAA}, 100),
		},
		{
			uid:      "img2-uid",
			filename: "portrait.png",
			content:  bytes.Repeat([]byte{0xBB}, 250),
		},
		{
			uid:      "img3-uid",
			filename: "nested/vacation.jpeg",
			content:  bytes.Repeat([]byte{0xCC}, 500),
		},
	}

	var imgs []entities.ImageAsset
	var uids []string

	for _, tf := range testFiles {
		// Create the directory structure on disk
		imgDir := filepath.Join(tempDir, tf.uid)
		if err := os.MkdirAll(imgDir, 0755); err != nil {
			t.Fatalf("failed to create image dir: %v", err)
		}

		// Write content to disk
		filePath := filepath.Join(imgDir, filepath.Base(tf.filename))
		if err := os.WriteFile(filePath, tf.content, 0644); err != nil {
			t.Fatalf("failed to write mock file: %v", err)
		}

		// Create GORM model
		size := int64(len(tf.content))
		img := entities.ImageAsset{
			Uid: tf.uid,
			ImageMetadata: dto.ImageMetadata{
				FileName: tf.filename,
				FileSize: &size,
			},
			UpdatedAt: time.Date(2026, 6, 23, 12, 0, 0, 0, time.UTC),
		}

		imgs = append(imgs, img)
		uids = append(uids, tf.uid)
	}

	// 1. Calculate ZIP size using our logic
	expectedSize := CalculateZipSize(imgs, uids, true)

	// 2. Actually write the ZIP to a buffer
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)

	logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	err = WriteImagesToZip(context.Background(), logger, zw, imgs, uids)
	if err != nil {
		t.Fatalf("failed to write images to zip: %v", err)
	}

	err = zw.Close()
	if err != nil {
		t.Fatalf("failed to close zip writer: %v", err)
	}

	actualSize := int64(buf.Len())

	// 3. Assert they match exactly
	if expectedSize != actualSize {
		t.Errorf("ZIP size prediction mismatch: expected %d bytes, got %d bytes", expectedSize, actualSize)
	} else {
		t.Logf("Perfect match! Both predicted and actual zip size is %d bytes", expectedSize)
	}
}
