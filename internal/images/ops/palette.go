package imageops

import (
	"bytes"
	"fmt"
	"image"
	"math"
	"sort"
)

// quantizedColor accumulates color values for a quantized bucket.
type quantizedColor struct {
	key   uint32 // quantized key (5-bit R, G, B packed)
	count int
	rSum  uint64
	gSum  uint64
	bSum  uint64
}

// ExtractPalette decodes an image from raw bytes, downsamples it via step-based
// sampling, and returns the maxColors most dominant colors as hex strings (e.g.
// "#3a4f12"). The implementation uses a bucket-based color quantization: each
// sampled pixel is quantized to 5-bit per channel (32 levels), grouped into
// buckets by quantized key, and the top buckets by pixel count are averaged to
// produce the final palette.
//
// If maxColors is <= 0, it defaults to 5. The sampling step is chosen
// dynamically to yield approximately 1024 samples regardless of image
// dimensions, keeping extraction fast even on large images.
//
// Supported image formats are those registered by Go's image package (JPEG,
// PNG, GIF via the stdlib). For unsupported formats, an error is returned.
func ExtractPalette(data []byte, maxColors int) ([]string, error) {
	if len(data) == 0 {
		return nil, fmt.Errorf("empty image data")
	}
	if maxColors <= 0 {
		maxColors = 5
	}

	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("failed to decode image: %w", err)
	}

	bounds := img.Bounds()
	w := bounds.Dx()
	h := bounds.Dy()

	if w == 0 || h == 0 {
		return nil, fmt.Errorf("image has zero dimensions")
	}

	// Choose a sampling step so we examine roughly 1024 pixels.
	targetSamples := 1024
	step := int(math.Sqrt(float64(w)*float64(h)/float64(targetSamples)) + 0.5)
	if step < 1 {
		step = 1
	}

	buckets := make(map[uint32]*quantizedColor)

	for y := bounds.Min.Y; y < bounds.Max.Y; y += step {
		for x := bounds.Min.X; x < bounds.Max.X; x += step {
			r, g, b, a := img.At(x, y).RGBA()
			// Skip fully transparent pixels.
			if a == 0 {
				continue
			}
			r8 := uint8(r >> 8)
			g8 := uint8(g >> 8)
			b8 := uint8(b >> 8)

			// Quantize to 5-bit per channel and pack into a single key.
			key := (uint32(r8/8) << 10) | (uint32(g8/8) << 5) | uint32(b8/8)

			bucket, ok := buckets[key]
			if !ok {
				bucket = &quantizedColor{key: key}
				buckets[key] = bucket
			}
			bucket.count++
			bucket.rSum += uint64(r8)
			bucket.gSum += uint64(g8)
			bucket.bSum += uint64(b8)
		}
	}

	if len(buckets) == 0 {
		return nil, fmt.Errorf("no opaque pixels found in image")
	}

	// Sort buckets by pixel count descending.
	sorted := make([]*quantizedColor, 0, len(buckets))
	for _, b := range buckets {
		sorted = append(sorted, b)
	}
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].count > sorted[j].count
	})

	// Keep at most maxColors buckets.
	if len(sorted) > maxColors {
		sorted = sorted[:maxColors]
	}

	palette := make([]string, len(sorted))
	for i, b := range sorted {
		rAvg := byte(b.rSum / uint64(b.count))
		gAvg := byte(b.gSum / uint64(b.count))
		bAvg := byte(b.bSum / uint64(b.count))
		palette[i] = fmt.Sprintf("#%02x%02x%02x", rAvg, gAvg, bAvg)
	}

	return palette, nil
}
