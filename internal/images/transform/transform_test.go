package transform

import (
	"testing"
	"viz/internal/dto"
	"viz/internal/entities"
)

func TestCreateTransformEtag(t *testing.T) {
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
			expected: "abc123hash-800x600",
		},
		{
			name: "Base plus format and quality",
			params: TransformParams{
				Width:   400,
				Height:  400,
				Format:  "webp",
				Quality: 85,
			},
			expected: "abc123hash-400x400-webp-85",
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
			expected: "abc123hash-400x400-webp-85-16",
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
			expected: "abc123hash-1200x800-jpeg-90-lanczos3",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			etag := CreateTransformEtag(img, &tt.params)
			if etag == nil {
				t.Fatalf("CreateTransformEtag returned nil")
			}
			if *etag != tt.expected {
				t.Errorf("CreateTransformEtag() = %q, expected %q", *etag, tt.expected)
			}
		})
	}
}
