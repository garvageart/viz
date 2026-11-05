package imageops

import (
	"github.com/trimmer-io/go-xmp/models/tiff"

	customxmp "viz/internal/xmp"
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
	return customxmp.ConvertOrientation(orientationStr)
}
