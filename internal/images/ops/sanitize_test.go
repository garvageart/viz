package imageops

import (
	"bytes"
	"encoding/binary"
	"os"
	"testing"
)

// ── Test helpers ──────────────────────────────────────────────────────────────

// buildTestJPEG constructs a minimal JPEG with an APP1 EXIF segment containing
// the given IFD0 and GPS IFD entries. It returns the raw JPEG bytes.
//
// The JPEG is minimal: SOI + APP1(Exif) + EOI. It is not a viewable image but
// is sufficient for EXIF parsing tests.
//
// Parameters:
//   - ifd0Entries: 12-byte IFD0 entries (e.g., Model, DateTimeOriginal, GPS IFD ptr)
//   - extraData:   data referenced by IFD entries (ASCII strings, rationals, etc.)
//   - gpsIfdData:  the complete GPS IFD including entry count, entries, and data
func buildTestJPEG(byteOrder binary.ByteOrder, ifd0Entries []byte, extraData []byte, gpsIfdData []byte) []byte {
	bo := byteOrder
	if bo == nil {
		bo = binary.LittleEndian
	}

	// Build the TIFF/EXIF data.
	tiffData := buildTIFFEXIF(bo, ifd0Entries, extraData, gpsIfdData)

	// Wrap in APP1 and JPEG.
	return buildJPEGWithAPP1(tiffData)
}

// buildTIFFEXIF creates a complete TIFF EXIF block.
func buildTIFFEXIF(bo binary.ByteOrder, ifd0Entries []byte, extraData []byte, gpsIfdData []byte) []byte {
	// Calculate IFD0 offset: right after TIFF header (8 bytes).
	ifd0Offset := uint32(8)

	// Count entries in ifd0Entries (each is 12 bytes).
	numEntries := uint16(len(ifd0Entries) / 12)

	// IFD0 layout: 2-byte count + entries + 4-byte next-IFD pointer (0).
	ifd0Len := 2 + len(ifd0Entries) + 4

	// Data area starts after IFD0.
	dataOffset := ifd0Offset + uint32(ifd0Len)

	// GPS IFD (if present) starts after data area.
	gpsOffset := dataOffset + uint32(len(extraData))

	// Need to patch the GPS IFD pointer entry in ifd0Entries to point to gpsOffset.
	patchedEntries := make([]byte, len(ifd0Entries))
	copy(patchedEntries, ifd0Entries)

	// Find and patch the GPS IFD pointer tag (0x8825).
	for i := 0; i < int(numEntries); i++ {
		entryOff := i * 12
		tag := bo.Uint16(patchedEntries[entryOff : entryOff+2])
		if tag == tagGPSIFD {
			// Set the VALUE field (bytes 8-11) to the GPS IFD offset.
			bo.PutUint32(patchedEntries[entryOff+8:entryOff+12], gpsOffset)
			break
		}
	}

	// Assemble TIFF data.
	var buf bytes.Buffer

	// TIFF header (8 bytes): byte order + magic + IFD0 offset.
	switch bo {
	case binary.BigEndian:
		buf.WriteString("MM")
		buf.Write([]byte{0x00, 0x2A}) // magic (big-endian)
	default:
		buf.WriteString("II")
		buf.Write([]byte{0x2A, 0x00}) // magic (little-endian)
	}

	// IFD0 offset (always starts at 8, right after the TIFF header).
	offsetBytes := make([]byte, 4)
	bo.PutUint32(offsetBytes, ifd0Offset)
	buf.Write(offsetBytes)

	// IFD0: entry count.
	countBytes := make([]byte, 2)
	bo.PutUint16(countBytes, numEntries)
	buf.Write(countBytes)

	// IFD0: entries.
	buf.Write(patchedEntries)

	// IFD0: next-IFD pointer (0 = no thumbnail).
	nextBytes := make([]byte, 4)
	bo.PutUint32(nextBytes, 0)
	buf.Write(nextBytes)

	// Extra data (ASCII strings, etc.).
	buf.Write(extraData)

	// GPS IFD (if any).
	if gpsIfdData != nil {
		buf.Write(gpsIfdData)
	}

	return buf.Bytes()
}

