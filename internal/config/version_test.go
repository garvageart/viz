package config

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestParseBuildDate(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected time.Time
	}{
		{
			name:     "RFC3339 format",
			input:    "2026-07-20T13:20:21Z",
			expected: time.Date(2026, 7, 20, 13, 20, 21, 0, time.UTC),
		},
		{
			name:     "Date time space format",
			input:    "2026-07-20 13:20:21",
			expected: time.Date(2026, 7, 20, 13, 20, 21, 0, time.UTC),
		},
		{
			name:     "Date only format",
			input:    "2026-07-20",
			expected: time.Date(2026, 7, 20, 0, 0, 0, 0, time.UTC),
		},
		{
			name:     "Empty input",
			input:    "",
			expected: time.Time{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			RawBuildDate = tt.input
			BuildDate = time.Time{}
			ParseBuildDate()
			assert.Equal(t, tt.expected, BuildDate)
		})
	}
}
