package routes

import (
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"viz/internal/dto"
	"viz/internal/entities"
	"viz/internal/images"
	imageops "viz/internal/images/ops"
	"viz/internal/tests"
)

func TestFindMissingTransformsUsesImageUpdatedAt(t *testing.T) {
	oldLibrary := images.Library
	images.Library = t.TempDir()
	t.Cleanup(func() {
		images.Library = oldLibrary
	})

	db := tests.NewTestDB(t)
	const uid = "missing-transform-etag-test"
	params, ok := images.GetPermanentTransformParams(images.TransformThumbnail)
	require.True(t, ok)

	path := "/images/" + uid + "/file?" + (&imageops.ImageTransform{TransformParams: params}).ToQueryString()
	img := entities.ImageAsset{
		Uid:  uid,
		Name: "test.webp",
		ImageMetadata: dto.ImageMetadata{
			FileName: "test.webp",
			FileType: "webp",
			Checksum: "test-checksum",
		},
		ImagePaths: dto.ImagePaths{
			Thumbnail: path,
		},
		UpdatedAt: time.Now().Add(-time.Hour),
	}
	require.NoError(t, db.Create(&img).Error)
	require.NoError(t, db.Where("uid = ?", uid).First(&img).Error)

	transform := &imageops.ImageTransform{Image: img}
	require.NoError(t, transform.Parse(path))
	require.NoError(t, images.WriteCachedTransform(uid, transform.ETag(), params.Format, []byte("cached transform")))

	missing, err := findMissingTransforms(db, slog.New(slog.NewTextHandler(io.Discard, nil)))
	require.NoError(t, err)
	require.Empty(t, missing)
}
