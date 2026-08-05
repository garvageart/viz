package workers

import (
	"context"
	"encoding/json"
	"fmt"
	"time"
	imageops "viz/internal/images/ops"
	"viz/internal/images/transform"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill/message"

	"viz/internal/entities"
	libhttp "viz/internal/http"
	"viz/internal/images"
	"viz/internal/jobs"

	"gorm.io/gorm"
)

const (
	JobTypeImageProcess = "image_process"
	TopicImageProcess   = JobTypeImageProcess
)

type ImageProcessJob struct {
	Image entities.ImageAsset
}

// NewImageWorker creates a worker that processes images and sends WebSocket updates
func NewImageWorker(db *gorm.DB, wsBroker *libhttp.WSBroker) *jobs.Worker {
	return jobs.NewWorker(JobTypeImageProcess, TopicImageProcess, "Image Processing", 5, func(msg *message.Message) error {
		var job ImageProcessJob
		err := json.Unmarshal(msg.Payload, &job)
		if err != nil {
			return fmt.Errorf("%s: %w", JobTypeImageProcess, err)
		}

		if job.Image.ImageMetadata == nil {
			err = fmt.Errorf("job %s failed: image metadata is nil for image %s", JobTypeImageProcess, job.Image.Uid)
			_ = jobs.UpdateWorkerJobStatus(db, msg.UUID, jobs.WorkerJobStatusFailed, new("worker_error"), new(jobs.Truncate(err.Error(), 1024)), nil, nil)
			return nil // Return nil to avoid retry loop for unrecoverable error
		}

		if wsBroker != nil {
			wsBroker.Broadcast("job-started", map[string]any{
				"uid":       msg.UUID,
				"jobId":     msg.UUID,
				"type":      JobTypeImageProcess,
				"topic":     JobTypeImageProcess,
				"image_uid": job.Image.Uid,
				"imageId":   job.Image.Uid,
				"filename":  job.Image.ImageMetadata.FileName,
			})
		}

		// Mark job as running in DB
		startedAt := time.Now().UTC()
		_ = jobs.UpdateWorkerJobStatus(db, msg.UUID, jobs.WorkerJobStatusRunning, nil, nil, &startedAt, nil)

		// Create reusable progress reporter and process
		onProgress := jobs.NewProgressCallback(
			wsBroker,
			msg.UUID,
			JobTypeImageProcess,
			job.Image.Uid,
			job.Image.ImageMetadata.FileName,
		)

		err = ImageProcess(msg.Context(), db, job.Image, onProgress)

		if err != nil {
			if wsBroker != nil {
				wsBroker.Broadcast("job-failed", map[string]any{
					"uid":       msg.UUID,
					"jobId":     msg.UUID,
					"type":      JobTypeImageProcess,
					"topic":     JobTypeImageProcess,
					"image_uid": job.Image.Uid,
					"imageId":   job.Image.Uid,
					"error":     err.Error(),
				})
			}
			// persist concise error
			_ = jobs.UpdateWorkerJobStatus(db, msg.UUID, jobs.WorkerJobStatusFailed, new("worker_error"), new(jobs.Truncate(err.Error(), 1024)), nil, nil)
			return err
		}

		if wsBroker != nil {
			wsBroker.Broadcast("job-completed", map[string]any{
				"uid":       msg.UUID,
				"jobId":     msg.UUID,
				"type":      JobTypeImageProcess,
				"topic":     JobTypeImageProcess,
				"image_uid": job.Image.Uid,
				"imageId":   job.Image.Uid,
			})
		}

		// mark completed
		completedAt := time.Now().UTC()
		_ = jobs.UpdateWorkerJobStatus(db, msg.UUID, jobs.WorkerJobStatusSuccess, nil, nil, nil, &completedAt)

		return nil
	},
	)
}

func ImageProcess(ctx context.Context, db *gorm.DB, imgEnt entities.ImageAsset, onProgress func(step string, progress int)) error {
	originalData, err := images.ReadImage(imgEnt.Uid, imgEnt.ImageMetadata.FileName)
	if err != nil {
		return fmt.Errorf("failed to read image: %w", err)
	}

	if imgEnt.ImageMetadata.Checksum == "" {
		onProgress("Calculating image checksum", 10)

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
	onProgress("Generating thumbhash", 50)

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

	ext := imgEnt.ImageMetadata.FileType

	var transformParams *transform.TransformParams
	var terr error

	onProgress("Generating transforms", 80)

	// Generate thumbnail transform (permanent paths)
	tstart := time.Now()
	if imgEnt.ImagePaths.Thumbnail != "" {
		jobs.Logger.Debug("GenerateTransformFromPath: generating transform", loggerFields.Add(watermill.LogFields{
			"path": imgEnt.ImagePaths.Thumbnail,
		}))

		transformParams, terr = imageops.ParseTransformParams(imgEnt.ImagePaths.Thumbnail)
		if terr != nil {
			return terr
		}

		result, terr := imageops.GenerateTransform(transformParams, imgEnt, originalData)
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

		transformParams, terr = imageops.ParseTransformParams(imgEnt.ImagePaths.Preview)
		if terr != nil {
			return terr
		}

		result, terr := imageops.GenerateTransform(transformParams, imgEnt, originalData)
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

	onProgress("Updating database", 90)

	err = db.Transaction(func(tx *gorm.DB) error {
		// Update image entity in DB
		if err := tx.Model(&entities.ImageAsset{}).Where("uid = ?", imgEnt.Uid).Updates(entities.ImageAsset{ImageMetadata: imgEnt.ImageMetadata}).Error; err != nil {
			return fmt.Errorf("failed to update image entity: %w", err)
		}

		return nil
	})

	if err != nil {
		return fmt.Errorf("transaction failed: %w", err)
	}

	onProgress("Completed", 100)

	return nil
}