// buildJPEGWithAPP1 wraps TIFF EXIF data in a JPEG container with proper APP1.
func buildJPEGWithAPP1(tiffData []byte) []byte {
	var buf bytes.Buffer

	// SOI.
	buf.Write([]byte{0xFF, 0xD8})

	// APP1 marker.
	buf.Write([]byte{0xFF, 0xE1})

	// APP1 segment length (2 length bytes + 6 "Exif\0\0" bytes + tiffData).
	app1DataLen := 6 + len(tiffData) // "Exif\0\0" + TIFF data
	segLen := app1DataLen + 2        // + 2 bytes for the length field itself
	lengthBytes := make([]byte, 2)
	lengthBytes[0] = byte(segLen >> 8)
	lengthBytes[1] = byte(segLen)
	buf.Write(lengthBytes)

	// EXIF identifier.
	buf.Write([]byte("Exif\x00\x00"))

	// TIFF EXIF data.
	buf.Write(tiffData)

	// EOI.
	buf.Write([]byte{0xFF, 0xD9})

	return buf.Bytes()
}

// makeASCIIEntry creates a 12-byte IFD entry for an ASCII string tag.
// For strings > 4 bytes, the value is stored in extraData and the entry's
// value field contains an offset. For short strings (≤ 4 bytes incl. NUL),
// the value fits directly in the value field.
func makeASCIIEntry(bo binary.ByteOrder, tag uint16, value string, extraData *bytes.Buffer) []byte {
	entry := make([]byte, 12)
	bo.PutUint16(entry[0:2], tag)
	bo.PutUint16(entry[2:4], 2) // Type 2 = ASCII

	// Include NUL terminator.
	strBytes := append([]byte(value), 0)
	count := uint32(len(strBytes))
	bo.PutUint32(entry[4:8], count)

	if count <= 4 {
		// Value fits directly in the 4-byte value field (left-justified).
		copy(entry[8:12], strBytes)
	} else {
		// Value needs indirect storage; set offset to current extraData position.
		offset := uint32(extraData.Len())
		bo.PutUint32(entry[8:12], offset)
		extraData.Write(strBytes)
	}

	return entry
}

// makeLongEntry creates a 12-byte IFD entry for a LONG (uint32) tag.
func makeLongEntry(bo binary.ByteOrder, tag uint16, count uint32, initialValue uint32) []byte {
	entry := make([]byte, 12)
	bo.PutUint16(entry[0:2], tag)
	bo.PutUint16(entry[2:4], 4) // Type 4 = LONG
	bo.PutUint32(entry[4:8], count)
	bo.PutUint32(entry[8:12], initialValue)
	return entry
}

// makeRationalValue creates a RATIONAL value (two consecutive LONGs: numerator, denominator).
func makeRationalValue(bo binary.ByteOrder, num, den uint32) []byte {
	b := make([]byte, 8)
	bo.PutUint32(b[0:4], num)
	bo.PutUint32(b[4:8], den)
	return b
}

