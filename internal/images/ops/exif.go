package imageops

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"viz/internal/dto"

	exif "github.com/dsoprea/go-exif/v3"
	exifcommon "github.com/dsoprea/go-exif/v3/common"
	"github.com/trimmer-io/go-xmp/xmp"
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

// CleanDescription removes common encoding artifacts (such as ASCII headers in UserComment)
func CleanDescription(s string) string {
	s = strings.TrimSpace(s)
	lower := strings.ToLower(s)
	if strings.HasPrefix(lower, "charset=ascii ") {
		s = strings.TrimSpace(s[14:])
	} else if strings.HasPrefix(lower, "ascii") {
		s = strings.TrimSpace(strings.TrimPrefix(s, "ASCII"))
		s = strings.Trim(s, "\x00 \t\n\r")
	} else if strings.HasPrefix(lower, "unicode") {
		s = strings.TrimSpace(strings.TrimPrefix(s, "UNICODE"))
		s = strings.Trim(s, "\x00 \t\n\r")
	}
	return s
}

// GetExifDescription searches and cleans description/comment tags from EXIF map
func GetExifDescription(exifData map[string]string) *string {
	descPtr := FindExif(exifData, "ImageDescription", "UserComment", "Description", "Comment", "Caption-Abstract", "XPComment")
	if descPtr == nil {
		return nil
	}

	cleaned := CleanDescription(*descPtr)
	if cleaned == "" {
		return nil
	}

	return &cleaned
}

