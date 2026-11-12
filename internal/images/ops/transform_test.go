package imageops

import (
	"strings"
	"testing"
	"viz/internal/dto"
	"viz/internal/entities"
)

func TestImageTransformETag(t *testing.T) {
	img := entities.ImageAsset{
		Uid: "test-uid",
		ImageMetadata: dto.ImageMetadata{
			Checksum: "abc123hash",
		},
	}

	tests := []struct {
		name     string
		params   TransformParams
		expected string
	}{
		{
			name: "Only hardcoded base",
			params: TransformParams{
				Width:  800,
				Height: 600,
			},
			expected: "abc123hash-0-800x600--85-0--lanczos3-0-dimensions-sRGB-all-false",
		},
		{
			name: "Base plus format and quality",
			params: TransformParams{
				Width:   400,
				Height:  400,
				Format:  "webp",
				Quality: 85,
			},
			expected: "abc123hash-0-400x400-webp-85-0--lanczos3-0-dimensions-sRGB-all-false",
		},
		{
			name: "Base plus format, quality, and non-zero bitdepth",
			params: TransformParams{
				Width:    400,
				Height:   400,
				Format:   "webp",
				Quality:  85,
				BitDepth: 16,
			},
			expected: "abc123hash-0-400x400-webp-85-0--lanczos3-16-dimensions-sRGB-all-false",
		},
		{
			name: "With format, rotate, and kernel",
			params: TransformParams{
				Width:  1200,
				Height: 800,
				Format: "jpeg",
				Rotate: 90,
				Kernel: "lanczos3",
			},
			expected: "abc123hash-0-1200x800-jpeg-85-90--lanczos3-0-dimensions-sRGB-all-false",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			transform := &ImageTransform{TransformParams: tt.params, Image: img}
			etag := transform.ETag()
			if etag != tt.expected {
				t.Errorf("TransformParams.ETag() = %q, expected %q", etag, tt.expected)
			}
		})
	}
}

func TestETagIncludesAllOutputOptions(t *testing.T) {
	image := entities.ImageAsset{ImageMetadata: dto.ImageMetadata{Checksum: "sum", FileType: "jpeg"}}
	baseTransform := &ImageTransform{Image: image}
	base := baseTransform.ETag()
	changed := []TransformParams{
		{ResizeMode: ResizeLongEdge, Width: 800},
		{ColorSpace: ColorSpaceDisplayP3},
		{Metadata: MetadataNone},
		{IncludeLocation: true},
		{BitDepth: 16},
	}
	for _, params := range changed {
		transform := &ImageTransform{TransformParams: params, Image: image}
		if got := transform.ETag(); !strings.Contains(got, "sum-") || got == base {
			t.Errorf("ETag for %+v = %q, want distinct key from %q", params, got, base)
		}
	}
}