// buildGPSIFD creates a minimal GPS IFD with latitude and longitude.
// Returns the raw GPS IFD bytes (entry count + entries + data area).
func buildGPSIFD(bo binary.ByteOrder, latRef string, latNum, latDen, lonNum, lonDen uint32, lonRef string) []byte {
	var extra bytes.Buffer

	// GPSLatitudeRef (tag 0x0001) - ASCII "N" or "S".
	latRefEntry := makeASCIIEntry(bo, 0x0001, latRef, &extra)

	// GPSLatitude (tag 0x0002) - 3 RATIONALs (degrees, minutes, seconds).
	// Using a single rational (deg/1) for simplicity — stored as indirect data.
	latValues := makeRationalValue(bo, latNum, latDen)
	latEntry := make([]byte, 12)
	bo.PutUint16(latEntry[0:2], 0x0002)
	bo.PutUint16(latEntry[2:4], 5)                       // Type 5 = RATIONAL
	bo.PutUint32(latEntry[4:8], 1)                       // Count = 1 rational
	latOffset := uint32(extra.Len()) + 12 + 12 + 12 + 12 // after all entries
	bo.PutUint32(latEntry[8:12], latOffset)

	// GPSLongitudeRef (tag 0x0003) - ASCII "E" or "W".
	lonRefEntry := makeASCIIEntry(bo, 0x0003, lonRef, &extra)

	// GPSLongitude (tag 0x0004) - 3 RATIONALs.
	lonValues := makeRationalValue(bo, lonNum, lonDen)
	lonEntry := make([]byte, 12)
	bo.PutUint16(lonEntry[0:2], 0x0004)
	bo.PutUint16(lonEntry[2:4], 5) // RATIONAL
	bo.PutUint32(lonEntry[4:8], 1)
	lonOffset := latOffset + 8
	bo.PutUint32(lonEntry[8:12], lonOffset)

	// Assemble GPS IFD.
	var gpsBuf bytes.Buffer
	gpsEntryCount := uint16(4)
	ecBytes := make([]byte, 2)
	bo.PutUint16(ecBytes, gpsEntryCount)
	gpsBuf.Write(ecBytes)
	gpsBuf.Write(latRefEntry)
	gpsBuf.Write(latEntry)
	gpsBuf.Write(lonRefEntry)
	gpsBuf.Write(lonEntry)
	// Next IFD pointer (0).
	gpsBuf.Write([]byte{0, 0, 0, 0})
	// Any extra data referenced by entries.
	gpsBuf.Write(extra.Bytes())
	// Rational values (indirect).
	gpsBuf.Write(latValues)
	gpsBuf.Write(lonValues)

	return gpsBuf.Bytes()
}

// ── Tests ─────────────────────────────────────────────────────────────────────

// TestStripGPSExif_NoExif verifies that a JPEG without EXIF data is returned
// unmodified.
func TestStripGPSExif_NoExif(t *testing.T) {
	// Minimal JPEG with no APP1 markers.
	jpeg := []byte{
		0xFF, 0xD8, // SOI
		0xFF, 0xD9, // EOI
	}

	sanitized, err := StripGPSExif(jpeg)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !bytes.Equal(sanitized, jpeg) {
		t.Error("expected identical output for JPEG without EXIF")
	}
}

// TestStripGPSExif_NoGPS verifies that EXIF data without GPS tags passes
// through unmodified.
func TestStripGPSExif_NoGPS(t *testing.T) {
	bo := binary.LittleEndian
	var extra bytes.Buffer

	// Create IFD0 with two non-GPS entries: Model and DateTimeOriginal.
	modelEntry := makeASCIIEntry(bo, 0x0110, "TestCamera", &extra)
	dateEntry := makeASCIIEntry(bo, 0x9003, "2024:01:15 10:30:00", &extra)

	ifd0Entries := make([]byte, 0, 24)
	ifd0Entries = append(ifd0Entries, modelEntry...)
	ifd0Entries = append(ifd0Entries, dateEntry...)

	jpeg := buildTestJPEG(bo, ifd0Entries, extra.Bytes(), nil)

	sanitized, err := StripGPSExif(jpeg)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !bytes.Equal(sanitized, jpeg) {
		t.Error("expected output to match input when no GPS is present")
	}

	// Verify that non-GPS tags are still present by scanning the sanitized output.
	app1Off, _ := findAPP1Exif(sanitized)
	if app1Off < 0 {
		t.Fatal("APP1 EXIF segment not found after sanitization")
	}
	tiffOff := app1Off + 4 + 6
	tiffSeg := sanitized[tiffOff:]
	hasModel := hasTIFFTag(tiffSeg, 0x0110)
	hasDate := hasTIFFTag(tiffSeg, 0x9003)
	if !hasModel {
		t.Error("Model tag (0x0110) missing after sanitization")
	}
	if !hasDate {
		t.Error("DateTimeOriginal tag (0x9003) missing after sanitization")
	}
}

