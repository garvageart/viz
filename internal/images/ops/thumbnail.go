package imageops

import (
	"fmt"
	"image"

	libvips "viz/internal/images/ops/vips"

	"github.com/galdor/go-thumbhash"
)

// CreateThumbnailWithSize creates a thumbnail using libvips from the input image bytes.
//
// Behaviour:
// - Respects EXIF orientation (auto-rotate) via libvips thumbnail operation.
// - If height is 0, only width is constrained and aspect ratio is preserved.
// - If both width and height are provided (>0), libvips will fit within bounds; cropping is not enabled by default.
// - Output encoding is JPEG (binary bytes), suitable for saving with .jpeg extension.
func CreateThumbnailWithSize(imgBytes []byte, width, height int) ([]byte, error) {
	if len(imgBytes) == 0 {
		return nil, fmt.Errorf("no image data provided")
	}

	opts := libvips.DefaultThumbnailBufferOptions()
	opts.NoRotate = false
	opts.Height = height

	// Ensure we export to sRGB, handling CMYK/ProPhoto/etc correctly
	// Note: vips_thumbnail handles simple colorspace conversion, but explicit ICC export is better
	opts.OutputProfile = "srgb" // Target sRGB for web
	// InputProfile is a FALLBACK. If the image has an embedded profile, vips uses that.
	// If it has none (e.g. untagged CMYK), it assumes this profile.
	opts.InputProfile = "srgb"

	thumb, err := libvips.NewThumbnailBuffer(imgBytes, width, opts)
	if err != nil {
		return nil, fmt.Errorf("thumbnail generation failed: %w", err)
	}
	defer thumb.Close()

	jpegOpts := libvips.DefaultJpegsaveBufferOptions()
	data, err := thumb.JpegsaveBuffer(jpegOpts)
	if err != nil {
		return nil, fmt.Errorf("thumbnail encode failed: %w", err)
	}
	return data, nil
}

func GenerateThumbhash(img image.Image) (hash []byte, err error) {
	hashBytes := thumbhash.EncodeImage(img)
	return hashBytes, nil
}

// DownscaleTo32x32 resizes img to 32×32 using nearest-neighbor sampling.
// This avoids a second libvips call and a JPEG encode→decode cycle when the
// image is only needed for thumbhash generation.
func DownscaleTo32x32(img image.Image) image.Image {
	const targetSize = 32
	bounds := img.Bounds()
	srcW := bounds.Dx()
	srcH := bounds.Dy()
	if srcW == 0 || srcH == 0 {
		return img
	}

	dst := image.NewRGBA(image.Rect(0, 0, targetSize, targetSize))

	for dy := range targetSize {
		srcY := bounds.Min.Y + (dy*srcH)/targetSize
		if srcY >= bounds.Max.Y {
			srcY = bounds.Max.Y - 1
		}
		for dx := range targetSize {
			srcX := bounds.Min.X + (dx*srcW)/targetSize
			if srcX >= bounds.Max.X {
				srcX = bounds.Max.X - 1
			}
			dst.Set(dx, dy, img.At(srcX, srcY))
		}
	}

	return dst
}
