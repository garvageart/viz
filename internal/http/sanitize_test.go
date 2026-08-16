package http_test

import (
	"testing"

	libhttp "viz/internal/http"
)

func TestSanitizeFilename(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "clean filename unchanged",
			input:    "photo.jpg",
			expected: "photo.jpg",
		},
		{
			name:     "strips carriage return",
			input:    "evil\r.jpg",
			expected: "evil.jpg",
		},
		{
			name:     "strips newline",
			input:    "evil\n.jpg",
			expected: "evil.jpg",
		},
		{
			name:     "strips CRLF pair",
			input:    "evil\r\n.jpg",
			expected: "evil.jpg",
		},
		{
			name:     "strips null byte",
			input:    "evil\x00.jpg",
			expected: "evil.jpg",
		},
		{
			name:     "header injection attempt",
			input:    "image\r\nX-Injected: pwned.jpg",
			expected: "imageX-Injected: pwned.jpg",
		},
		{
			name:     "multi-line injection",
			input:    "file\r\n\r\n<script>alert(1)</script>.jpg",
			expected: "file<script>alert(1)</script>.jpg",
		},
		{
			name:     "empty string",
			input:    "",
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := libhttp.SanitizeFilename(tt.input)
			if result != tt.expected {
				t.Errorf("SanitizeFilename(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}