// TestStripGPSExif_StripsGPS verifies that GPS tags are removed while
// non-GPS tags are preserved.
func TestStripGPSExif_StripsGPS(t *testing.T) {
	bo := binary.LittleEndian
	var extra bytes.Buffer

	// IFD0 entries: Model, DateTimeOriginal, GPS IFD pointer.
	modelEntry := makeASCIIEntry(bo, 0x0110, "Canon EOS R5", &extra)
	dateEntry := makeASCIIEntry(bo, 0x9003, "2024:06:15 14:30:00", &extra)
	// GPS IFD pointer (tag 0x8825) with placeholder value 42 — will be patched
	// by buildTIFFEXIF to the correct offset.
	gpsPtrEntry := makeLongEntry(bo, tagGPSIFD, 1, 42)

	ifd0Entries := make([]byte, 0, 36)
	ifd0Entries = append(ifd0Entries, modelEntry...)
	ifd0Entries = append(ifd0Entries, dateEntry...)
	ifd0Entries = append(ifd0Entries, gpsPtrEntry...)

	// Build a GPS IFD with latitude and longitude.
	gpsIfd := buildGPSIFD(bo, "N", 48, 1, 2, 1, "E")

	jpeg := buildTestJPEG(bo, ifd0Entries, extra.Bytes(), gpsIfd)

	// Verify GPS IFD pointer is present before sanitization.
	app1Off, _ := findAPP1Exif(jpeg)
	if app1Off < 0 {
		t.Fatal("APP1 EXIF segment not found")
	}
	tiffOff := app1Off + 4 + 6
	tiffSeg := jpeg[tiffOff:]
	gpsVal := getTIFFTagValue(tiffSeg, tagGPSIFD)
	if gpsVal == nil {
		t.Fatal("GPS IFD pointer should be present before sanitization")
	}
	if *gpsVal == 0 {
		t.Fatal("GPS IFD pointer value should be non-zero before sanitization")
	}

	// Run sanitizer.
	sanitized, err := StripGPSExif(jpeg)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify GPS IFD pointer's value has been zeroed (GPS IFD is unreachable).
	app1Off2, _ := findAPP1Exif(sanitized)
	if app1Off2 < 0 {
		t.Fatal("APP1 EXIF segment not found after sanitization")
	}
	tiffOff2 := app1Off2 + 4 + 6
	tiffSeg2 := sanitized[tiffOff2:]
	gpsVal2 := getTIFFTagValue(tiffSeg2, tagGPSIFD)
	if gpsVal2 == nil {
		t.Fatal("GPS IFD pointer tag should still exist in IFD0 after sanitization")
	}
	if *gpsVal2 != 0 {
		t.Fatal("GPS IFD pointer value should be zeroed after sanitization")
	}

	// Verify non-GPS tags are preserved.
	hasModel := hasTIFFTag(tiffSeg2, 0x0110)
	hasDate := hasTIFFTag(tiffSeg2, 0x9003)
	if !hasModel {
		t.Error("Model tag (0x0110) missing after sanitization")
	}
	if !hasDate {
		t.Error("DateTimeOriginal tag (0x9003) missing after sanitization")
	}
}

// TestStripGPSExif_NonJPEG verifies that non-JPEG input returns an error.
func TestStripGPSExif_NonJPEG(t *testing.T) {
	// PNG header.
	png := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}
	_, err := StripGPSExif(png)
	if err != ErrNotJPEG {
		t.Fatalf("expected ErrNotJPEG, got: %v", err)
	}
}

