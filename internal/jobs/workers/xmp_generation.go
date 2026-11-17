package workers

import (
	"context"
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

	"viz/internal/dto"
	"viz/internal/entities"
	libhttp "viz/internal/http"
	"viz/internal/images"
	"viz/internal/jobs"
	customxmp "viz/internal/xmp"
)

// XMPGenerationPayload is the payload accepted by POST /jobs and sent to the queue.
// The published JSON Schema is reflected from this struct.
type XMPGenerationPayload struct {
	Image entities.ImageAsset `json:"image"`
}

// Validate checks that the payload contains the required fields.
func (j *XMPGenerationPayload) Validate() error {
	if j.Image.Uid == "" {
		return fmt.Errorf("image uid is required")
	}
	return nil
}

func generateXMPSidecar(img entities.ImageAsset) error {
	originalPath := images.GetImagePath(img.Uid, img.ImageMetadata.FileName)
	logger := jobs.Logger

	if _, err := os.Stat(originalPath); os.IsNotExist(err) {
		return fmt.Errorf("original image file not found: %s", originalPath)
	}

	// onProgress("Validating input", 5)

	xmpPath := strings.TrimSuffix(originalPath, filepath.Ext(originalPath)) + ".xmp"

	// onProgress("Building XMP models", 20)

	doc, err := customxmp.BuildXMPDocument(img)
	if err != nil {
		return fmt.Errorf("failed to build XMP document: %w", err)
	}
	defer doc.Close()

	// onProgress("Marshalling XMP", 80)

	xmpData, err := xmp.MarshalIndent(doc, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal XMP data: %w", err)
	}

	// onProgress("Writing XMP file", 90)

	if err := os.WriteFile(xmpPath, xmpData, 0644); err != nil {
		return fmt.Errorf("failed to write XMP file: %w", err)
	}

	doc.Close()

	logger.Info("generated XMP sidecar", watermill.LogFields{
		"image_uid": img.Uid,
		"xmp_path":  xmpPath,
	})

	// onProgress("Complete", 100)

	return nil
}

// XMPGenerationDefinition is the single registration point for the XMP worker:
// catalog metadata, job creation, and the queue handler.
func XMPGenerationDefinition(db *gorm.DB, ws *libhttp.WSBroker) jobs.Definition {
	return jobs.Definition{
		Name:               dto.XmpGeneration,
		DisplayName:        "XMP Sidecar Generation",
		Description:        "Generate XMP sidecar files for images in the library.",
		Payload:            &XMPGenerationPayload{},
		DefaultConcurrency: 2,
		MaxConcurrency:     10,
		BatchSize:          500,
		TimeoutMs:          30000,
		MaxRetries:         3,
		SupportsRetry:      true,
		SupportsCancel:     true,
		Handle: func(msg *message.Message) error {
			var job XMPGenerationPayload
			err := json.Unmarshal(msg.Payload, &job)
			if err != nil {
				return fmt.Errorf("%s: %w", dto.XmpGeneration, err)
			}

			if ws != nil {
				ws.Broadcast("job-started", map[string]any{
					"uuid":      msg.UUID,
					"type":      dto.XmpGeneration,
					"image_uid": job.Image.Uid,
					"filename":  job.Image.ImageMetadata.FileName,
				})
			}

			// mark running
			startedAt := time.Now().UTC()
			_ = jobs.SetJobRunning(db, msg.UUID, startedAt)

			err = generateXMPSidecar(job.Image)

			if err != nil {
				if ws != nil {
					ws.Broadcast("job-failed", map[string]any{
						"uuid":      msg.UUID,
						"type":      dto.XmpGeneration,
						"image_uid": job.Image.Uid,
						"error":     err.Error(),
					})
				}
				_ = jobs.SetJobFailed(db, msg.UUID, dto.JobError{Code: jobs.ErrCodeWorkerError, Message: jobs.Truncate(err.Error(), jobs.MaxErrorMsgLen)}, nil)
				return err
			}

			if ws != nil {
				ws.Broadcast("job-completed", map[string]any{
					"uid":       msg.UUID,
					"jobId":     msg.UUID,
					"type":      dto.XmpGeneration,
					"topic":     dto.XmpGeneration,
					"image_uid": job.Image.Uid,
				})
			}

			completedAt := time.Now().UTC()
			_ = jobs.SetJobCompleted(db, msg.UUID, completedAt)

			return nil
		},
		CreateJobs: func(ctx context.Context, db *gorm.DB, raw json.RawMessage, runUID string) (jobs.JobCreationResult, error) {
			var input XMPGenerationPayload
			if err := json.Unmarshal(raw, &input); err != nil {
				return jobs.JobCreationResult{}, fmt.Errorf("decode xmp generation payload: %w", err)
			}

			if input.Image.Uid == "" {
				return jobs.JobCreationResult{}, fmt.Errorf("image uid is required")
			}

			var runUIDPtr *string
			if runUID != "" {
				runUIDPtr = &runUID
			}

			_, err := jobs.Enqueue(db, dto.XmpGeneration, &input, jobs.EnqueueOptions{
				RunUID:      runUIDPtr,
				Data:        raw,
				MaxAttempts: 4,
			})
			if err != nil {
				return jobs.JobCreationResult{}, err
			}

			return jobs.JobCreationResult{TargetCount: 1, QueuedCount: 1}, nil
		},
	}
}
