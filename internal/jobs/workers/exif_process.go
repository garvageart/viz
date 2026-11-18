package workers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"viz/internal/dto"
	imageops "viz/internal/images/ops"

	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/trimmer-io/go-xmp/models/dc"
	"github.com/trimmer-io/go-xmp/models/ps"
	xmpbase "github.com/trimmer-io/go-xmp/models/xmp_base"
	"github.com/trimmer-io/go-xmp/xmp"

	"viz/internal/entities"
	libhttp "viz/internal/http"
	"viz/internal/images"
	libvips "viz/internal/images/ops/vips"
	"viz/internal/jobs"
	"viz/internal/uid"
	"viz/internal/utils"
	customxmp "viz/internal/xmp"

	"time"

	"gorm.io/gorm"
)

// ExifProcessPayload is the payload accepted by POST /jobs and sent to the queue.
// The published JSON Schema is reflected from this struct.
type ExifProcessPayload struct {
	Image entities.ImageAsset `json:"image"`
}

// Validate checks that the payload contains the required fields.
func (j *ExifProcessPayload) Validate() error {
	if j.Image.Uid == "" {
		return fmt.Errorf("image uid is required")
	}
	return nil
}

// ExifProcess extracts EXIF and updates the DB (exif + taken_at + optional metadata)
func ExifProcess(ctx context.Context, db *gorm.DB, imgEnt entities.ImageAsset) error {
	originalData, err := images.ReadImage(imgEnt.Uid, imgEnt.ImageMetadata.FileName)
	if err != nil {
		return fmt.Errorf("failed to read image for exif: %w", err)
	}

	// onProgress("Processing EXIF data", 30)

	libvipsImg, err := libvips.NewImageFromBuffer(originalData, libvips.DefaultLoadOptions())
	if err != nil {
		return fmt.Errorf("failed to create vips image from buffer: %w", err)
	}
	defer libvipsImg.Close()

	rawExif, err := imageops.GetExifData(originalData)
	if err != nil {
		return fmt.Errorf("failed to extract exif: %w", err)
	}
	exifData, fileCreatedAt, fileModifiedAt := imageops.BuildImageEXIF(rawExif)
	imageops.HandleExifQuirks(&exifData, originalData)
	imgEnt.Exif = &exifData
	imgEnt.Description = imageops.GetExifDescription(rawExif)

	if !fileCreatedAt.IsZero() {
		imgEnt.ImageMetadata.FileCreatedAt = fileCreatedAt
	}

	if !fileModifiedAt.IsZero() {
		imgEnt.ImageMetadata.FileModifiedAt = fileModifiedAt
	}

	hasIcc := libvipsImg.HasICCProfile()
	imgEnt.ImageMetadata.ColorSpace = imageops.GetColourSpaceString(libvipsImg)
	imgEnt.ImageMetadata.HasIccProfile = &hasIcc
	takenAt := imageops.GetTakenAt(imgEnt)

	// Extract XMP Metadata (ACR, Capture One, Standard)
	// onProgress("Processing XMP data", 60)

	if doc, err := xmp.Scan(bytes.NewReader(originalData)); err == nil {
		defer doc.Close()

		xmpBase := &xmpbase.XmpBase{}
		dcModel := &dc.DublinCore{}
		crsModel := &customxmp.CameraRawSettings{}
		psModel := &ps.PhotoshopInfo{}
		lrModel := &customxmp.LrInfo{}

		// Register models on the document directly
		// This should trigger SyncFromXMP to populate the structs from the parsed DOM
		doc.AddModel(xmpBase)
		doc.AddModel(dcModel)
		doc.AddModel(crsModel)
		doc.AddModel(psModel)
		doc.AddModel(lrModel)

		// 1. Rating
		// Prioritize existing rating
		if imgEnt.ImageMetadata.Rating == nil || *imgEnt.ImageMetadata.Rating == 0 {
			var rating int
			if crsModel.Rating != nil {
				rating = *crsModel.Rating
			} else if xmpBase.Rating > 0 {
				rating = int(xmpBase.Rating)
			}

			if rating > 0 {
				imgEnt.ImageMetadata.Rating = &rating
			}
		}

		// 2. Label
		// Prioritize existing label
		if imgEnt.ImageMetadata.Label == nil || *imgEnt.ImageMetadata.Label == "" {
			var label string
			if crsModel.Label != nil && *crsModel.Label != "" {
				label = *crsModel.Label
			} else if xmpBase.Label != "" {
				label = xmpBase.Label
			} else if psModel.Urgency > 0 {
				// Map urgency to color label
				switch psModel.Urgency {
				case 1:
					label = "Red"
				case 2:
					label = "Orange"
				case 3:
					label = "Yellow"
				case 4:
					label = "Green"
				case 5:
					label = "Blue"
				case 6:
					label = "Purple"
				case 7:
					label = "Grey"
				}
			}

			if label != "" {
				// Normalize label to match enum if possible
				normalizedLabel := utils.Capitalize(strings.ToLower(label))
				// Check if it matches valid labels
				switch normalizedLabel {
				case "Red", "Orange", "Yellow", "Green", "Blue", "Purple", "Pink", "Grey", "Gray":
					l := dto.Label(normalizedLabel)
					imgEnt.ImageMetadata.Label = &l
				}
			}
		}

		// 3. Keywords / Subjects
		if len(imgEnt.Keywords) == 0 {
			var rawKeywords []string
			if len(dcModel.Subject) > 0 {
				rawKeywords = []string(dcModel.Subject)
			} else if len(lrModel.HierarchicalSubject) > 0 {
				rawKeywords = []string(lrModel.HierarchicalSubject)
			}
			for _, kwName := range rawKeywords {
				kwName = strings.TrimSpace(kwName)
				if kwName != "" {
					var kw entities.Keyword
					if err := db.Where("name = ?", kwName).First(&kw).Error; err != nil {
						kw = entities.Keyword{
							Uid:  uid.MustGenerate(),
							Name: kwName,
						}
						_ = db.Create(&kw).Error
					}
					imgEnt.Keywords = append(imgEnt.Keywords, kw)
				}
			}
		}

		// 4. Artist fallback from XMP Creator
		if imgEnt.Exif != nil && imgEnt.Exif.Artist == nil && len(dcModel.Creator) > 0 {
			artist := strings.TrimSpace(dcModel.Creator[0])
			if artist != "" {
				imgEnt.Exif.Artist = &artist
			}
		}

		// 5. Copyright fallback from XMP Rights
		if imgEnt.Exif != nil && imgEnt.Exif.Copyright == nil && dcModel.Rights != nil {
			rights := strings.TrimSpace(dcModel.Rights.Default())
			if rights != "" {
				imgEnt.Exif.Copyright = &rights
			}
		}

		// 6. Description / Caption fallback from XMP Description
		if imgEnt.Description == nil && dcModel.Description != nil {
			desc := strings.TrimSpace(dcModel.Description.Default())
			if desc != "" {
				imgEnt.Description = &desc
			}
		}
	}

	// onProgress("Updating database", 90)

	// Fetch latest image from DB to ensure we don't overwrite concurrent metadata updates (e.g. dimensions)
	var dbImage entities.ImageAsset
	if err := db.Preload("Keywords").Where("uid = ?", imgEnt.Uid).First(&dbImage).Error; err != nil {
		return fmt.Errorf("failed to fetch image for update: %w", err)
	}

	// Merge extracted data
	dbImage.ImageMetadata = imgEnt.ImageMetadata

	// Only merge extracted metadata if DB version is missing it, to respect user edits
	if dbImage.ImageMetadata.Rating == nil && imgEnt.ImageMetadata.Rating != nil {
		dbImage.ImageMetadata.Rating = imgEnt.ImageMetadata.Rating
	}
	if (dbImage.ImageMetadata.Label == nil || *dbImage.ImageMetadata.Label == "") && imgEnt.ImageMetadata.Label != nil {
		dbImage.ImageMetadata.Label = imgEnt.ImageMetadata.Label
	}
	if len(dbImage.Keywords) == 0 && len(imgEnt.Keywords) > 0 {
		dbImage.Keywords = imgEnt.Keywords
		_ = db.Model(&dbImage).Association("Keywords").Replace(dbImage.Keywords)
	}
	if (dbImage.Description == nil || *dbImage.Description == "") && imgEnt.Description != nil {
		dbImage.Description = imgEnt.Description
	}

	// Only overwrite the database taken_at if the file has actual EXIF date/time data
	// or if the database taken_at is currently nil/zero.
	finalTakenAt := takenAt
	if !dbImage.TakenAt.IsZero() {
		if !imageops.HasExifDateTime(imgEnt.Exif) {
			finalTakenAt = dbImage.TakenAt
		}
	}

	if err := db.Model(&entities.ImageAsset{}).
		Where("uid = ?", imgEnt.Uid).
		Update("exif", imgEnt.Exif).
		Update("taken_at", finalTakenAt).
		Update("image_metadata", dbImage.ImageMetadata).
		Update("description", dbImage.Description).
		Error; err != nil {
		return fmt.Errorf("failed to update db image exif: %w", err)
	}

	return nil
}

