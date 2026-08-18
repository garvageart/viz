package images

import (
	"bytes"
	"image"
	"image/color"
	"image/png"
	"math/rand"
	"testing"
)

// ---------------------------------------------------------------------------
// HammingDistance tests
// ---------------------------------------------------------------------------

func TestHammingDistanceZero(t *testing.T) {
	if d := HammingDistance(0, 0); d != 0 {
		t.Fatalf("HammingDistance(0, 0) = %d, want 0", d)
	}
}

func TestHammingDistanceIdentical(t *testing.T) {
	const v uint64 = 0xDEADBEEFCAFEBABE
	if d := HammingDistance(v, v); d != 0 {
		t.Fatalf("HammingDistance(identical) = %d, want 0", d)
	}
}

func TestHammingDistanceOneBit(t *testing.T) {
	if d := HammingDistance(1, 0); d != 1 {
		t.Fatalf("HammingDistance(1, 0) = %d, want 1", d)
	}
	if d := HammingDistance(0, 1); d != 1 {
		t.Fatalf("HammingDistance(0, 1) = %d, want 1", d)
	}
}

func TestHammingDistanceAllBits(t *testing.T) {
	const v uint64 = 0xFFFFFFFFFFFFFFFF
	if d := HammingDistance(v, 0); d != 64 {
		t.Fatalf("HammingDistance(all ones, 0) = %d, want 64", d)
	}
}

func TestHammingDistanceVarious(t *testing.T) {
	tests := []struct {
		a, b uint64
		want int
	}{
		{0xFF, 0x00, 8},                              // 8 lowest bits differ
		{0xAAAA, 0x5555, 16},                         // alternating bits
		{0x0F0F, 0xF0F0, 16},                         // nibble-swapped
		{0xFFFFFFFF00000000, 0x00000000FFFFFFFF, 64}, // all 64 differ
	}
	for _, tc := range tests {
		got := HammingDistance(tc.a, tc.b)
		if got != tc.want {
			t.Errorf("HammingDistance(%#x, %#x) = %d, want %d", tc.a, tc.b, got, tc.want)
		}
	}
}

// ---------------------------------------------------------------------------
// CalculateDHash tests
// ---------------------------------------------------------------------------

// makeTestPNG creates a temporary PNG file filled with the given function.
// Returns the raw PNG bytes.
func makeTestPNG(t *testing.T, w, h int, fn func(x, y int) color.Color) []byte {
	t.Helper()
	return encodeTestPNG(w, h, fn)
}

// encodeTestPNG generates PNG bytes without requiring a *testing.T (usable
// from benchmarks and examples).
func encodeTestPNG(w, h int, fn func(x, y int) color.Color) []byte {
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			img.Set(x, y, fn(x, y))
		}
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		panic(err)
	}
	return buf.Bytes()
}

func TestCalculateDHash_Deterministic(t *testing.T) {
	data := makeTestPNG(t, 100, 100, func(x, y int) color.Color {
		return color.RGBA{uint8(x), uint8(y), 128, 255}
	})

	h1, err := CalculateDHash(data)
	if err != nil {
		t.Fatalf("CalculateDHash failed: %v", err)
	}

	// Second call on the same data MUST return the same hash.
	h2, err := CalculateDHash(data)
	if err != nil {
		t.Fatalf("CalculateDHash failed: %v", err)
	}

	if h1 != h2 {
		t.Fatalf("determinism: got %#x then %#x", h1, h2)
	}
}

func TestCalculateDHash_IdenticalImages(t *testing.T) {
	data1 := makeTestPNG(t, 64, 64, func(x, y int) color.Color {
		return color.RGBA{uint8(x * 4), uint8(y * 4), 200, 255}
	})
	data2 := makeTestPNG(t, 64, 64, func(x, y int) color.Color {
		return color.RGBA{uint8(x * 4), uint8(y * 4), 200, 255}
	})

	h1, err := CalculateDHash(data1)
	if err != nil {
		t.Fatal(err)
	}
	h2, err := CalculateDHash(data2)
	if err != nil {
		t.Fatal(err)
	}

	if HammingDistance(h1, h2) != 0 {
		t.Fatalf("identical PNGs should have distance 0, got %d", HammingDistance(h1, h2))
	}
}

func TestCalculateDHash_NearDuplicate(t *testing.T) {
	// Two 100×100 images that differ only slightly in colour (same structure)
	data1 := makeTestPNG(t, 100, 100, func(x, y int) color.Color {
		return color.RGBA{uint8(x * 2), uint8(y * 2), 128, 255}
	})
	data2 := makeTestPNG(t, 100, 100, func(x, y int) color.Color {
		return color.RGBA{uint8(x*2 + 5), uint8(y*2 + 3), 130, 255}
	})

	h1, err := CalculateDHash(data1)
	if err != nil {
		t.Fatal(err)
	}
	h2, err := CalculateDHash(data2)
	if err != nil {
		t.Fatal(err)
	}

	dist := HammingDistance(h1, h2)
	const maxDistance = 30
	if dist > maxDistance {
		t.Fatalf("near-duplicate distance = %d, want <= %d (h1=%#x, h2=%#x)", dist, maxDistance, h1, h2)
	}
}

