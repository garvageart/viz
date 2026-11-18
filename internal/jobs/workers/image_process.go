package workers

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"slices"
	"time"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill/message"
	"gorm.io/gorm"

	"viz/internal/dto"
	"viz/internal/entities"
	libhttp "viz/internal/http"
	"viz/internal/images"
	imageops "viz/internal/images/ops"
	"viz/internal/jobs"
)

// ImageProcessJob is the payload accepted by POST /jobs and sent to the queue.
// The published JSON Schema is reflected from this struct.
type ImageProcessJob struct {
	Image entities.ImageAsset `json:"image"`
}

// Validate checks that the payload contains the required fields.
func (j *ImageProcessJob) Validate() error {
	if j.Image.Uid == "" {
		return fmt.Errorf("image uid is required")
	}
	return nil
}

func ImageProcess(ctx context.Context, db *gorm.DB, imgEnt entities.ImageAsset) error {
	originalData, err := images.ReadImage(imgEnt.Uid, imgEnt.ImageMetadata.FileName)
	if err != nil {
		return fmt.Errorf("failed to read image: %w", err)
	}

	if imgEnt.ImageMetadata.Checksum == "" {
		// onProgress("Calculating image checksum", 10)

		checksum, err := images.CalculateImageChecksum(originalData)
		if err != nil {
			return fmt.Errorf("failed to calculate image checksum: %w", err)
		}

		imgEnt.ImageMetadata.Checksum = checksum
	}

	// Create a display thumbnail from the image
	// This is just used to create thumbhash placeholders, it is not saved to disk anymore
	thumbData, err := imageops.CreateThumbnailWithSize(originalData, 200, 0)
	if err != nil {
		return fmt.Errorf("failed to create thumbnail: %w", err)
	}

	loggerFields := watermill.LogFields{
		"uid":  imgEnt.Uid,
		"name": imgEnt.Name,
	}

	// Generate thumbhash by downscaling the 200px thumbnail in Go, avoiding a
	// second libvips thumbnail call and a JPEG encode→decode round-trip.
	// onProgress("Generating thumbhash", 50)

	thumbhashTimeStart := time.Now()

	thumbImg, _, err := imageops.ReadToImage(thumbData)
	if err != nil {
		return fmt.Errorf("failed to decode thumbnail for thumbhash: %w", err)
	}

	thumbhash, err := imageops.GenerateThumbhash(imageops.DownscaleTo32x32(thumbImg))
	if err != nil {
		return fmt.Errorf("failed to generate thumbhash: %w", err)
	}

	jobs.Logger.Debug("finished generating thumbhash", loggerFields.Add(watermill.LogFields{
		"duration": time.Since(thumbhashTimeStart).Milliseconds(),
	}))

	encoded := images.EncodeThumbhashToString(thumbhash)
	imgEnt.ImageMetadata.Thumbhash = &encoded

	// onProgress("Updating database", 70)

	err = db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&entities.ImageAsset{}).Where("uid = ?", imgEnt.Uid).Updates(entities.ImageAsset{ImageMetadata: imgEnt.ImageMetadata}).Error; err != nil {
			return fmt.Errorf("failed to update image entity: %w", err)
		}

		if err := tx.Where("uid = ?", imgEnt.Uid).First(&imgEnt).Error; err != nil {
			return fmt.Errorf("failed to reload updated image entity: %w", err)
		}

		return nil
	})
	if err != nil {
		return fmt.Errorf("transaction failed: %w", err)
	}

	ext := imgEnt.ImageMetadata.FileType

	// onProgress("Generating transforms", 80)

	// Generate thumbnail transform (permanent paths)
	tstart := time.Now()
	if imgEnt.ImagePaths.Thumbnail != "" {
		jobs.Logger.Debug("GenerateTransformFromPath: generating transform", loggerFields.Add(watermill.LogFields{
			"path": imgEnt.ImagePaths.Thumbnail,
		}))

		transformParams := &imageops.ImageTransform{Image: imgEnt}
		if terr := transformParams.Parse(imgEnt.ImagePaths.Thumbnail); terr != nil {
			return terr
		}

		result, terr := transformParams.Generate(originalData)
		if terr != nil {
			if terr.Error() == images.CacheErrTransformExists {
				jobs.Logger.Debug("GenerateTransformFromPath: transform already exists", loggerFields.Add(watermill.LogFields{
					"path": imgEnt.ImagePaths.Thumbnail,
				}))
			} else {
				return terr
			}
		} else {
			// Write cache
			if result.Ext != "" {
				ext = result.Ext
			}

			if terr := images.WriteCachedTransform(imgEnt.Uid, *result.TransformHash, ext, result.ImageData); terr != nil {
				return fmt.Errorf("failed to write cached transform: %w", terr)
			}

			jobs.Logger.Debug("GenerateTransformFromPath: finished generating transform", watermill.LogFields{
				"uid":         imgEnt.Uid,
				"path":        imgEnt.ImagePaths.Thumbnail,
				"duration_ms": time.Since(tstart).Milliseconds(),
			})

			jobs.Logger.Debug("finished generating thumbnail transform", loggerFields)
		}
	}

	// Generate preview transform
	tstart = time.Now()
	if imgEnt.ImagePaths.Preview != "" {
		jobs.Logger.Debug("GenerateTransformFromPath: generating transform", loggerFields.Add(watermill.LogFields{
			"path": imgEnt.ImagePaths.Preview,
		}))

		transformParams := &imageops.ImageTransform{Image: imgEnt}
		if terr := transformParams.Parse(imgEnt.ImagePaths.Preview); terr != nil {
			return terr
		}

		result, terr := transformParams.Generate(originalData)
		if terr != nil {
			if terr.Error() == images.CacheErrTransformExists {
				jobs.Logger.Debug("GenerateTransformFromPath: transform already exists", loggerFields.Add(watermill.LogFields{
					"path": imgEnt.ImagePaths.Preview,
				}))
			} else {
				return terr
			}
		} else {
			// Write cache
			if result.Ext != "" {
				ext = result.Ext
			}

			if terr := images.WriteCachedTransform(imgEnt.Uid, *result.TransformHash, ext, result.ImageData); terr != nil {
				return fmt.Errorf("failed to write cached transform: %w", terr)
			}

			jobs.Logger.Debug("GenerateTransformFromPath: finished generating transform", watermill.LogFields{
				"uid":         imgEnt.Uid,
				"path":        imgEnt.ImagePaths.Preview,
				"duration_ms": time.Since(tstart).Milliseconds(),
			})

			jobs.Logger.Debug("finished generating preview transform", loggerFields)
		}
	}

	// onProgress("Completed", 100)

	return nil
}

