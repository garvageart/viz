package workers

import (
	"bytes"
	"context"
	"image"
	"image/color"
	"image/png"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/stretchr/testify/require"

	"viz/internal/config"
	"viz/internal/dto"
	"viz/internal/entities"
	"viz/internal/images"
	imageops "viz/internal/images/ops"
	libvips "viz/internal/images/ops/vips"
	"viz/internal/jobs"
	"viz/internal/tests"
)

func TestImageProcessWritesTransformUsingPersistedUpdatedAt(t *testing.T) {
	imageops.WarmupAllOps(config.LibvipsConfig{Concurrency: 1})
	defer libvips.Shutdown()

	oldLibrary := images.Library
	images.Library = t.TempDir()
	t.Cleanup(func() {
		images.Library = oldLibrary
	})

	oldLogger := jobs.Logger
	jobs.Logger = watermill.NewSlogLogger(slog.New(slog.NewTextHandler(io.Discard, nil)))
	t.Cleanup(func() {
		jobs.Logger = oldLogger
	})

	source := image.NewRGBA(image.Rect(0, 0, 64, 64))
	for y := 0; y < 64; y++ {
		for x := 0; x < 64; x++ {
			source.Set(x, y, color.RGBA{R: uint8(x * 4), G: uint8(y * 4), B: 100, A: 255})
		}
	}

	var sourceData bytes.Buffer
	require.NoError(t, png.Encode(&sourceData, source))

	const uid = "image-process-etag-test"
	const fileName = "source.png"
	require.NoError(t, images.SaveImage(sourceData.Bytes(), uid, fileName))

	query := (&imageops.ImageTransform{TransformParams: imageops.TransformParams{
		Format:  "png",
		Width:   20,
		Height:  20,
		Quality: 85,
	}}).ToQueryString()

	db := tests.NewTestDB(t)
	img := entities.ImageAsset{
		Uid:  uid,
		Name: fileName,
		ImageMetadata: dto.ImageMetadata{
			FileName: fileName,
			FileType: "png",
			Checksum: "test-checksum",
		},
		ImagePaths: dto.ImagePaths{
			Thumbnail: "/images/" + uid + "/file?" + query,
		},
		UpdatedAt: time.Now().Add(-time.Hour),
	}
	require.NoError(t, db.Create(&img).Error)

	require.NoError(t, db.Where("uid = ?", uid).First(&img).Error)
	require.NoError(t, ImageProcess(context.Background(), db, img, func(string, int) {}))

	var processed entities.ImageAsset
	require.NoError(t, db.Where("uid = ?", uid).First(&processed).Error)

	transform := &imageops.ImageTransform{Image: processed}
	require.NoError(t, transform.Parse(processed.ImagePaths.Thumbnail))
	_, exists, err := images.FindCachedTransform(uid, transform.ETag(), "png")
	require.NoError(t, err)
	require.True(t, exists, "generated transform should be cached under the current image ETag")
}
