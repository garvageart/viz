package imageops

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	exif "github.com/dsoprea/go-exif/v3"
	exifcommon "github.com/dsoprea/go-exif/v3/common"
	"imagine/internal/dto"
)

func ReadExif(bytes []byte) (data map[string]any, err error) {
	exifData, err := exif.SearchAndExtractExif(bytes)
	if err != nil {
		return nil, fmt.Errorf("failed to read exif data: %w", err)
	}

	exifMap, err := exifcommon.NewIfdMappingWithStandard()
	if err != nil {
		return nil, fmt.Errorf("failed to create exif map: %w", err)
	}

	ti := exif.NewTagIndex()

	_, index, err := exif.Collect(exifMap, ti, exifData)
	if err != nil {
		return nil, fmt.Errorf("failed to collect exif data: %w", err)
	}

	mapData := make(map[string]any)
	cb := func(ifd *exif.Ifd, ite *exif.IfdTagEntry) error {
		mapData[ite.String()] = ite.Value
		return nil
	}

	err = index.RootIfd.EnumerateTagsRecursively(cb)

	if err != nil {
		return nil, fmt.Errorf("failed to enumerate exif data: %w", err)
	}

	return mapData, nil
}

// Helpers to normalize EXIF keys/values coming from libvips (exif-ifdX-*)
func CleanExifVal(s string) string {
	// Prefer human-friendly token: if value is like "10/12500 (1/1250 sec., Rational, ...)"
	// pick the first token inside parentheses before the comma. Otherwise take prefix before " ("
	s = strings.TrimSpace(s)
	if s == "" {
		return s
	}
	// Some tools return a parenthetical-only value like
	// "(                   , ASCII, 20 components, 20 bytes)" which is not useful.
	// Treat purely parenthetical metadata that contains markers like "ASCII" or
	// "components" as empty so downstream code falls back to other EXIF tags.
	if strings.HasPrefix(s, "(") {
		inner := strings.Trim(s, " ()\t\n\r")
		if inner == "" || strings.Contains(inner, "ASCII") || strings.Contains(inner, "components") || strings.Contains(inner, "bytes") {
			return ""
		}
		// Otherwise, take text up to the first comma if present
		if idx := strings.Index(inner, ","); idx > 0 {
			inner = strings.TrimSpace(inner[:idx])
		}
		return strings.TrimSpace(inner)
	}

	pIdx := strings.Index(s, " (")
	if pIdx > 0 {
		prefix := strings.TrimSpace(s[:pIdx])
		inner := s[pIdx+2:]
		end := strings.Index(inner, ")")
		if end > 0 {
			inner = inner[:end]
		}
		comma := strings.Index(inner, ",")
		if comma > 0 {
			inner = inner[:comma]
		}
		inner = strings.TrimSpace(inner)
		// If prefix looks like a fraction and inner looks like a nicer fraction/number, prefer inner
		if strings.Contains(prefix, "/") && inner != "" {
			return inner
		}
		// If inner is a wordy label (e.g., Left-bottom), prefer inner for Orientation
		if strings.HasPrefix(inner, "Top") || strings.HasPrefix(inner, "Bottom") || strings.Contains(inner, "left") || strings.Contains(inner, "right") || strings.Contains(inner, "sec") {
			return inner
		}
		return prefix
	}
	return s
}

func FindExif(exifData map[string]string, keys ...string) *string {
	if len(exifData) == 0 {
		return nil
	}
	var raw string
	search := func(k string) (string, bool) {
		if v, ok := exifData[k]; ok {
			return v, true
		}
		// Try common libvips prefixes and IFD groups
		if v, ok := exifData["exif-"+k]; ok { // rarely present but cheap to check
			return v, true
		}
		for _, ifd := range []string{"ifd0", "ifd1", "ifd2", "ifd3", "ifd4"} {
			key := "exif-" + ifd + "-" + k
			if v, ok := exifData[key]; ok {
				return v, true
			}
		}
		return "", false
	}
	for _, k := range keys {
		if v, ok := search(k); ok {
			raw = v
			break
		}
	}
	if raw == "" {
		return nil
	}
	val := CleanExifVal(raw)
	if val == "" {
		return nil
	}
	return &val
}