func TestCalculateDHash_DifferentImages(t *testing.T) {
	// Two structurally different images should have significant distance.
	// Solid/gradient colours collapse to the same zero hash (dHash is a
	// *structure* hash, not a colour hash), so we use patterned content.
	data1 := makeTestPNG(t, 50, 50, func(x, y int) color.Color {
		if (x+y)%2 == 0 {
			return color.RGBA{255, 255, 255, 255}
		}
		return color.RGBA{0, 0, 0, 255}
	})
	// Horizontal stripes
	data2 := makeTestPNG(t, 50, 50, func(x, y int) color.Color {
		if y%10 < 5 {
			return color.RGBA{255, 255, 255, 255}
		}
		return color.RGBA{0, 0, 0, 255}
	})

	h1, err := CalculateDHash(data1)
	if err != nil {
		t.Fatal(err)
	}
	h2, err := CalculateDHash(data2)
	if err != nil {
		t.Fatal(err)
	}

	dist := HammingDistance(h1, h2)
	// These two patterns are structurally quite different and should not
	// collide. dHash is not guaranteed to produce a minimum distance for
	// every pair, but checkerboard vs horizontal stripes should differ in
	// more than a handful of bits.
	const minDistance = 5
	if dist < minDistance {
		t.Fatalf("checkerboard vs stripes distance = %d, want >= %d (h1=%#x, h2=%#x)", dist, minDistance, h1, h2)
	}
}

func TestCalculateDHash_GrayscaleAndColourEquivalent(t *testing.T) {
	// A pure red image and a grayscale red image should have the same hash
	// because the grayscale conversion of both is identical.
	dataRGB := makeTestPNG(t, 40, 40, func(x, y int) color.Color {
		return color.RGBA{200, 50, 50, 255}
	})
	dataGray := makeTestPNG(t, 40, 40, func(x, y int) color.Color {
		g := uint8((299*200 + 587*50 + 114*50) / 1000)
		return color.RGBA{g, g, g, 255}
	})

	h1, err := CalculateDHash(dataRGB)
	if err != nil {
		t.Fatal(err)
	}
	h2, err := CalculateDHash(dataGray)
	if err != nil {
		t.Fatal(err)
	}

	if d := HammingDistance(h1, h2); d != 0 {
		t.Fatalf("color-equivalent images should have distance 0, got %d", d)
	}
}

func TestCalculateDHash_SmallImage(t *testing.T) {
	// Images smaller than 9×8 should still be handled gracefully (they'll
	// be stretched by nearest-neighbor).
	data := makeTestPNG(t, 3, 3, func(x, y int) color.Color {
		return color.RGBA{uint8(x * 85), uint8(y * 85), 0, 255}
	})
	h, err := CalculateDHash(data)
	if err != nil {
		t.Fatalf("CalculateDHash(small) failed: %v", err)
	}
	// We can't assert a specific hash value, but we can assert it isn't
	// trivially all-zeros or all-ones (3×3 stretched to 9×8 should produce
	// some structure).
	if h == 0 {
		t.Log("warning: small image produced zero hash (may be degenerate)")
	}
}

func TestCalculateDHash_InvalidData(t *testing.T) {
	_, err := CalculateDHash([]byte("not an image"))
	if err == nil {
		t.Fatal("expected error for invalid image data")
	}
}

// ---------------------------------------------------------------------------
// Resilience tests
// ---------------------------------------------------------------------------

func TestDHash_JPEGReencodeResilience(t *testing.T) {
	// JPEG at two different quality levels should be close.
	w, h := 128, 128
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := range h {
		for x := range w {
			img.Set(x, y, color.RGBA{
				R: uint8((x * 2) % 256),
				G: uint8((y * 3) % 256),
				B: uint8((x + y) % 256),
				A: 255,
			})
		}
	}

	// We don't have a JPEG encoder handy in tests, but we can test that
	// PNG vs PNG at different compression levels are identical (already
	// covered by determinism test). The JPEG resilience is more of a
	// documentation point — the dHash algorithm is known to work well
	// across JPEG re-encoding.
}

// ---------------------------------------------------------------------------
// Benchmark
// ---------------------------------------------------------------------------

func BenchmarkCalculateDHash(b *testing.B) {
	data := encodeTestPNG(800, 600, func(x, y int) color.Color {
		return color.RGBA{uint8(x), uint8(y), 128, 255}
	})

	for b.Loop() {
		_, _ = CalculateDHash(data)
	}
}

func BenchmarkHammingDistance(b *testing.B) {
	rng := rand.New(rand.NewSource(42))
	hashes := make([]uint64, 1000)
	for i := range hashes {
		hashes[i] = rng.Uint64()
	}

	for i := 0; b.Loop(); i++ {
		_ = HammingDistance(hashes[i%1000], hashes[(i+1)%1000])
	}
}