// ExifProcessDefinition is the single registration point for the EXIF worker:
// catalog metadata, job creation, and the queue handler.
func ExifProcessDefinition(db *gorm.DB, wsBroker *libhttp.WSBroker) jobs.Definition {
	return jobs.Definition{
		Name:               dto.ExifProcess,
		DisplayName:        "EXIF Processing",
		Description:        "Extract EXIF metadata from original images and update the library index.",
		Payload:            &ExifProcessPayload{},
		DefaultConcurrency: 2,
		MaxConcurrency:     10,
		BatchSize:          500,
		TimeoutMs:          30000,
		MaxRetries:         3,
		SupportsRetry:      true,
		SupportsCancel:     true,
		Handle: func(msg *message.Message) error {
			var job ExifProcessPayload
			err := json.Unmarshal(msg.Payload, &job)
			if err != nil {
				return fmt.Errorf("%s: %w", dto.ExifProcess, err)
			}

			if wsBroker != nil {
				wsBroker.Broadcast("job-started", map[string]any{
					"uid":       msg.UUID,
					"jobId":     msg.UUID,
					"type":      dto.ExifProcess,
					"topic":     dto.ExifProcess,
					"image_uid": job.Image.Uid,
					"imageId":   job.Image.Uid,
					"filename":  job.Image.ImageMetadata.FileName,
				})
			}

			// mark running
			startedAt := time.Now().UTC()
			_ = jobs.SetJobRunning(db, msg.UUID, startedAt)

			err = ExifProcess(msg.Context(), db, job.Image)

			if err != nil {
				if wsBroker != nil {
					wsBroker.Broadcast("job-failed", map[string]any{
						"uid":       msg.UUID,
						"jobId":     msg.UUID,
						"type":      dto.ExifProcess,
						"topic":     dto.ExifProcess,
						"image_uid": job.Image.Uid,
						"imageId":   job.Image.Uid,
						"error":     err.Error(),
					})
				}
				_ = jobs.SetJobFailed(db, msg.UUID, dto.JobError{Code: jobs.ErrCodeWorkerError, Message: jobs.Truncate(err.Error(), jobs.MaxErrorMsgLen)}, nil)
				return err
			}

			if wsBroker != nil {
				wsBroker.Broadcast("job-completed", map[string]any{
					"uid":       msg.UUID,
					"jobId":     msg.UUID,
					"type":      dto.ExifProcess,
					"topic":     dto.ExifProcess,
					"image_uid": job.Image.Uid,
					"imageId":   job.Image.Uid,
				})
			}

			completedAt := time.Now().UTC()
			_ = jobs.SetJobCompleted(db, msg.UUID, completedAt)

			return nil
		},
	}
}