// BuildImageEXIF normalizes libvips EXIF map into a dto.ImageEXIF and returns
// parsed created/modified times (with sensible fallbacks).
func BuildImageEXIF(exifData map[string]string) (dto.ImageEXIF, time.Time, time.Time) {
	var out dto.ImageEXIF
	if len(exifData) == 0 {
		return out, time.Time{}, time.Time{}
	}

	out = dto.ImageEXIF{
		Aperture:         FindExif(exifData, "ApertureValue", "FNumber", "Aperture"),
		FNumber:          FindExif(exifData, "FNumber"),
		ExposureValue:    FindExif(exifData, "ExposureValue", "ExposureBiasValue"),
		Model:            FindExif(exifData, "Model"),
		Make:             FindExif(exifData, "Make"),
		ExifVersion:      FindExif(exifData, "ExifVersion"),
		DateTime:         FindExif(exifData, "DateTime", "ModifyDate"),
		DateTimeOriginal: FindExif(exifData, "DateTimeOriginal"),
		ModifyDate:       FindExif(exifData, "ModifyDate", "DateTime"),
		Iso:              FindExif(exifData, "ISO", "ISOSpeedRatings"),
		FocalLength:      FindExif(exifData, "FocalLength"),
		ExposureTime:     FindExif(exifData, "ExposureTime"),
		Flash:            FindExif(exifData, "Flash"),
		WhiteBalance:     FindExif(exifData, "WhiteBalance"),
		LensModel:        FindExif(exifData, "LensModel"),
		Rating:           FindExif(exifData, "Rating"),
		Orientation:      FindExif(exifData, "Orientation"),
		Software:         FindExif(exifData, "Software"),
		Longitude:        FindExif(exifData, "GPSLongitude", "Longitude"),
		Latitude:         FindExif(exifData, "GPSLatitude", "Latitude"),
	}
	// Normalize aperture values which may be reported in mixed formats by
	// different tools (e.g. "5.66 EV (f/7.1" or "5.66 EV (f/7.1)"). Prefer
	// the explicit f-number when available ("f/7.1"). Also trim stray
	// parenthesis left in some tool outputs and keep the value as a string.
	if out.Aperture != nil {
		s := *out.Aperture
		// Try to extract an "f/" value like f/7.1
		re := regexp.MustCompile(`f/(\d+(?:\.\d+)?)`)
		if m := re.FindStringSubmatch(s); len(m) > 1 {
			v := "f/" + m[1]
			out.Aperture = &v
		} else {
			// Fallback: remove any trailing unmatched parentheses or trailing tokens
			if idx := strings.Index(s, " ("); idx > 0 {
				trimmed := strings.TrimSpace(s[:idx])
				out.Aperture = &trimmed
			} else {
				// Also trim stray trailing parentheses
				cleaned := strings.Trim(s, "() \t\n\r")
				out.Aperture = &cleaned
			}
		}
	}

	// Ensure ExposureValue is present as a cleaned string. Some tools put EV
	// and f-number together in one token (e.g. "5.66 EV (f/7.1)"). Prefer an
	// explicit ExposureValue tag, otherwise try to extract an "X.Y EV" token
	// from the aperture/combined string.
	if out.ExposureValue == nil {
		if out.Aperture != nil {
			s := *out.Aperture
			reEV := regexp.MustCompile(`(-?\d+(?:\.\d+)?)\s*EV`)
			if m := reEV.FindStringSubmatch(s); len(m) > 1 {
				v := m[1] + " EV"
				out.ExposureValue = &v
			}
		}
		// As a final fallback, look for an explicit tag
		if out.ExposureValue == nil {
			if ev := FindExif(exifData, "ExposureValue", "ExposureBiasValue"); ev != nil {
				out.ExposureValue = ev
			}
		}
	}

	// Ensure FNumber is present as a cleaned string. Prefer explicit FNumber
	// tag; otherwise extract from the aperture/combined string (f/7.1).
	if out.FNumber == nil {
		if out.Aperture != nil {
			s := *out.Aperture
			reF := regexp.MustCompile(`f/(\d+(?:\.\d+)?)`)
			if m := reF.FindStringSubmatch(s); len(m) > 1 {
				v := "f/" + m[1]
				out.FNumber = &v
			}
		}
		if out.FNumber == nil {
			if fn := FindExif(exifData, "FNumber"); fn != nil {
				out.FNumber = fn
			}
		}
	}

	// Derive resolution from X/Y if present
	xRes := FindExif(exifData, "XResolution")
	yRes := FindExif(exifData, "YResolution")
	if xRes != nil && yRes != nil {
		resStr := fmt.Sprintf("%sx%s DPI", *xRes, *yRes)
		out.Resolution = &resStr
	}

	// Parse dates with fallback logic
	var fileCreatedAt time.Time
	var fileModifiedAt time.Time

	if cd := FindExif(exifData, "DateTimeOriginal"); cd != nil {
		if t := ConvertEXIFDateTime(*cd); t != nil {
			fileCreatedAt = *t
		}
	}

	if md := FindExif(exifData, "ModifyDate"); md != nil {
		if t := ConvertEXIFDateTime(*md); t != nil {
			fileModifiedAt = *t
		}
	}

	now := time.Now()
	if fileCreatedAt.IsZero() && fileModifiedAt.IsZero() {
		fileCreatedAt = now
		fileModifiedAt = now
	} else if fileCreatedAt.IsZero() && !fileModifiedAt.IsZero() {
		fileCreatedAt = fileModifiedAt
	} else if !fileCreatedAt.IsZero() && fileModifiedAt.IsZero() {
		fileModifiedAt = fileCreatedAt
	}

	return out, fileCreatedAt, fileModifiedAt
}
