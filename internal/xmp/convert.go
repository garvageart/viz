package xmp

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/trimmer-io/go-xmp/models/tiff"
	"github.com/trimmer-io/go-xmp/xmp"
)

// ConvertOrientation converts an EXIF orientation string value to tiff.OrientationType
// EXIF orientation values range from 1-8:
// 1 = Normal (0° rotation) / Top-left
// 2 = Mirrored horizontally / Top-right
// 3 = Rotated 180° / Bottom-right
// 4 = Mirrored vertically / Bottom-left
// 5 = Mirrored horizontally + Rotated 270° CCW / Left-top
// 6 = Rotated 90° CW / Right-top
// 7 = Mirrored horizontally + Rotated 90° CW / Right-bottom
// 8 = Rotated 270° CW / Left-bottom
func ConvertOrientation(orientationStr string) (tiff.OrientationType, error) {
	if orientationStr == "" {
		return 1, nil
	}

	// Try numeric value first
	value, err := strconv.Atoi(orientationStr)
	if err == nil {
		if value < 1 || value > 8 {
			return 0, fmt.Errorf("orientation value out of range (1-8): %d", value)
		}
		return tiff.OrientationType(value), nil
	}

	// Handle text-based orientation values
	orientationStr = strings.ToLower(strings.TrimSpace(orientationStr))
	switch orientationStr {
	case "top-left", "horizontal (normal)":
		return 1, nil
	case "top-right", "mirror horizontal":
		return 2, nil
	case "bottom-right", "rotate 180":
		return 3, nil
	case "bottom-left", "mirror vertical":
		return 4, nil
	case "left-top", "mirror horizontal and rotate 270 cw":
		return 5, nil
	case "right-top", "rotate 90 cw":
		return 6, nil
	case "right-bottom", "mirror horizontal and rotate 90 cw":
		return 7, nil
	case "left-bottom", "rotate 270 cw":
		return 8, nil
	default:
		return 0, fmt.Errorf("unknown orientation: %s", orientationStr)
	}
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
