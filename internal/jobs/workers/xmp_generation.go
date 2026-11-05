package workers

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/trimmer-io/go-xmp/xmp"
	"gorm.io/gorm"

	"viz/internal/entities"
	libhttp "viz/internal/http"
	"viz/internal/images"
	"viz/internal/jobs"
	customxmp "viz/internal/xmp"
)

const (
	JobTypeXMPGeneration = "xmp_generation"
	TopicXMPGeneration   = JobTypeXMPGeneration
)

type XMPGenerationJob struct {
	Image entities.ImageAsset
}

// NewXMPWorker creates a worker that generates XMP sidecar files
func NewXMPWorker(db *gorm.DB, wsBroker *libhttp.WSBroker) *jobs.Worker {
	return jobs.NewWorker(JobTypeXMPGeneration, TopicXMPGeneration, "XMP Sidecar Generation", 2, func(msg *message.Message) error {
		var job XMPGenerationJob
		err := json.Unmarshal(msg.Payload, &job)
		if err != nil {
			return fmt.Errorf("%s: %w", JobTypeXMPGeneration, err)
		}

		if wsBroker != nil {
			wsBroker.Broadcast("job-started", map[string]any{
				"uid":       msg.UUID,
				"jobId":     msg.UUID,
				"type":      JobTypeXMPGeneration,
				"topic":     JobTypeXMPGeneration,
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
			JobTypeXMPGeneration,
			job.Image.Uid,
			job.Image.ImageMetadata.FileName,
		)

		err = generateXMPSidecar(job.Image, onProgress)

		if err != nil {
			if wsBroker != nil {
				wsBroker.Broadcast("job-failed", map[string]any{
					"uid":       msg.UUID,
					"jobId":     msg.UUID,
					"type":      JobTypeXMPGeneration,
					"topic":     JobTypeXMPGeneration,
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
				"type":      JobTypeXMPGeneration,
				"topic":     JobTypeXMPGeneration,
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

func generateXMPSidecar(img entities.ImageAsset, onProgress func(step string, progress int)) error {
	originalPath := images.GetImagePath(img.Uid, img.ImageMetadata.FileName)
	logger := jobs.Logger

	if _, err := os.Stat(originalPath); os.IsNotExist(err) {
		return fmt.Errorf("original image file not found: %s", originalPath)
	}

	if onProgress != nil {
		onProgress("Validating input", 5)
	}

	xmpPath := strings.TrimSuffix(originalPath, filepath.Ext(originalPath)) + ".xmp"

	if onProgress != nil {
		onProgress("Building XMP models", 20)
	}

	doc, err := customxmp.BuildXMPDocument(img)
	if err != nil {
		return fmt.Errorf("failed to build XMP document: %w", err)
	}
	defer doc.Close()

	if onProgress != nil {
		onProgress("Marshalling XMP", 80)
	}

	xmpData, err := xmp.MarshalIndent(doc, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal XMP data: %w", err)
	}

	if onProgress != nil {
		onProgress("Writing XMP file", 90)
	}

	if err := os.WriteFile(xmpPath, xmpData, 0644); err != nil {
		return fmt.Errorf("failed to write XMP file: %w", err)
	}

	doc.Close()

	logger.Info("generated XMP sidecar", watermill.LogFields{
		"image_uid": img.Uid,
		"xmp_path":  xmpPath,
	})

	if onProgress != nil {
		onProgress("Complete", 100)
	}
	return nil
}
