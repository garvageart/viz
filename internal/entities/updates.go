package entities

import (
	"strings"
	"viz/internal/dto"
	"viz/internal/utils"
)

// ApplyUpdate updates ImageAsset fields from an ImageUpdate DTO.
func (image *ImageAsset) ApplyUpdate(update dto.ImageUpdate) {
	utils.AssignIf(&image.Name, update.Name)
	utils.AssignIf(&image.Private, update.Private)
	utils.AssignIf(&image.TakenAt, update.TakenAt)
	utils.AssignPtrIf(&image.Description, update.Description)
	utils.AssignPtrIf(&image.Favourited, update.Favourited)
	utils.AssignPtrIf(&image.Exif, update.Exif)
	utils.AssignFK(&image.OwnerID, update.OwnerUid)

	if update.ImageMetadata != nil {
		if update.ImageMetadata.Rating != nil {
			r := *update.ImageMetadata.Rating
			if r <= 0 {
				image.ImageMetadata.Rating = nil
			} else {
				if r > 5 {
					r = 5
				}
				image.ImageMetadata.Rating = &r
			}
		}

		if update.ImageMetadata.Label != nil {
			image.ImageMetadata.Label = update.ImageMetadata.Label
		} else {
			image.ImageMetadata.Label = nil
		}
	}

	if update.Keywords != nil {
		var kws []Keyword
		for _, kw := range *update.Keywords {
			kwName := strings.TrimSpace(kw.Name)
			if kwName != "" {
				kws = append(kws, Keyword{
					Name:   kwName,
					Colour: kw.Colour,
					Parent: kw.Parent,
				})
			}
		}
		image.Keywords = kws
	}
}

// ApplyUpdate updates Collection fields from a CollectionUpdate DTO.
func (collection *Collection) ApplyUpdate(update dto.CollectionUpdate) {
	utils.AssignIf(&collection.Name, update.Name)
	utils.AssignPtrIf(&collection.Description, update.Description)
	utils.AssignPtrIf(&collection.Private, update.Private)
	utils.AssignPtrIf(&collection.Favourited, update.Favourited)
	utils.AssignPtrIf(&collection.Archived, update.Archived)
	utils.AssignFK(&collection.ThumbnailID, update.ThumbnailUID)
	utils.AssignFK(&collection.OwnerID, update.OwnerUID)
}
