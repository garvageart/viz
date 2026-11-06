package imageops

import (
	"testing"
)

func TestParseGPSCoordinate(t *testing.T) {
	tests := []struct {
		name     string
		rawCoord string
		rawRef   string
		expected string
	}{
		{
			name:     "libvips rational string with South reference",
			rawCoord: "26/1 1304035/100000 0/1 (26, 13.04035,  0, Rational, 3 components, 24 bytes)",
			rawRef:   "S",
			expected: "-26.217339",
		},
		{
			name:     "libvips rational string with East reference",
			rawCoord: "28/1 2734733/1000000 0/1 (28, 2.734733,  0, Rational, 3 components, 24 bytes)",
			rawRef:   "E",
			expected: "28.045579",
		},
		{
			name:     "standard DMS rationals with North reference",
			rawCoord: "48/1 51/1 24/1",
			rawRef:   "N",
			expected: "48.856667",
		},
		{
			name:     "standard DMS rationals with West reference",
			rawCoord: "2/1 21/1 4/1",
			rawRef:   "W",
			expected: "-2.351111",
		},
		{
			name:     "already decimal degrees",
			rawCoord: "-26.217339",
			rawRef:   "",
			expected: "-26.217339",
		},
		{
			name:     "parentheses only",
			rawCoord: "(26, 13.04035, 0, Rational, 3 components, 24 bytes)",
			rawRef:   "S",
			expected: "-26.217339",
		},
		{
			name:     "DMS text with embedded direction",
			rawCoord: "26 deg 13' 2.42\" S",
			rawRef:   "",
			expected: "-26.217339",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			res := ParseGPSCoordinate(tc.rawCoord, tc.rawRef)
			if res == nil {
				t.Fatalf("expected %s, got nil", tc.expected)
			}
			if *res != tc.expected {
				t.Errorf("expected %s, got %s", tc.expected, *res)
			}
		})
	}

	// Test nil on empty input
	if res := ParseGPSCoordinate("", ""); res != nil {
		t.Errorf("expected nil for empty input, got %s", *res)
	}
}

func TestBuildImageEXIF_GPS(t *testing.T) {
	rawMap := map[string]string{
		"exif-ifd3-GPSLatitude":     "26/1 1304035/100000 0/1 (26, 13.04035,  0, Rational, 3 components, 24 bytes)",
		"exif-ifd3-GPSLatitudeRef":  "S (S, ASCII, 2 components, 2 bytes)",
		"exif-ifd3-GPSLongitude":    "28/1 2734733/1000000 0/1 (28, 2.734733,  0, Rational, 3 components, 24 bytes)",
		"exif-ifd3-GPSLongitudeRef": "E (E, ASCII, 2 components, 2 bytes)",
		"exif-ifd3-GPSAltitude":     "177300/100 (1773.00, Rational, 1 components, 8 bytes)",
		"exif-ifd3-GPSSpeed":        "0/10 (0.0, Rational, 1 components, 8 bytes)",
		"exif-ifd3-GPSSpeedRef":     "K (K, ASCII, 2 components, 2 bytes)",
	}

	exif, _, _ := BuildImageEXIF(rawMap)

	if exif.Latitude == nil || *exif.Latitude != "-26.217339" {
		t.Errorf("expected latitude -26.217339, got %v", exif.Latitude)
	}
	if exif.Longitude == nil || *exif.Longitude != "28.045579" {
		t.Errorf("expected longitude 28.045579, got %v", exif.Longitude)
	}
	if exif.GpsAltitude == nil || *exif.GpsAltitude != "1773.00" {
		t.Errorf("expected altitude 1773.00, got %v", exif.GpsAltitude)
	}
	if exif.GpsSpeed == nil || *exif.GpsSpeed != "0.0" {
		t.Errorf("expected speed 0.0, got %v", exif.GpsSpeed)
	}
	if exif.GpsSpeedRef == nil || *exif.GpsSpeedRef != "K" {
		t.Errorf("expected speed ref K, got %v", exif.GpsSpeedRef)
	}

	if exif.Raw != nil {
		raw := *exif.Raw
		if raw["GPSLatitude"] != "-26.217339" {
			t.Errorf("expected raw GPSLatitude -26.217339, got %s", raw["GPSLatitude"])
		}
		if raw["GPSLongitude"] != "28.045579" {
			t.Errorf("expected raw GPSLongitude 28.045579, got %s", raw["GPSLongitude"])
		}
	}
}