// ImageProcessDefinition is the single registration point for the image
// processing worker: catalog metadata, job creation, and the queue handler.
func ImageProcessDefinition(db *gorm.DB, wsBroker *libhttp.WSBroker) jobs.Definition {
	return jobs.Definition{
		Name:               dto.ImageProcess,
		DisplayName:        "Image Processing",
		Description:        "Generate thumbhash data and permanent thumbnail and preview derivatives.",
		Payload:            &ImageProcessJob{},
		DefaultConcurrency: 5,
		MaxConcurrency:     15,
		BatchSize:          500,
		TimeoutMs:          30000,
		MaxRetries:         3,
		SupportsRetry:      true,
		SupportsCancel:     true,
		Handle: func(msg *message.Message) error {
			var job ImageProcessJob
			err := json.Unmarshal(msg.Payload, &job)
			if err != nil {
				return fmt.Errorf("%s: %w", dto.ImageProcess, err)
			}

			if wsBroker != nil {
				wsBroker.Broadcast("job-started", map[string]any{
					"uid":       msg.UUID,
					"jobId":     msg.UUID,
					"type":      dto.ImageProcess,
					"topic":     dto.ImageProcess,
					"image_uid": job.Image.Uid,
					"imageId":   job.Image.Uid,
					"filename":  job.Image.ImageMetadata.FileName,
				})
			}

			// Mark job as running in DB
			startedAt := time.Now().UTC()
			_ = jobs.SetJobRunning(db, msg.UUID, startedAt)

			err = ImageProcess(msg.Context(), db, job.Image)

			if err != nil {
				if wsBroker != nil {
					wsBroker.Broadcast("job-failed", map[string]any{
						"uid":       msg.UUID,
						"jobId":     msg.UUID,
						"type":      dto.ImageProcess,
						"topic":     dto.ImageProcess,
						"image_uid": job.Image.Uid,
						"imageId":   job.Image.Uid,
						"error":     err.Error(),
					})
				}
				// persist concise error
				_ = jobs.SetJobFailed(db, msg.UUID, dto.JobError{Code: jobs.ErrCodeWorkerError, Message: jobs.Truncate(err.Error(), jobs.MaxErrorMsgLen)}, nil)
				return err
			}

			if wsBroker != nil {
				wsBroker.Broadcast("job-completed", map[string]any{
					"uid":       msg.UUID,
					"jobId":     msg.UUID,
					"type":      dto.ImageProcess,
					"topic":     dto.ImageProcess,
					"image_uid": job.Image.Uid,
					"imageId":   job.Image.Uid,
				})
			}

			// mark completed
			completedAt := time.Now().UTC()
			_ = jobs.SetJobCompleted(db, msg.UUID, completedAt)

			return nil
		},
	}
}