// CleanRawExifMap produces a clean map of all raw EXIF tags with human-readable keys
func CleanRawExifMap(exifData map[string]string) *map[string]string {
	if len(exifData) == 0 {
		return nil
	}

	out := make(map[string]string, len(exifData))
	for k, v := range exifData {
		cleanedVal := CleanExifVal(v)
		if cleanedVal == "" {
			continue
		}

		key := strings.TrimPrefix(k, "exif-")
		for _, ifd := range []string{"ifd0-", "ifd1-", "ifd2-", "ifd3-", "ifd4-"} {
			key = strings.TrimPrefix(key, ifd)
		}
		out[key] = cleanedVal
	}

	if len(out) == 0 {
		return nil
	}
	return &out
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

func FindExifInt(exifData map[string]string, keys ...string) *int {
	s := FindExif(exifData, keys...)
	if s == nil {
		return nil
	}
	// Try parsing as int (can be hex if 0x prefix)
	if v, err := strconv.ParseInt(*s, 0, 32); err == nil {
		i := int(v)
		return &i
	}
	return nil
}

// HandleExifQuirks applies post-hoc corrections and enrichments that the primary
// EXIF extraction (libvips) cannot handle — for example, MakerNote proprietary
// tags that libvips never surfaces.
//
// Currently handled quirks:
//   - FujiFilm ColorTemperature (MakerNote tag 0x1005) via GoMetadata parsing
func HandleExifQuirks(exif *dto.ImageEXIF, rawData []byte) {
	if exif == nil || len(rawData) == 0 {
		return
	}

	// ColorTemperature: libvips doesn't parse MakerNote proprietary tags.
	// Fall back to GoMetadata which handles the FujiFilm MakerNote IFD
	// (8-byte "FUJIFILM" prefix + LE IFD at offset [12..15]).
	if exif.ColorTemperature == nil {
		if ct := ExtractFujiColorTemperature(rawData); ct != nil {
			exif.ColorTemperature = ct
		}
	}
}

// BuildImageEXIF normalizes libvips EXIF map into a dto.ImageEXIF and returns
// parsed created/modified times (with sensible fallbacks).
func BuildImageEXIF(exifData map[string]string) (dto.ImageEXIF, time.Time, time.Time) {
	var out dto.ImageEXIF
	if len(exifData) == 0 {
		return out, time.Time{}, time.Time{}
	}

	out = dto.ImageEXIF{
		Aperture:                 FindExif(exifData, "ApertureValue", "FNumber", "Aperture"),
		FNumber:                  FindExif(exifData, "FNumber"),
		ExposureValue:            FindExif(exifData, "ExposureValue", "ExposureBiasValue"),
		ExposureBiasValue:        FindExif(exifData, "ExposureBiasValue", "ExposureCompensation"),
		ExposureMode:             FindExif(exifData, "ExposureMode"),
		ExposureProgram:          FindExif(exifData, "ExposureProgram"),
		MeteringMode:             FindExif(exifData, "MeteringMode"),
		SceneCaptureType:         FindExif(exifData, "SceneCaptureType", "SceneType"),
		LightSource:              FindExif(exifData, "LightSource"),
		MaxApertureValue:         FindExif(exifData, "MaxApertureValue"),
		DigitalZoomRatio:         FindExif(exifData, "DigitalZoomRatio"),
		SensingMethod:            FindExif(exifData, "SensingMethod"),
		Model:                    FindExif(exifData, "Model"),
		Make:                     FindExif(exifData, "Make"),
		LensMake:                 FindExif(exifData, "LensMake"),
		LensModel:                FindExif(exifData, "LensModel"),
		FocalLength:              FindExif(exifData, "FocalLength"),
		FocalLengthIn35mmFormat:  FindExif(exifData, "FocalLengthIn35mmFilm", "FocalLengthIn35mmFormat", "FocalLength35efl", "FocalLengthIn35mm"),
		FocalPlaneXResolution:    FindExif(exifData, "FocalPlaneXResolution"),
		FocalPlaneYResolution:    FindExif(exifData, "FocalPlaneYResolution"),
		FocalPlaneResolutionUnit: FindExif(exifData, "FocalPlaneResolutionUnit"),
		ExifVersion:              FindExif(exifData, "ExifVersion"),
		DateTime:                 FindExif(exifData, "DateTime", "ModifyDate"),
		DateTimeOriginal:         FindExif(exifData, "DateTimeOriginal"),
		ModifyDate:               FindExif(exifData, "ModifyDate", "DateTime"),
		Iso:                      FindExif(exifData, "ISO", "ISOSpeedRatings"),
		ExposureTime:             FindExif(exifData, "ExposureTime"),
		Flash:                    FindExifInt(exifData, "Flash"),
		WhiteBalance:             FindExif(exifData, "WhiteBalance"),
		ColorTemperature:         FindExif(exifData, "ColorTemperature", "ColorTemp", "Kelvin", "Temperature"),
		Rating:                   FindExif(exifData, "Rating"),
		Orientation:              FindExif(exifData, "Orientation"),
		Software:                 FindExif(exifData, "Software"),
		Artist:                   FindExif(exifData, "Artist", "Author", "Creator", "By-line"),
		Copyright:                FindExif(exifData, "Copyright", "Rights", "CopyrightNotice"),
		Longitude:                FindExif(exifData, "GPSLongitude", "Longitude"),
		Latitude:                 FindExif(exifData, "GPSLatitude", "Latitude"),
		GpsAltitude:              FindExif(exifData, "GPSAltitude"),
		GpsImgDirection:          FindExif(exifData, "GPSImgDirection"),
		GpsImgDirectionRef:       FindExif(exifData, "GPSImgDirectionRef"),
		GpsSpeed:                 FindExif(exifData, "GPSSpeed"),
		GpsSpeedRef:              FindExif(exifData, "GPSSpeedRef"),
		OffsetTime:               FindExif(exifData, "OffsetTime"),
		OffsetTimeOriginal:       FindExif(exifData, "OffsetTimeOriginal"),
		OffsetTimeDigitized:      FindExif(exifData, "OffsetTimeDigitized"),
		Raw:                      CleanRawExifMap(exifData),
	}

	// Handle quirks
	// --
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

	// Normalize MaxApertureValue (e.g. "3.60 EV (f/3.5)" -> "f/3.5", "3.5" -> "f/3.5")
	if out.MaxApertureValue != nil {
		s := strings.TrimSpace(*out.MaxApertureValue)
		reF := regexp.MustCompile(`f/(\d+(?:\.\d+)?)`)
		if m := reF.FindStringSubmatch(s); len(m) > 1 {
			v := "f/" + m[1]
			out.MaxApertureValue = &v
		} else if _, err := strconv.ParseFloat(s, 64); err == nil {
			v := "f/" + s
			out.MaxApertureValue = &v
		} else {
			cleaned := strings.Trim(s, "() \t\n\r")
			out.MaxApertureValue = &cleaned
		}
	}

	// Normalize ExposureBiasValue (e.g. "+0.67" -> "+0.67 EV")
	if out.ExposureBiasValue != nil {
		s := strings.TrimSpace(*out.ExposureBiasValue)
		if s != "" && !strings.HasSuffix(s, "EV") && !strings.HasSuffix(s, "ev") {
			v := s + " EV"
			out.ExposureBiasValue = &v
		}
	}

	// Normalize FocalLengthIn35mmFormat (e.g. "52" -> "52 mm")
	if out.FocalLengthIn35mmFormat != nil {
		s := strings.TrimSpace(*out.FocalLengthIn35mmFormat)
		if s != "" && !strings.HasSuffix(s, "mm") && !strings.HasSuffix(s, " mm") {
			if _, err := strconv.ParseFloat(s, 64); err == nil {
				v := s + " mm"
				out.FocalLengthIn35mmFormat = &v
			}
		}
	}

	// Parse dates with fallback logic
	var fileCreatedAt time.Time
	var fileModifiedAt time.Time

	effectiveOffsetOriginal := GetEffectiveExifOffset(&out)

	// Determine the effective offset for ModifyDate and DateTime
	effectiveOffsetMod := out.OffsetTime
	if effectiveOffsetMod == nil && out.OffsetTimeOriginal != nil && *out.OffsetTimeOriginal != "+00:00" {
		effectiveOffsetMod = out.OffsetTimeOriginal
	}
	if effectiveOffsetMod == nil && out.OffsetTimeDigitized != nil && *out.OffsetTimeDigitized != "+00:00" {
		effectiveOffsetMod = out.OffsetTimeDigitized
	}

	if cd := FindExif(exifData, "DateTimeOriginal"); cd != nil {
		if t, ok := ParseExifDate(cd, effectiveOffsetOriginal); ok {
			fileCreatedAt = t
		} else if effectiveOffsetOriginal != nil { // Retry without offset if combined failed
			if t, ok := ParseExifDate(cd); ok {
				fileCreatedAt = t
			}
		}
	}

	if md := FindExif(exifData, "ModifyDate"); md != nil {
		if t, ok := ParseExifDate(md, effectiveOffsetMod); ok {
			fileModifiedAt = t
		} else if effectiveOffsetMod != nil { // Retry without offset if combined failed
			if t, ok := ParseExifDate(md); ok {
				fileModifiedAt = t
			}
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

// GetEffectiveExifOffset determines the best offset for DateTimeOriginal by prioritizing
// non-zero offsets, as some cameras write a zero offset incorrectly.
func GetEffectiveExifOffset(exif *dto.ImageEXIF) *string {
	if exif == nil {
		return nil
	}

	if exif.OffsetTimeOriginal != nil && *exif.OffsetTimeOriginal != "+00:00" {
		return exif.OffsetTimeOriginal
	}
	if exif.OffsetTimeDigitized != nil && *exif.OffsetTimeDigitized != "+00:00" {
		return exif.OffsetTimeDigitized
	}
	if exif.OffsetTime != nil && *exif.OffsetTime != "+00:00" {
		return exif.OffsetTime
	}

	// Fallback to original offset if all are zero or nil
	return exif.OffsetTimeOriginal
}

// ParseRational attempts to parse strings like "1/500", "f/1.8", "50", "50 mm" into xmp.Rational
func ParseRational(s string) *xmp.Rational {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}

	// Remove common units/prefixes
	s = strings.TrimPrefix(s, "f/")
	s = strings.TrimSuffix(s, " mm")
	s = strings.TrimSuffix(s, " sec")
	s = strings.TrimSuffix(s, " s")

	// Try fraction "1/500"
	if strings.Contains(s, "/") {
		parts := strings.Split(s, "/")
		if len(parts) == 2 {
			num, err1 := strconv.ParseInt(strings.TrimSpace(parts[0]), 10, 64)
			den, err2 := strconv.ParseInt(strings.TrimSpace(parts[1]), 10, 64)
			if err1 == nil && err2 == nil && den != 0 {
				return &xmp.Rational{Num: num, Den: den}
			}
		}
	}

	// Try decimal "1.8" -> 18/10
	if strings.Contains(s, ".") {
		f, err := strconv.ParseFloat(s, 64)
		if err == nil {
			// Convert float to rational approximation
			// Simple approach: multiply by precision
			const precision = 10000
			num := int64(f * precision)
			return &xmp.Rational{Num: num, Den: precision}
		}
	}

	// Try integer "50" -> 50/1
	if i, err := strconv.ParseInt(s, 10, 64); err == nil {
		return &xmp.Rational{Num: i, Den: 1}
	}

	return nil
}
