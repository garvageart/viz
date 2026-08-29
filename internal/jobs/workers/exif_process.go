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
	"viz/internal/utils"
	customxmp "viz/internal/xmp"

	"time"

	"gorm.io/gorm"
)

const (
	JobTypeExifProcess = "exif_process"
	TopicExifProcess   = JobTypeExifProcess
)

type ExifProcessJob struct {
	Image entities.ImageAsset
}

// NewExifWorker creates a worker that extracts EXIF and updates the DB
func NewExifWorker(db *gorm.DB, wsBroker *libhttp.WSBroker) *jobs.Worker {
	return jobs.NewWorker(JobTypeExifProcess, TopicExifProcess, "EXIF Processing", 2, func(msg *message.Message) error {
		var job ExifProcessJob
		err := json.Unmarshal(msg.Payload, &job)
		if err != nil {
			return fmt.Errorf("%s: %w", JobTypeExifProcess, err)
		}

		if wsBroker != nil {
			wsBroker.Broadcast("job-started", map[string]any{
				"uid":       msg.UUID,
				"jobId":     msg.UUID,
				"type":      JobTypeExifProcess,
				"topic":     JobTypeExifProcess,
				"image_uid": job.Image.Uid,
				"imageId":   job.Image.Uid,
				"filename":  job.Image.ImageMetadata.FileName,
			})
		}

		// mark running
		startedAt := time.Now().UTC()
		_ = jobs.UpdateWorkerJobStatus(db, msg.UUID, jobs.WorkerJobStatusRunning, nil, nil, &startedAt, nil)

		onProgress := jobs.NewProgressCallback(
			wsBroker,
			msg.UUID,
			JobTypeExifProcess,
			job.Image.Uid,
			job.Image.ImageMetadata.FileName,
		)

		err = ExifProcess(msg.Context(), db, job.Image, onProgress)

		if err != nil {
			if wsBroker != nil {
				wsBroker.Broadcast("job-failed", map[string]any{
					"uid":       msg.UUID,
					"jobId":     msg.UUID,
					"type":      JobTypeExifProcess,
					"topic":     JobTypeExifProcess,
					"image_uid": job.Image.Uid,
					"imageId":   job.Image.Uid,
					"error":     err.Error(),
				})
			}
			_ = jobs.UpdateWorkerJobStatus(db, msg.UUID, jobs.WorkerJobStatusFailed, new("worker_error"), new(jobs.Truncate(err.Error(), 1024)), nil, nil)
			return err
		}

		if wsBroker != nil {
			wsBroker.Broadcast("job-completed", map[string]any{
				"uid":       msg.UUID,
				"jobId":     msg.UUID,
				"type":      JobTypeExifProcess,
				"topic":     JobTypeExifProcess,
				"image_uid": job.Image.Uid,
				"imageId":   job.Image.Uid,
			})
		}

		completedAt := time.Now().UTC()
		_ = jobs.UpdateWorkerJobStatus(db, msg.UUID, jobs.WorkerJobStatusSuccess, nil, nil, nil, &completedAt)

		return nil
	},
	)
}

// ExifProcess extracts EXIF and updates the DB (exif + taken_at + optional metadata)
func ExifProcess(ctx context.Context, db *gorm.DB, imgEnt entities.ImageAsset, onProgress func(step string, progress int)) error {
	originalData, err := images.ReadImage(imgEnt.Uid, imgEnt.ImageMetadata.FileName)
	if err != nil {
		return fmt.Errorf("failed to read image for exif: %w", err)
	}

	if onProgress != nil {
		onProgress("Processing EXIF data", 30)
	}

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
	if onProgress != nil {
		onProgress("Processing XMP data", 60)
	}

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
		if imgEnt.ImageMetadata.Keywords == nil || len(*imgEnt.ImageMetadata.Keywords) == 0 {
			if len(dcModel.Subject) > 0 {
				// Convert xmp.StringArray to []string
				keywords := []string(dcModel.Subject)
				imgEnt.ImageMetadata.Keywords = &keywords
			} else if len(lrModel.HierarchicalSubject) > 0 {
				// Fallback to Lightroom hierarchical subject
				keywords := []string(lrModel.HierarchicalSubject)
				imgEnt.ImageMetadata.Keywords = &keywords
			}
		}
	}

	if onProgress != nil {
		onProgress("Updating database", 90)
	}

	// Fetch latest image from DB to ensure we don't overwrite concurrent metadata updates (e.g. dimensions)
	var dbImage entities.ImageAsset
	if err := db.Where("uid = ?", imgEnt.Uid).First(&dbImage).Error; err != nil {
		return fmt.Errorf("failed to fetch image for update: %w", err)
	}

	// Merge extracted data
	dbImage.ImageMetadata.ColorSpace = imgEnt.ImageMetadata.ColorSpace
	dbImage.ImageMetadata.HasIccProfile = imgEnt.ImageMetadata.HasIccProfile
	dbImage.ImageMetadata.FileCreatedAt = imgEnt.ImageMetadata.FileCreatedAt
	dbImage.ImageMetadata.FileModifiedAt = imgEnt.ImageMetadata.FileModifiedAt

	// Only merge extracted metadata if DB version is missing it, to respect user edits
	if dbImage.ImageMetadata.Rating == nil && imgEnt.ImageMetadata.Rating != nil {
		dbImage.ImageMetadata.Rating = imgEnt.ImageMetadata.Rating
	}
	if (dbImage.ImageMetadata.Label == nil || *dbImage.ImageMetadata.Label == "") && imgEnt.ImageMetadata.Label != nil {
		dbImage.ImageMetadata.Label = imgEnt.ImageMetadata.Label
	}
	if (dbImage.ImageMetadata.Keywords == nil || len(*dbImage.ImageMetadata.Keywords) == 0) && imgEnt.ImageMetadata.Keywords != nil {
		dbImage.ImageMetadata.Keywords = imgEnt.ImageMetadata.Keywords
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
		Error; err != nil {
		return fmt.Errorf("failed to update db image exif: %w", err)
	}

	return nil
}