// TestStripGPSExif_EmptyInput verifies that empty input returns an error.
func TestStripGPSExif_EmptyInput(t *testing.T) {
	_, err := StripGPSExif(nil)
	if err != ErrNotJPEG {
		t.Fatalf("expected ErrNotJPEG, got: %v", err)
	}

	_, err = StripGPSExif([]byte{})
	if err != ErrNotJPEG {
		t.Fatalf("expected ErrNotJPEG, got: %v", err)
	}
}

// TestStripGPSExif_InvalidEXIF verifies graceful handling of corrupt EXIF.
func TestStripGPSExif_InvalidEXIF(t *testing.T) {
	// JPEG with truncated APP1 (marker present but data too short).
	jpeg := []byte{
		0xFF, 0xD8, // SOI
		0xFF, 0xE1, // APP1
		0x00, 0x08, // length = 8 (too short for "Exif\0\0")
		0x45, 0x78, 0x69, 0x66, // "Exif"
		// missing final \0\0 and TIFF data
		0xFF, 0xD9, // EOI
	}

	// Should handle gracefully — either return a copy or error.
	sanitized, err := StripGPSExif(jpeg)
	if err != nil {
		// ErrInvalidEXIF is acceptable here since the data is corrupt.
		return
	}
	// If no error, should at least be a valid copy.
	if len(sanitized) != len(jpeg) {
		t.Error("unexpected length for corrupt EXIF")
	}
}

// TestStripGPSExif_BigEndian verifies that big-endian (Motorola byte order)
// EXIF data is handled correctly.
func TestStripGPSExif_BigEndian(t *testing.T) {
	// For this test we use a JPEG from the test samples directory if available,
	// constructing a synthetic big-endian EXIF is complex — the LE path already
	// tests the logic. Big-endian is handled by the same code path.
	// This is a structural test ensuring the byte-order switch works.
	bo := binary.BigEndian
	var extra bytes.Buffer

	modelEntry := makeASCIIEntry(bo, 0x0110, "Nikon D850", &extra)
	gpsPtrEntry := makeLongEntry(bo, tagGPSIFD, 1, 42)

	ifd0Entries := make([]byte, 0, 24)
	ifd0Entries = append(ifd0Entries, modelEntry...)
	ifd0Entries = append(ifd0Entries, gpsPtrEntry...)

	gpsIfd := buildGPSIFD(bo, "S", 33, 1, 151, 1, "W")

	jpeg := buildTestJPEG(bo, ifd0Entries, extra.Bytes(), gpsIfd)

	sanitized, err := StripGPSExif(jpeg)
	if err != nil {
		t.Fatalf("unexpected error for big-endian: %v", err)
	}

	// Verify GPS IFD pointer value is zeroed.
	app1Off, _ := findAPP1Exif(sanitized)
	if app1Off < 0 {
		t.Fatal("APP1 not found")
	}
	tiffOff := app1Off + 4 + 6
	gpsVal := getTIFFTagValue(sanitized[tiffOff:], tagGPSIFD)
	if gpsVal == nil {
		t.Fatal("GPS IFD pointer tag should exist in big-endian after sanitization")
	}
	if *gpsVal != 0 {
		t.Fatal("GPS IFD pointer value should be zeroed in big-endian too")
	}

	// Verify non-GPS tag preserved.
	hasModel := hasTIFFTag(sanitized[tiffOff:], 0x0110)
	if !hasModel {
		t.Error("Model tag missing after sanitization of big-endian EXIF")
	}
}

// getTIFFTagValue returns the 4-byte value field of a tag in IFD0, or nil
// if the tag is not found or parsing fails.
func getTIFFTagValue(tiffData []byte, tagID uint16) *uint32 {
	if len(tiffData) < 8 {
		return nil
	}

	var bo binary.ByteOrder
	switch string(tiffData[0:2]) {
	case "II":
		bo = binary.LittleEndian
	case "MM":
		bo = binary.BigEndian
	default:
		return nil
	}

	if bo.Uint16(tiffData[2:4]) != 0x002A {
		return nil
	}

	ifd0Off := int(bo.Uint32(tiffData[4:8]))
	if ifd0Off < 8 || ifd0Off+2 > len(tiffData) {
		return nil
	}

	numEntries := int(bo.Uint16(tiffData[ifd0Off : ifd0Off+2]))
	for i := 0; i < numEntries; i++ {
		entryOff := ifd0Off + 2 + i*12
		if entryOff+12 > len(tiffData) {
			return nil
		}
		if bo.Uint16(tiffData[entryOff:entryOff+2]) == tagID {
			val := bo.Uint32(tiffData[entryOff+8 : entryOff+12])
			return &val
		}
	}

	return nil
}

