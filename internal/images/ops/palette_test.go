package imageops

import (
	"bytes"
	"image"
	"image/color"
	"image/png"
	"strings"
	"testing"
)

// createTestPNG creates a PNG image with solid colored quadrants.
func createTestPNG() []byte {
	img := image.NewRGBA(image.Rect(0, 0, 100, 100))

	// Fill with 4 quadrants of different colors
	for y := 0; y < 100; y++ {
		for x := 0; x < 100; x++ {
			switch {
			case x < 50 && y < 50:
				img.Set(x, y, color.RGBA{200, 50, 50, 255}) // reddish
			case x >= 50 && y < 50:
				img.Set(x, y, color.RGBA{50, 180, 50, 255}) // greenish
			case x < 50 && y >= 50:
				img.Set(x, y, color.RGBA{50, 50, 220, 255}) // blueish
			default:
				img.Set(x, y, color.RGBA{240, 240, 220, 255}) // off-white
			}
		}
	}

	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		panic(err)
	}
	return buf.Bytes()
}

// createTransparentTestPNG creates a fully transparent PNG image.
func createTransparentTestPNG() []byte {
	img := image.NewRGBA(image.Rect(0, 0, 10, 10))

	// All pixels fully transparent
	for y := 0; y < 10; y++ {
		for x := 0; x < 10; x++ {
			img.Set(x, y, color.RGBA{0, 0, 0, 0})
		}
	}

	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		panic(err)
	}
	return buf.Bytes()
}

// TestExtractPalette_ValidImage verifies that a valid PNG produces palette strings.
func TestExtractPalette_ValidImage(t *testing.T) {
	data := createTestPNG()
	palette, err := ExtractPalette(data, 5)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(palette) == 0 {
		t.Fatal("expected at least 1 color in palette")
	}

	if len(palette) > 5 {
		t.Fatalf("expected at most 5 colors, got %d", len(palette))
	}

	for i, c := range palette {
		if !strings.HasPrefix(c, "#") {
			t.Errorf("color %d missing # prefix: %s", i, c)
		}
		if len(c) != 7 {
			t.Errorf("color %d wrong length: got %d, want 7: %s", i, len(c), c)
		}
		// Verify hex characters
		for j := 1; j < len(c); j++ {
			if !((c[j] >= '0' && c[j] <= '9') || (c[j] >= 'a' && c[j] <= 'f') || (c[j] >= 'A' && c[j] <= 'F')) {
				t.Errorf("color %d invalid hex char at pos %d: %s", i, j, c)
				break
			}
		}
	}
}

// TestExtractPalette_DefaultMaxColors verifies default of 5 when maxColors <= 0.
func TestExtractPalette_DefaultMaxColors(t *testing.T) {
	data := createTestPNG()

	// With maxColors = 0 (should default to 5)
	palette, err := ExtractPalette(data, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(palette) > 5 {
		t.Fatalf("expected at most 5 colors with default, got %d", len(palette))
	}

	// With maxColors = -1 (should default to 5)
	palette2, err := ExtractPalette(data, -1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(palette2) > 5 {
		t.Fatalf("expected at most 5 colors with default, got %d", len(palette2))
	}
}

// TestExtractPalette_SmallMaxColors verifies extracting fewer colors.
func TestExtractPalette_SmallMaxColors(t *testing.T) {
	data := createTestPNG()
	palette, err := ExtractPalette(data, 2)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(palette) > 2 {
		t.Fatalf("expected at most 2 colors, got %d", len(palette))
	}
	if len(palette) == 0 {
		t.Fatal("expected at least 1 color")
	}
}

// TestExtractPalette_EmptyData verifies empty input returns error.
func TestExtractPalette_EmptyData(t *testing.T) {
	_, err := ExtractPalette(nil, 5)
	if err == nil {
		t.Fatal("expected error for nil data")
	}

	_, err = ExtractPalette([]byte{}, 5)
	if err == nil {
		t.Fatal("expected error for empty data")
	}
}

// TestExtractPalette_CorruptData verifies corrupt data returns error.
func TestExtractPalette_CorruptData(t *testing.T) {
	// Random bytes that don't form a valid image
	corruptData := []byte{0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF}
	_, err := ExtractPalette(corruptData, 5)
	if err == nil {
		t.Fatal("expected error for corrupt data")
	}
}

// TestExtractPalette_AllTransparent verifies fully transparent image behavior.
func TestExtractPalette_AllTransparent(t *testing.T) {
	data := createTransparentTestPNG()
	_, err := ExtractPalette(data, 5)
	if err == nil {
		t.Fatal("expected error for fully transparent image")
	}
}
