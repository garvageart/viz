package imageops

import (
	"os"
	"testing"
	"viz/internal/dto"
	"viz/internal/utils"
)

func TestHasExifDateTime(t *testing.T) {
	// Case 1: nil exif
	if HasExifDateTime(nil) {
		t.Error("Expected false for nil exif")
	}

	// Case 2: empty exif
	emptyExif := &dto.ImageEXIF{}
	if HasExifDateTime(emptyExif) {
		t.Error("Expected false for empty exif")
	}

	// Case 3: DateTimeOriginal is set
	withDateTimeOriginal := &dto.ImageEXIF{
		DateTimeOriginal: utils.StringPtr("2026:07:12 12:00:00"),
	}
	if !HasExifDateTime(withDateTimeOriginal) {
		t.Error("Expected true for exif with DateTimeOriginal")
	}

	// Case 4: DateTime is set
	withDateTime := &dto.ImageEXIF{
		DateTime: utils.StringPtr("2026:07:12 12:00:00"),
	}
	if !HasExifDateTime(withDateTime) {
		t.Error("Expected true for exif with DateTime")
	}

	// Case 5: ModifyDate is set
	withModifyDate := &dto.ImageEXIF{
		ModifyDate: utils.StringPtr("2026:07:12 12:00:00"),
	}
	if !HasExifDateTime(withModifyDate) {
		t.Error("Expected true for exif with ModifyDate")
	}
}

func TestHasExifDateTime_RealImage(t *testing.T) {
	// Canon_40D.jpg is a real image with EXIF metadata
	path := "../../../resources/test/samples/Canon_40D.jpg"
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("Failed to read test image: %v", err)
	}

	rawExif, err := GetExifData(data)
	if err != nil {
		t.Fatalf("Failed to extract raw exif: %v", err)
	}

	exifData, _, _ := BuildImageEXIF(rawExif)

	// The real image should have EXIF date/time metadata
	if !HasExifDateTime(&exifData) {
		t.Error("Expected HasExifDateTime to return true for Canon_40D.jpg")
	}

	// Now strip the date/time fields to simulate stripped EXIF
	exifData.DateTimeOriginal = nil
	exifData.DateTime = nil
	exifData.ModifyDate = nil

	if HasExifDateTime(&exifData) {
		t.Error("Expected HasExifDateTime to return false after stripping date/time fields")
	}
}
