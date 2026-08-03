package images

import (
	"bytes"
	"errors"
	"image"
	"image/color"

	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
)

// MaxDecodeSize is the maximum image file size (in bytes) that CalculateDHash
// will attempt to decode. Files larger than this return an error to prevent
// memory exhaustion from malformed or extremely large images.
const MaxDecodeSize = 50 << 20 // 50 MiB

// ErrImageTooLarge is returned by CalculateDHash when the input exceeds
// MaxDecodeSize, preventing memory exhaustion from oversized images.
var ErrImageTooLarge = errors.New("image too large for dHash computation")

// CalculateDHash computes a 64-bit perceptual difference hash (dHash) for the
// given image data. The hash is computed by:
//  1. Converting to grayscale and scaling to 9×8 pixels (nearest-neighbor)
//  2. Comparing horizontally adjacent pixels — if the left pixel is brighter
//     than the right, the corresponding bit is set to 1.
//
// dHash is resilient to minor colour shifts, gamma adjustments, and
// re-encoding artifacts, making it suitable for near-duplicate detection.
//
// CalculateDHash refuses to decode images larger than MaxDecodeSize (50 MiB).
func CalculateDHash(data []byte) (uint64, error) {
	if len(data) > MaxDecodeSize {
		return 0, ErrImageTooLarge
	}

	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return 0, err
	}

	// Scale to 9×8 via nearest-neighbor and convert to grayscale in one pass.
	//
	//  9-wide → 8 horizontal comparisons per row
	//  8 rows  → 64 bits total
	bounds := img.Bounds()
	srcW := bounds.Dx()
	srcH := bounds.Dy()

	pixels := make([]uint8, 9*8)

	for gy := 0; gy < 8; gy++ {
		srcY := bounds.Min.Y + (gy*srcH)/8
		if srcY >= bounds.Max.Y {
			srcY = bounds.Max.Y - 1
		}
		for gx := 0; gx < 9; gx++ {
			srcX := bounds.Min.X + (gx*srcW)/9
			if srcX >= bounds.Max.X {
				srcX = bounds.Max.X - 1
			}

			r, g, b, _ := img.At(srcX, srcY).RGBA()
			// ITU-R BT.601 luminosity: 0.299 R + 0.587 G + 0.114 B
			// RGBA() returns 16-bit values, shift down to 8-bit.
			gray := uint8((299*int(r) + 587*int(g) + 114*int(b)) / 1000 >> 8)
			pixels[gy*9+gx] = gray
		}
	}

	// Compute the difference hash from the 9×8 grayscale pixel array.
	var hash uint64
	var bit int
	for y := 0; y < 8; y++ {
		row := y * 9
		for x := 0; x < 8; x++ {
			if pixels[row+x] > pixels[row+x+1] {
				hash |= 1 << bit
			}
			bit++
		}
	}

	return hash, nil
}

// HammingDistance returns the number of differing bits between two hashes.
// This is the standard measure of perceptual distance for dHash values.
//
// There is an opportunity here to use a SIMD opperation, hence, the inclusion
// of the github.com/tphakala/simd Go module/library.
//
// This will be tested and validated to see if it's worth it
func HammingDistance(a, b uint64) int {
	x := a ^ b
	count := 0
	for x != 0 {
		x &= x - 1
		count++
	}
	return count
}

// Ensure image decoders are imported — the blank imports of image/gif,
// image/jpeg, and image/png above satisfy this.
var _ = color.GrayModel