func containsUid(s []string, e string) bool {
	return slices.Contains(s, e)
}

// checkMissingTransforms records an image whose permanent derivative is absent
// from the transform cache.
func checkMissingTransforms(img entities.ImageAsset, transformPath string, missingUids *[]string, logger *slog.Logger) error {
	if transformPath == "" {
		return nil
	}

	if img.ImageMetadata.Checksum == "" || img.ImageMetadata.FileType == "" {
		logger.Debug("skipping transform check due to incomplete metadata", slog.String("uid", img.Uid), slog.String("path", transformPath))
		return nil
	}

	params := &imageops.ImageTransform{Image: img}
	if err := params.Parse(transformPath); err != nil {
		logger.Warn("failed to parse transform params", slog.String("uid", img.Uid), slog.String("path", transformPath), slog.Any("error", err))
		if !containsUid(*missingUids, img.Uid) {
			*missingUids = append(*missingUids, img.Uid)
		}

		return fmt.Errorf("failed to parse transform params for %s: %w", transformPath, err)
	}

	transformEtag := params.ETag()
	ext := params.Format
	if ext == "" {
		ext = img.ImageMetadata.FileType
	}

	_, exists, err := images.FindCachedTransform(img.Uid, transformEtag, ext)
	if err != nil {
		logger.Error("failed to check for cached transform", slog.String("uid", img.Uid), slog.String("path", transformPath), slog.Any("error", err))
		if !containsUid(*missingUids, img.Uid) {
			*missingUids = append(*missingUids, img.Uid)
		}

		return fmt.Errorf("failed to check cached transform for %s: %w", transformPath, err)
	}

	if !exists && !containsUid(*missingUids, img.Uid) {
		*missingUids = append(*missingUids, img.Uid)
	}

	return nil
}

// FindMissingImageTargets keeps the existing image "missing" heuristic: no
// thumbhash or an absent permanent thumbnail/preview transform.
func FindMissingImageTargets(db *gorm.DB, logger *slog.Logger) ([]string, error) {
	var thumbhashMissing []string
	if err := db.Model(&entities.ImageAsset{}).Where("image_metadata->>'thumbhash' IS NULL").Pluck("uid", &thumbhashMissing).Error; err != nil {
		return nil, fmt.Errorf("find images missing thumbhash: %w", err)
	}

	var allImages []entities.ImageAsset
	if err := db.Select("uid", "updated_at", "image_paths", "image_metadata").Find(&allImages).Error; err != nil {
		return nil, fmt.Errorf("fetch images for transform check: %w", err)
	}

	var missing []string
	for _, img := range allImages {
		if err := checkMissingTransforms(img, img.ImagePaths.Thumbnail, &missing, logger); err != nil {
			return nil, err
		}

		if !containsUid(missing, img.Uid) {
			if err := checkMissingTransforms(img, img.ImagePaths.Preview, &missing, logger); err != nil {
				return nil, err
			}
		}
	}

	for _, uid := range thumbhashMissing {
		if !containsUid(missing, uid) {
			missing = append(missing, uid)
		}
	}

	return missing, nil
}
