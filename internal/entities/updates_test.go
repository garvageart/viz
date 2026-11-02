package entities_test

import (
	"testing"
	"time"
	"viz/internal/dto"
	"viz/internal/entities"

	"github.com/stretchr/testify/assert"
)

func TestImageAsset_ApplyUpdate(t *testing.T) {
	name := "Updated Name"
	desc := "Updated Desc"
	priv := true
	fav := true
	owner := "user-123"
	taken := time.Now().UTC().Truncate(time.Second)

	ratingZero := 0
	ratingHigh := 10
	labelRed := dto.Red

	img := entities.ImageAsset{
		Name: "Original Name",
	}

	// 1. Basic field updates
	update := dto.ImageUpdate{
		Name:        &name,
		Description: &desc,
		Private:     &priv,
		Favourited:  &fav,
		OwnerUid:    &owner,
		TakenAt:     &taken,
		ImageMetadata: &struct {
			Label  *dto.Label `json:"label,omitempty"`
			Rating *int       `json:"rating,omitempty"`
		}{
			Label:  &labelRed,
			Rating: &ratingHigh,
		},
		Keywords: &[]dto.KeywordUpdate{
			{Name: "  Nature  "},
			{Name: "   "},
			{Name: "Landscape"},
		},
	}

	img.ApplyUpdate(update)

	assert.Equal(t, "Updated Name", img.Name)
	assert.Equal(t, &desc, img.Description)
	assert.True(t, img.Private)
	assert.Equal(t, &fav, img.Favourited)
	assert.Equal(t, &owner, img.OwnerID)
	assert.Equal(t, taken, img.TakenAt)

	// Rating should clamp to 5
	assert.NotNil(t, img.ImageMetadata.Rating)
	assert.Equal(t, 5, *img.ImageMetadata.Rating)
	assert.Equal(t, &labelRed, img.ImageMetadata.Label)

	// Keywords should be trimmed and empty strings skipped
	assert.Len(t, img.Keywords, 2)
	assert.Equal(t, "Nature", img.Keywords[0].Name)
	assert.Equal(t, "Landscape", img.Keywords[1].Name)

	// 2. Rating 0 clears rating; empty owner clears owner
	emptyOwner := ""
	update2 := dto.ImageUpdate{
		OwnerUid: &emptyOwner,
		ImageMetadata: &struct {
			Label  *dto.Label `json:"label,omitempty"`
			Rating *int       `json:"rating,omitempty"`
		}{
			Label:  nil,
			Rating: &ratingZero,
		},
	}

	img.ApplyUpdate(update2)
	assert.Nil(t, img.OwnerID)
	assert.Nil(t, img.ImageMetadata.Rating)
	assert.Nil(t, img.ImageMetadata.Label)
}

func TestCollection_ApplyUpdate(t *testing.T) {
	name := "Summer Vacations"
	desc := "Trips from 2026"
	priv := false
	fav := true
	archived := true
	thumb := "img-thumb-1"
	owner := "user-456"

	col := entities.Collection{
		Name: "Old Collection",
	}

	update := dto.CollectionUpdate{
		Name:         &name,
		Description:  &desc,
		Private:      &priv,
		Favourited:   &fav,
		Archived:     &archived,
		ThumbnailUID: &thumb,
		OwnerUID:     &owner,
	}

	col.ApplyUpdate(update)

	assert.Equal(t, "Summer Vacations", col.Name)
	assert.Equal(t, &desc, col.Description)
	assert.Equal(t, &priv, col.Private)
	assert.Equal(t, &fav, col.Favourited)
	assert.Equal(t, &archived, col.Archived)
	assert.Equal(t, &thumb, col.ThumbnailID)
	assert.Equal(t, &owner, col.OwnerID)

	// Empty string clears thumbnail and owner
	emptyStr := ""
	updateClear := dto.CollectionUpdate{
		ThumbnailUID: &emptyStr,
		OwnerUID:     &emptyStr,
	}

	col.ApplyUpdate(updateClear)
	assert.Nil(t, col.ThumbnailID)
	assert.Nil(t, col.OwnerID)
}
