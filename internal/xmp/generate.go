package xmp

import (
	"fmt"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/trimmer-io/go-xmp/models/dc"
	"github.com/trimmer-io/go-xmp/models/exif"
	"github.com/trimmer-io/go-xmp/models/ps"
	"github.com/trimmer-io/go-xmp/models/tiff"
	xmpbase "github.com/trimmer-io/go-xmp/models/xmp_base"
	"github.com/trimmer-io/go-xmp/xmp"

	"viz/internal/entities"
	"viz/internal/utils"
)

// BuildXMPDocument creates an xmp.Document containing all available metadata from img.
// The caller is responsible for calling doc.Close() when finished with the document.
func BuildXMPDocument(img entities.ImageAsset) (*xmp.Document, error) {
	doc := xmp.NewDocument()
	xmpBase := &xmpbase.XmpBase{
		CreatorTool: "Viz Image Management System",
	}

	dcModel := &dc.DublinCore{}
	exifModel := &exif.ExifInfo{}
	tiffModel := &tiff.TiffInfo{}
	psModel := &ps.PhotoshopInfo{}

	rawFileName := filepath.Base(img.ImageMetadata.FileName)
	if rawFileName == "." || rawFileName == "/" || rawFileName == "" {
		rawFileName = img.Uid
	}

	crsSettings := &CameraRawSettings{
		RawFileName:    rawFileName,
		Version:        "16.0",
		ProcessVersion: "15.0",
		HasSettings:    xmp.Bool(false),
	}
	lrModel := &LrInfo{}

	// Set SidecarForExtension to match original file extension (uppercase, without dot)
	if img.ImageMetadata.FileName != "" {
		ext := strings.ToUpper(strings.TrimPrefix(filepath.Ext(img.ImageMetadata.FileName), "."))
		if ext != "" {
			psModel.SidecarForExtension = ext
		}
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

	if len(img.Keywords) > 0 {
		keywords := make([]string, len(img.Keywords))
		for i, kw := range img.Keywords {
			keywords[i] = kw.Name
		}
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
			orientation, err := ConvertOrientation(*img.Exif.Orientation)
			if err == nil {
				tiffModel.Orientation = orientation
			}
		}

		// Camera Settings
		if img.Exif.ExposureTime != nil {
			if r := ParseRational(*img.Exif.ExposureTime); r != nil {
				exifModel.ExposureTime = *r
			}
		}

		if img.Exif.FNumber != nil {
			if r := ParseRational(*img.Exif.FNumber); r != nil {
				exifModel.FNumber = *r
			}
		} else if img.Exif.Aperture != nil {
			// Fallback to Aperture if FNumber not explicit
			if r := ParseRational(*img.Exif.Aperture); r != nil {
				exifModel.FNumber = *r
			}
		}

		if img.Exif.FocalLength != nil {
			if r := ParseRational(*img.Exif.FocalLength); r != nil {
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

	return doc, nil
}

// GenerateXMP serializes the image metadata into standard XMP XML bytes.
func GenerateXMP(img entities.ImageAsset) ([]byte, error) {
	doc, err := BuildXMPDocument(img)
	if err != nil {
		return nil, err
	}
	defer doc.Close()

	return xmp.Marshal(doc)
}

// GenerateXMPIndent serializes the image metadata into formatted XMP XML bytes with indent.
func GenerateXMPIndent(img entities.ImageAsset, prefix, indent string) ([]byte, error) {
	doc, err := BuildXMPDocument(img)
	if err != nil {
		return nil, err
	}
	defer doc.Close()

	return xmp.MarshalIndent(doc, prefix, indent)
}
