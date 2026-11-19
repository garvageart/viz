package workers

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/ThreeDotsLabs/watermill/message"
	"gorm.io/gorm"

	libvips "viz/internal/images/ops/vips"

	"viz/internal/dto"
	"viz/internal/entities"
	libhttp "viz/internal/http"
	"viz/internal/images"
	"viz/internal/jobs"
	customxmp "viz/internal/xmp"
)

// XMPGenerationPayload is the payload accepted by POST /jobs and sent to the queue.
// The published JSON Schema is reflected from this struct.
//
// It carries either a concrete image (a runnable job) or a selection (a
// request to fan out into one job per target asset) — never both, never
// neither.
type XMPGenerationPayload struct {
	Image     *entities.ImageAsset `json:"image,omitempty"`
	Selection *jobs.AssetSelection `json:"selection,omitempty"`
}

// Validate checks that the payload contains exactly one of the two shapes.
func (j *XMPGenerationPayload) Validate() error {
	switch {
	case j.Image == nil && j.Selection == nil:
		return fmt.Errorf("image uid is required")
	case j.Image != nil && j.Selection != nil:
		return fmt.Errorf("image and selection are mutually exclusive")
	case j.Image != nil:
		if j.Image.Uid == "" {
			return fmt.Errorf("image uid is required")
		}

		return nil
	default:
		return jobs.ValidateAssetSelection(*j.Selection)
	}
}

// AssetSelection reports the payload's selection block, or nil for a
// concrete runnable job.
func (j *XMPGenerationPayload) AssetSelection() *jobs.AssetSelection {
	return j.Selection
}

func generateXMPSidecar(img entities.ImageAsset, logger *slog.Logger) error {
	originalPath := images.GetImagePath(img.Uid, img.ImageMetadata.FileName)

	if _, err := os.Stat(originalPath); os.IsNotExist(err) {
		return fmt.Errorf("original image file not found: %s", originalPath)
	}

	xmpPath := strings.TrimSuffix(originalPath, filepath.Ext(originalPath)) + ".xmp"

	// Read the original image to pull any embedded XMP packet (the merge base).
	// Without this the merge would be identical for images whose embedded
	// data we silently dropped.
	originalData, err := images.ReadImage(img.Uid, img.ImageMetadata.FileName)
	if err != nil {
		return fmt.Errorf("failed to read image: %w", err)
	}

	embedded, err := readEmbeddedXMP(originalData)
	if err != nil {
		return fmt.Errorf("failed to read embedded XMP from %s: %w", originalPath, err)
	}

	// Read the existing sidecar, if any. An unreadable sidecar must not be
	// overwritten — abort and let the job retry.
	var sidecar []byte
	sidecarBytes, err := os.ReadFile(xmpPath)
	switch {
	case err == nil:
		sidecar = sidecarBytes
	case os.IsNotExist(err):
		// no sidecar yet — merge produces one from embedded + DB
	default:
		return fmt.Errorf("failed to read existing sidecar %s: %w", xmpPath, err)
	}

	xmpData, stats, err := customxmp.MergeXMP(img, embedded, sidecar)
	if err != nil {
		return fmt.Errorf("failed to merge XMP data: %w", err)
	}

	if stats.BaseDegraded {
		// TODO: Follow Lightroom/Capture One instead of only logging here.
		// Show a conflict badge on the asset and offer a fix/review dialog
		// (e.g. keep DB values, accept the sidecar, or inspect the original
		// embedded data). Needs a user-visible signal path from the job —
		// decide whether the badge/dialog is driven by the job result, the
		// asset record, or a dedicated conflicts view.
		logger.Warn("embedded XMP packet was unparseable; merged against an empty base",
			slog.String("image_uid", img.Uid), slog.String("original_path", originalPath))
	}

	// Write atomically: temp file in the same directory + rename. An existing
	// sidecar is replaced only after the new packet is fully on disk.
	tmp, err := os.CreateTemp(filepath.Dir(xmpPath), ".viz-xmp-*.tmp")
	if err != nil {
		return fmt.Errorf("failed to create temporary sidecar file: %w", err)
	}
	tmpPath := tmp.Name()

	if _, err := tmp.Write(xmpData); err != nil {
		_ = tmp.Close()
		_ = os.Remove(tmpPath)
		return fmt.Errorf("failed to write temporary sidecar file: %w", err)
	}

	if err := tmp.Close(); err != nil {
		_ = os.Remove(tmpPath)
		return fmt.Errorf("failed to close temporary sidecar file: %w", err)
	}

	if err := os.Rename(tmpPath, xmpPath); err != nil {
		_ = os.Remove(tmpPath)
		return fmt.Errorf("failed to replace sidecar %s: %w", xmpPath, err)
	}

	logger.Info("generated XMP sidecar",
		slog.String("image_uid", img.Uid), slog.String("xmp_path", xmpPath))

	return nil
}

// readEmbeddedXMP extracts the embedded XMP packet from a raw image buffer,
// or nil when the image carries none.
func readEmbeddedXMP(originalData []byte) ([]byte, error) {
	libvipsImg, err := libvips.NewImageFromBuffer(originalData, libvips.DefaultLoadOptions())
	if err != nil {
		return nil, err
	}
	defer libvipsImg.Close()

	if !libvipsImg.HasField("xmp-data") {
		return nil, nil
	}

	blob, err := libvipsImg.GetBlob("xmp-data")
	if err != nil {
		return nil, err
	}

	if len(blob) == 0 {
		return nil, nil
	}

	return blob, nil
}

// XMPGenerationDefinition is the single registration point for the XMP worker:
// catalog metadata, job creation, and the queue handler.
func XMPGenerationDefinition(db *gorm.DB, ws *libhttp.WSBroker, logger *slog.Logger) jobs.Definition {
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
		Class:              jobs.ClassAsset,
		NewPayload: func(image entities.ImageAsset) jobs.Payload {
			return &XMPGenerationPayload{Image: &image}
		},
		FindMissing: FindMissingXMPTargets,
		Handle: func(msg *message.Message) error {
			var job XMPGenerationPayload
			err := json.Unmarshal(msg.Payload, &job)
			if err != nil {
				return fmt.Errorf("%s: %w", dto.XmpGeneration, err)
			}

			if job.Image == nil {
				return fmt.Errorf("%s: payload carries no image", dto.XmpGeneration)
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

			err = generateXMPSidecar(*job.Image, logger)

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
	}
}

// FindMissingXMPTargets returns the uids of the library directories that
// contain no .xmp sidecar. It scans the filesystem because the sidecar is
// the artifact the worker produces; the database holds no equivalent marker.
// Directory names are assumed to be asset uids.
func FindMissingXMPTargets(db *gorm.DB, logger *slog.Logger) ([]string, error) {
	libraryPath := images.Library

	entries, err := os.ReadDir(libraryPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read library directory: %w", err)
	}

	var missing []string
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		uid := entry.Name()
		dirPath := filepath.Join(libraryPath, uid)

		files, err := os.ReadDir(dirPath)
		if err != nil {
			logger.Warn("failed to read asset directory", slog.String("uid", uid), slog.Any("error", err))
			continue
		}

		hasXMP := false
		for _, file := range files {
			if !file.IsDir() && strings.HasSuffix(strings.ToLower(file.Name()), ".xmp") {
				hasXMP = true
				break
			}
		}

		if !hasXMP {
			missing = append(missing, uid)
		}
	}

	return missing, nil
}
