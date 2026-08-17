package imageops

import (
	"bytes"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"os"
	"strings"
	"time"

	"viz/internal/config"
	"viz/internal/dto"
	"viz/internal/entities"
	libvips "viz/internal/images/ops/vips"
	libos "viz/internal/os"
)

type LibvipsImage struct {
	Height float64
	Width  float64
	Ref    *libvips.Image
}

var (
	DefaultWriteFileOptions = &libos.OsPerm{
		DirPerm:  os.ModePerm,
		FilePerm: os.ModePerm,
	}
)

func GetColourSpaceString(image *libvips.Image) string {
	if image.Interpretation() == libvips.InterpretationError {
		return "Error"
	} else if image.Interpretation() == libvips.InterpretationMultiband {
		return "Multiband"
	} else if image.Interpretation() == libvips.InterpretationBW {
		return "BW"
	} else if image.Interpretation() == libvips.InterpretationHistogram {
		return "Histogram"
	} else if image.Interpretation() == libvips.InterpretationXyz {
		return "XYZ"
	} else if image.Interpretation() == libvips.InterpretationLab {
		return "LAB"
	} else if image.Interpretation() == libvips.InterpretationCmyk {
		return "CMYK"
	} else if image.Interpretation() == libvips.InterpretationLabq {
		return "LabQ"
	} else if image.Interpretation() == libvips.InterpretationRgb {
		return "RGB"
	} else if image.Interpretation() == libvips.InterpretationCmc {
		return "CMC"
	} else if image.Interpretation() == libvips.InterpretationLch {
		return "LCH"
	} else if image.Interpretation() == libvips.InterpretationLabs {
		return "LABS"
	} else if image.Interpretation() == libvips.InterpretationSrgb {
		return "sRGB"
	} else if image.Interpretation() == libvips.InterpretationYxy {
		return "YXY"
	} else if image.Interpretation() == libvips.InterpretationFourier {
		return "Fourier"
	} else if image.Interpretation() == libvips.InterpretationRgb16 {
		return "RGB16"
	} else if image.Interpretation() == libvips.InterpretationGrey16 {
		return "Grey16"
	} else if image.Interpretation() == libvips.InterpretationMatrix {
		return "Matrix"
	} else if image.Interpretation() == libvips.InterpretationScrgb {
		return "scRGB"
	} else if image.Interpretation() == libvips.InterpretationHsv {
		return "HSV"
	}

	return "Unknown"
}

func ScaleProportionally(lv *libvips.Image, width int, height int) (*libvips.Image, error) {
	image := lv

	originalWidth := image.Width()
	originalHeight := image.Height()
	scale := 1.0

	outputHeightScale := float64(height) / float64(originalHeight)
	outputWidthScale := float64(width) / float64(originalWidth)

	// This is probably unnecessary but whatever
	if originalWidth > originalHeight {
		scale = float64(outputHeightScale)
	} else {
		scale = float64(outputWidthScale)
	}

	err := image.Resize(scale, libvips.DefaultResizeOptions())
	if err != nil {
		return nil, err
	}

	return image, nil
}

func ReadToImage(imgBytes []byte) (image.Image, string, error) {
	img, str, err := image.Decode(bytes.NewReader(imgBytes))
	return img, str, err
}

// ConvertEXIFDateTime parses an EXIF date-time string using the same format
// list as ParseExifDate. It returns nil if parsing fails.
// Deprecated: Prefer ParseExifDate for new code — it supports optional timezone
// offsets and returns a (time.Time, bool) pair.
func ConvertEXIFDateTime(exifDateTime string) *time.Time {
	if exifDateTime == "" {
		return nil
	}
	if t, ok := ParseExifDate(&exifDateTime); ok {
		return &t
	}
	return nil
}

// WarmupAllOps forces libvips to instantiate a set of commonly-used
// operations so the corresponding modules/plugins are loaded eagerly.
// Call this after SetLogging (so libvips logs are routed) and after
// Startup (Startup is called internally by HasOperation). This reduces
// first-request latency by avoiding lazy loading when the operation is
// first used.
func WarmupAllOps(cfg config.LibvipsConfig) {
	// Configure VIPS for optimal performance
	vipsConfig := &libvips.Config{
		ConcurrencyLevel: cfg.Concurrency,
		MaxCacheFiles:    cfg.CacheMaxFiles,
		MaxCacheMem:      cfg.CacheMaxMemoryMB * 1024 * 1024,
		MaxCacheSize:     cfg.CacheMaxOperations,
		ReportLeaks:      false,
		CacheTrace:       false,
		VectorEnabled:    cfg.VectorEnabled,
	}

	// ensure vips is started with optimized config
	libvips.Startup(vipsConfig)

	ops := []string{
		// common loaders/savers and ops that trigger plugin loading
		"jpegload", "jpegload_buffer", "jpegsave", "jpegsave_buffer",
		"pngload", "pngsave", "pngsave_buffer",
		"webpload", "webpsave",
		"gifload", "gifload_buffer", "gifsave", "gifsave_buffer",
		"heifload", "heifload_buffer", "heifsave", "heifsave_buffer",
		"jxlload", "jxlload_buffer", "jxlsave", "jxlsave_buffer",
		"jp2kload", "jp2kload_buffer", "jp2ksave", "jp2ksave_buffer",
		"magickload", "magickload_buffer", "magicksave",
		"pdfload", "pdfload_buffer",
		"openslideload", "openslideload_source",
		"tiffload", "tiffsave",
		"fitsload",
		// a few generic/core ops to exercise vips core
		"resize", "thumbnail", "dzsave", "dzsave_buffer",
	}

	for _, name := range ops {
		// HasOperation will call Startup if needed and will invoke
		// vips_operation_new which causes the plugin that provides
		// the operation to be loaded.
		_ = libvips.HasOperation(name)
	}
}