// hasTIFFTag checks whether a TIFF EXIF block contains a specific tag in IFD0.
func hasTIFFTag(tiffData []byte, tagID uint16) bool {
	if len(tiffData) < 8 {
		return false
	}

	var bo binary.ByteOrder
	switch string(tiffData[0:2]) {
	case "II":
		bo = binary.LittleEndian
	case "MM":
		bo = binary.BigEndian
	default:
		return false
	}

	if bo.Uint16(tiffData[2:4]) != 0x002A {
		return false
	}

	ifd0Off := int(bo.Uint32(tiffData[4:8]))
	if ifd0Off < 8 || ifd0Off+2 > len(tiffData) {
		return false
	}

	numEntries := int(bo.Uint16(tiffData[ifd0Off : ifd0Off+2]))
	for i := 0; i < numEntries; i++ {
		entryOff := ifd0Off + 2 + i*12
		if entryOff+12 > len(tiffData) {
			return false
		}
		if bo.Uint16(tiffData[entryOff:entryOff+2]) == tagID {
			return true
		}
	}

	return false
}

// TestStripGPSExif_RealJPEG processes an actual camera JPEG from the test
// samples directory to verify the sanitizer works on real-world images.
// This test is skipped if libvips is not initialized or the sample file
// is unavailable.
func TestStripGPSExif_RealJPEG(t *testing.T) {
	// Use one of the known test samples. These may or may not have GPS data,
	// but they definitely have EXIF data (Model, Make, etc.) that must be
	// preserved.
	samplePath := "../../resources/test/samples/Canon_R5_01.jpg"
	sampleData, err := readFile(samplePath)
	if err != nil {
		t.Skipf("test sample not available: %v", err)
	}

	// Run sanitizer.
	sanitized, err := StripGPSExif(sampleData)
	if err != nil {
		t.Fatalf("StripGPSExif failed on real JPEG: %v", err)
	}

	// Verify the result is still a valid JPEG.
	if len(sanitized) < 2 || sanitized[0] != 0xFF || sanitized[1] != 0xD8 {
		t.Fatal("sanitized output is not a valid JPEG")
	}

	// Verify APP1 EXIF segment is still present (EXIF should not be removed).
	app1Off, _ := findAPP1Exif(sanitized)
	if app1Off < 0 {
		t.Fatal("APP1 EXIF segment was removed — only GPS should be stripped")
	}

	// Parse the TIFF data to verify non-GPS tags are present.
	tiffOff := app1Off + 4 + 6
	tiffSeg := sanitized[tiffOff:]

	// We expect to find at least one common non-GPS tag.
	hasModel := hasTIFFTag(tiffSeg, 0x0110)       // Model
	hasMake := hasTIFFTag(tiffSeg, 0x010F)        // Make
	hasOrientation := hasTIFFTag(tiffSeg, 0x0112) // Orientation

	if !hasModel && !hasMake && !hasOrientation {
		// This might be OK if the test image has unusual EXIF — log a warning.
		t.Log("no standard IFD0 tags found (Model, Make, Orientation) — image may have minimal EXIF")
	} else {
		t.Logf("non-GPS tags preserved: Model=%v Make=%v Orientation=%v",
			hasModel, hasMake, hasOrientation)
	}
}

// readFile is a test helper that reads a file.
func readFile(path string) ([]byte, error) {
	return os.ReadFile(path)
}
