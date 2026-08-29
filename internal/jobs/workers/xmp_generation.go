package workers

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/trimmer-io/go-xmp/models/dc"
	"github.com/trimmer-io/go-xmp/models/exif"
	"github.com/trimmer-io/go-xmp/models/ps"
	"github.com/trimmer-io/go-xmp/models/tiff"
	xmpbase "github.com/trimmer-io/go-xmp/models/xmp_base"
	"github.com/trimmer-io/go-xmp/xmp"
	"gorm.io/gorm"

	"viz/internal/entities"
	libhttp "viz/internal/http"
	"viz/internal/images"
	imageops "viz/internal/images/ops"
	"viz/internal/jobs"
	"viz/internal/utils"
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
	doc := xmp.NewDocument()
	xmpBase := &xmpbase.XmpBase{
		CreatorTool: "Viz Image Management System",
	}

	dcModel := &dc.DublinCore{}
	exifModel := &exif.ExifInfo{}
	tiffModel := &tiff.TiffInfo{}
	psModel := &ps.PhotoshopInfo{}
	crsSettings := &customxmp.CameraRawSettings{
		RawFileName:    filepath.Base(originalPath),
		Version:        "16.0",
		ProcessVersion: "15.0",
		HasSettings:    xmp.Bool(false),
	}
	lrModel := &customxmp.LrInfo{}

	// Set SidecarForExtension to match original file extension (uppercase, without dot)
	ext := strings.ToUpper(strings.TrimPrefix(filepath.Ext(originalPath), "."))
	if ext != "" {
		psModel.SidecarForExtension = ext
	}

	if onProgress != nil {
		onProgress("Building XMP models", 20)
	}

	// 1. Basic Metadata (Rating, Label, Title)

	if img.ImageMetadata.Rating != nil {
		ratingVal := *img.ImageMetadata.Rating
		xmpBase.Rating = xmpbase.Rating(ratingVal)
		crsSettings.Rating = &ratingVal
	}

	if img.ImageMetadata.Label != nil {
		rawLabel := string(*img.ImageMetadata.Label)
		normalizedLabel := utils.Capitalize(strings.ToLower(rawLabel))

		xmpBase.Label = normalizedLabel
		crsSettings.Label = &normalizedLabel

		// Map standard color labels to Photoshop Urgency for broader compatibility
		// (e.g. Capture One older versions, Photo Mechanic, etc.)
		// 1=Red, 2=Orange, 3=Yellow, 4=Green, 5=Blue, 6=Purple, 7=Grey
		switch strings.ToLower(rawLabel) {
		case "red":
			psModel.Urgency = 1
		case "orange":
			psModel.Urgency = 2
		case "yellow":
			psModel.Urgency = 3
		case "green":
			psModel.Urgency = 4
		case "blue":
			psModel.Urgency = 5
		case "purple":
			psModel.Urgency = 6
		case "grey", "gray":
			psModel.Urgency = 7
		}
	}

	if img.ImageMetadata.Keywords != nil && len(*img.ImageMetadata.Keywords) > 0 {
		keywords := *img.ImageMetadata.Keywords
		dcModel.Subject = keywords
		lrModel.HierarchicalSubject = xmp.StringArray(keywords)
	}

	// 2. Descriptive Metadata
	if img.Name != "" && img.Name != img.Uid {
		// Only set title if it's not just the UID (default fallback)
		// Or if we want to preserve the filename as title, we can do that too.
		// For now, assuming Name is user-facing title.
		dcModel.Title = xmp.NewAltString(img.Name)
	}

	if img.Description != nil && *img.Description != "" {
		dcModel.Description = xmp.NewAltString(*img.Description)
	}

	// 2.1 Creator / Credit
	var creator string
	if img.Owner != nil && img.Owner.FirstName != "" && img.Owner.LastName != "" {
		creator = fmt.Sprintf("%s %s", img.Owner.FirstName, img.Owner.LastName)
	} else if img.UploadedBy != nil && img.UploadedBy.FirstName != "" && img.UploadedBy.LastName != "" {
		creator = fmt.Sprintf("%s %s", img.UploadedBy.FirstName, img.UploadedBy.LastName)
	}

	if creator != "" {
		dcModel.Creator = xmp.StringList{creator}
		psModel.Credit = creator
	}

	// 3. EXIF / Technical Metadata
	if img.Exif != nil {
		// Copyright
		if img.Exif.Copyright != nil && *img.Exif.Copyright != "" {
			dcModel.Rights = xmp.NewAltString(*img.Exif.Copyright)
		}
		// Dates
		if img.Exif.DateTimeOriginal != nil {
			if t, err := xmp.ParseDate(*img.Exif.DateTimeOriginal); err == nil {
				xmpBase.CreateDate = t
				exifModel.DateTimeOriginalXMP = t
			}
		}

		if img.Exif.ModifyDate != nil {
			if t, err := xmp.ParseDate(*img.Exif.ModifyDate); err == nil {
				xmpBase.ModifyDate = t
			}
		}

		// Device Info
		if img.Exif.Make != nil {
			tiffModel.Make = *img.Exif.Make
		}

		if img.Exif.Model != nil {
			tiffModel.Model = *img.Exif.Model
		}

		if img.Exif.Software != nil {
			tiffModel.Software = *img.Exif.Software
		}

		// Lens Info
		if img.Exif.LensModel != nil {
			// exif:LensModel is standard
			exifModel.ExLensModel = *img.Exif.LensModel
		}

		// Orientation
		if img.Exif.Orientation != nil {
			orientation, err := imageops.ConvertOrientation(*img.Exif.Orientation)
			if err != nil {
				logger.Error("Failed to convert orientation", err, watermill.LogFields{
					"image_uid":   img.Uid,
					"orientation": *img.Exif.Orientation,
				})
			} else {
				tiffModel.Orientation = orientation
			}
		}

		// Camera Settings
		if img.Exif.ExposureTime != nil {
			if r := imageops.ParseRational(*img.Exif.ExposureTime); r != nil {
				exifModel.ExposureTime = *r
			}
		}

		if img.Exif.FNumber != nil {
			if r := imageops.ParseRational(*img.Exif.FNumber); r != nil {
				exifModel.FNumber = *r
			}
		} else if img.Exif.Aperture != nil {
			// Fallback to Aperture if FNumber not explicit
			if r := imageops.ParseRational(*img.Exif.Aperture); r != nil {
				exifModel.FNumber = *r
			}
		}

		if img.Exif.FocalLength != nil {
			if r := imageops.ParseRational(*img.Exif.FocalLength); r != nil {
				exifModel.FocalLength = *r
			}
		}

		if img.Exif.Iso != nil {
			// ISO can be a list in XMP, usually just one value
			// Try parsing as int
			if isoVal, err := strconv.ParseInt(*img.Exif.Iso, 10, 64); err == nil {
				exifModel.ISOSpeedRatings = xmp.IntList{int(isoVal)}
			} else {
				// Handle "ISO 400" string format
				parts := strings.FieldsSeq(*img.Exif.Iso)
				for p := range parts {
					if v, err := strconv.ParseInt(p, 10, 64); err == nil {
						exifModel.ISOSpeedRatings = xmp.IntList{int(v)}
						break
					}
				}
			}
		}

		if img.Exif.Flash != nil {
			flashVal := int64(*img.Exif.Flash)
			f := exif.Flash{}

			// Bit 0: Fired
			f.Fired = xmp.Bool((flashVal & 1) != 0)

			// Bit 1-2: Return
			// 0 = No strobe return detection function
			// 2 = Strobe return light not detected
			// 3 = Strobe return light detected
			ret := (flashVal >> 1) & 3
			f.Return = exif.FlashReturnMode(ret)

			// Bit 3-4: Mode
			// 0 = Unknown
			// 1 = Compulsory flash firing
			// 2 = Compulsory flash suppression
			// 3 = Auto mode
			mode := (flashVal >> 3) & 3
			f.Mode = exif.FlashMode(mode)

			// Bit 5: Function
			// 0 = Flash function present -> True
			// 1 = No flash function -> False
			f.Function = xmp.Bool((flashVal & 0x20) == 0)

			// Bit 6: RedEye
			f.RedEyeMode = xmp.Bool((flashVal & 0x40) != 0)

			exifModel.Flash = f
		}

		if img.Exif.WhiteBalance != nil {
			// 0 = Auto, 1 = Manual.
			// Typically we get string "Auto" or "Manual".
			lowerWB := strings.ToLower(*img.Exif.WhiteBalance)
			if strings.Contains(lowerWB, "auto") {
				exifModel.WhiteBalance = exif.WhiteBalanceAuto
			} else if strings.Contains(lowerWB, "manual") {
				exifModel.WhiteBalance = exif.WhiteBalanceManual
			}
		}

		// GPS
		if img.Exif.Latitude != nil {
			var coord exif.GPSCoord
			if err := coord.UnmarshalText([]byte(*img.Exif.Latitude)); err == nil {
				exifModel.GPSLatitude = coord
			}
		}
		if img.Exif.Longitude != nil {
			var coord exif.GPSCoord
			if err := coord.UnmarshalText([]byte(*img.Exif.Longitude)); err == nil {
				exifModel.GPSLongitude = coord
			}
		}
	}

	// 4. Register Models
	doc.AddModel(xmpBase)
	doc.AddModel(dcModel)
	doc.AddModel(exifModel)
	doc.AddModel(tiffModel)
	doc.AddModel(psModel)
	doc.AddModel(crsSettings)
	doc.AddModel(lrModel)

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