// ParseExifDate tries several common EXIF/ISO formats and returns the parsed time if successful.
// It accepts optional offset strings (e.g. "+02:00") which are tried in order by appending
// them to the primary date string before parsing.
func ParseExifDate(s *string, offsets ...*string) (time.Time, bool) {
	if s == nil {
		return time.Time{}, false
	}
	str := strings.TrimSpace(*s)
	if str == "" {
		return time.Time{}, false
	}

	// Common EXIF: "2006:01:02 15:04:05"
	layouts := []string{
		"2006:01:02 15:04:05",
		"2006:01:02 15:04:05-07:00",
		"2006:01:02 15:04",
		time.RFC3339,
		"2006-01-02 15:04:05",
		"2006-01-02",
	}

	// Try with offsets first
	for _, offsetPtr := range offsets {
		if offsetPtr == nil {
			continue
		}
		offset := strings.TrimSpace(*offsetPtr)
		if offset == "" {
			continue
		}
		combined := str + offset
		for _, l := range layouts {
			if t, err := time.Parse(l, combined); err == nil {
				return t, true
			}
		}
	}

	// Fallback to primary string without extra offsets
	for _, l := range layouts {
		if t, err := time.Parse(l, str); err == nil {
			return t, true
		}
	}

	// Try a best-effort replacement: convert first two ':' into '-' for date part
	// e.g. 2020:01:02 12:00:00 -> 2020-01-02 12:00:00
	if len(str) >= 10 {
		datePart := str[:10]
		replaced := strings.Replace(datePart, ":", "-", 2)
		candidate := replaced
		if len(str) > 10 {
			candidate += str[10:]
		}
		for _, l := range layouts {
			if t, err := time.Parse(l, candidate); err == nil {
				return t, true
			}
		}
	}

	return time.Time{}, false
}

// getTakenAt returns the most appropriate taken/creation timestamp for an image,
// Priority: EXIF Original -> EXIF Modify -> metadata file_created_at -> image.created_at
func GetTakenAt(img entities.ImageAsset) time.Time {
	// Try EXIF fields first
	if img.Exif != nil {
		if img.Exif.DateTimeOriginal != nil {
			effectiveOffset := GetEffectiveExifOffset(img.Exif)
			if t, ok := ParseExifDate(img.Exif.DateTimeOriginal, effectiveOffset); ok {
				return t
			}
		}

		if t, ok := ParseExifDate(img.Exif.DateTime, img.Exif.OffsetTime); ok {
			return t
		}
		if t, ok := ParseExifDate(img.Exif.ModifyDate, img.Exif.OffsetTime); ok {
			return t
		}
	}

	if img.ImageMetadata != nil {
		if !img.ImageMetadata.FileCreatedAt.IsZero() {
			return img.ImageMetadata.FileCreatedAt
		}
		if !img.ImageMetadata.FileModifiedAt.IsZero() {
			return img.ImageMetadata.FileModifiedAt
		}
	}

	if !img.CreatedAt.IsZero() {
		return img.CreatedAt
	}

	return time.Now()
}

// LessByTakenAtDesc returns true if image `a` should sort before image `b` when
// ordering by taken-at descending (newest first). If taken-at timestamps are
// equal it falls back to Name descending to provide a stable ordering that
// matches the client-side comparator.
func LessByTakenAtDesc(a, b entities.ImageAsset) bool {
	ta := GetTakenAt(a)
	tb := GetTakenAt(b)

	if ta.Equal(tb) {
		return a.Name > b.Name
	}

	return ta.After(tb)
}

// HasExifDateTime returns true if the EXIF metadata contains a valid, parseable date/time.
func HasExifDateTime(exif *dto.ImageEXIF) bool {
	if exif == nil {
		return false
	}

	if exif.DateTimeOriginal != nil {
		effectiveOffset := GetEffectiveExifOffset(exif)
		if _, ok := ParseExifDate(exif.DateTimeOriginal, effectiveOffset); ok {
			return true
		}
	}

	if exif.DateTime != nil {
		if _, ok := ParseExifDate(exif.DateTime, exif.OffsetTime); ok {
			return true
		}
	}

	if exif.ModifyDate != nil {
		if _, ok := ParseExifDate(exif.ModifyDate, exif.OffsetTime); ok {
			return true
		}
	}

	return false
}
