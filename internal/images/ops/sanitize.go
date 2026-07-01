package imageops

import (
	"encoding/binary"
	"errors"
)

var (
	ErrNotJPEG     = errors.New("image is not a JPEG")
	ErrInvalidEXIF = errors.New("invalid or corrupt EXIF data")
)

// GPS EXIF IFD tag IDs that identify GPS-related metadata.
const (
	tagGPSIFD = 0x8825 // GPSInfoIFD pointer in IFD0
)

// StripGPSExif removes GPS EXIF metadata from image bytes by nullifying the
// GPS IFD pointer in the main EXIF IFD0. This makes all GPS tags (latitude,
// longitude, altitude, timestamp, etc.) unreachable while preserving all other
// EXIF metadata such as camera model, date, aperture, ISO, and orientation.
//
// Currently supports JPEG format only. Non-JPEG images return ErrNotJPEG.
// Images without EXIF data, or without GPS EXIF, are returned as a copy with
// no modifications.
//
// The function operates by copying the input data, then walking the JPEG
// marker structure to find the APP1/EXIF segment, parsing the embedded TIFF
// header, locating the GPS IFD pointer tag (0x8825) in IFD0, and setting its
// 4-byte offset value to zero. The GPS IFD data remains in the file but is
// unreachable through the standard EXIF IFD chain, which is functionally
// equivalent to stripping it.
func StripGPSExif(data []byte) ([]byte, error) {
	if len(data) < 2 {
		return nil, ErrNotJPEG
	}

	// Check for JPEG SOI marker
	if data[0] != 0xFF || data[1] != 0xD8 {
		return nil, ErrNotJPEG
	}

	// Find APP1 marker containing EXIF data.
	app1Off, app1SegLen := findAPP1Exif(data)
	if app1Off < 0 {
		// No EXIF APP1 found; return a copy of the original.
		result := make([]byte, len(data))
		copy(result, data)
		return result, nil
	}

	// APP1 layout relative to app1Off:
	//   [0] FF E1      (2 bytes: marker)
	//   [2] LL HH      (2 bytes: segment length, big-endian, includes these 2 bytes)
	//   [4] "Exif\0\0" (6 bytes: EXIF identifier)
	//   [10] TIFF data (the rest of the segment)
	tiffOff := app1Off + 4 + 6 // skip marker, length, and "Exif\0\0"
	// app1SegLen includes the 2 marker bytes. Subtract 2 (marker) + 2 (length)
	// + 6 ("Exif\0\0") = 10 to get the TIFF data length.
	tiffLen := app1SegLen - 10
	if tiffLen < 8 {
		return nil, ErrInvalidEXIF
	}

	// Make a copy to modify.
	result := make([]byte, len(data))
	copy(result, data)

	// Parse and modify the TIFF EXIF data in-place within the result buffer.
	modified, err := stripGPSFromTIFF(result[tiffOff : tiffOff+tiffLen])
	if err != nil {
		return nil, err
	}
	if !modified {
		// GPS EXIF was not found; result is still a clean copy.
		return result, nil
	}

	return result, nil
}

// findAPP1Exif walks JPEG markers to find the first APP1 segment whose data
// starts with "Exif\0\0". Returns the offset of the APP1 marker (0xFF 0xE1)
// and the total segment length (including the 2 marker bytes and the 2 length
// bytes). Returns (-1, 0) if not found.
func findAPP1Exif(data []byte) (int, int) {
	i := 2 // Skip SOI (0xFF 0xD8)

	for i < len(data) {
		if data[i] != 0xFF {
			break
		}
		// Ensure there's at least one more byte for the marker type.
		if i+1 >= len(data) {
			return -1, 0
		}
		marker := data[i+1]

		// Markers without a length field.
		switch marker {
		case 0xD9: // EOI
			return -1, 0
		case 0xDA: // SOS — start of entropy-coded data, no more markers after this
			return -1, 0
		case 0x00: // Padding
			i += 2
			continue
		case 0x01: // TEM
			i += 2
			continue
		}

		// All other markers have a 2-byte big-endian length field.
		if i+3 >= len(data) {
			return -1, 0
		}
		segLen := int(data[i+2])<<8 | int(data[i+3])
		if segLen < 2 {
			return -1, 0
		}

		if marker == 0xE1 {
			// Potential APP1. Check for "Exif\0\0" prefix at data start.
			exifIDStart := i + 4
			if exifIDStart+5 <= len(data) &&
				data[exifIDStart] == 'E' &&
				data[exifIDStart+1] == 'x' &&
				data[exifIDStart+2] == 'i' &&
				data[exifIDStart+3] == 'f' &&
				data[exifIDStart+4] == 0 &&
				data[exifIDStart+5] == 0 {
				// Return the start of the APP1 marker and the total segment
				// length (2 marker bytes + segLen).
				return i, segLen + 2
			}
		}

		i += 2 + segLen
	}

	return -1, 0
}

// stripGPSFromTIFF parses a TIFF EXIF block and nullifies the GPS IFD pointer
// tag (0x8825) in IFD0. It modifies the provided slice in-place. Returns true
// if a GPS IFD pointer was found and nullified, or false if no GPS pointer was
// present. The caller must have already verified that tiffData is long enough
// to contain a valid TIFF header.
func stripGPSFromTIFF(tiffData []byte) (bool, error) {
	if len(tiffData) < 8 {
		return false, ErrInvalidEXIF
	}

	// Determine byte order from the TIFF header.
	var bo binary.ByteOrder
	switch string(tiffData[0:2]) {
	case "II":
		bo = binary.LittleEndian
	case "MM":
		bo = binary.BigEndian
	default:
		return false, ErrInvalidEXIF
	}

	// Verify TIFF magic (0x002A).
	magic := bo.Uint16(tiffData[2:4])
	if magic != 0x002A {
		return false, ErrInvalidEXIF
	}

	// Get the offset to IFD0 (relative to TIFF header start).
	ifd0Offset := int(bo.Uint32(tiffData[4:8]))
	if ifd0Offset < 8 || ifd0Offset >= len(tiffData) {
		return false, ErrInvalidEXIF
	}

	// Parse the entry count in IFD0.
	if ifd0Offset+2 > len(tiffData) {
		return false, ErrInvalidEXIF
	}
	numEntries := int(bo.Uint16(tiffData[ifd0Offset : ifd0Offset+2]))

	// Each IFD entry is 12 bytes. After entries comes a 4-byte next-IFD pointer.
	entriesEnd := ifd0Offset + 2 + numEntries*12 + 4
	if entriesEnd > len(tiffData) {
		return false, ErrInvalidEXIF
	}

	// Scan IFD0 entries for the GPS IFD pointer tag (0x8825).
	// Each entry layout (12 bytes):
	//   [0-1]  Tag ID       (uint16)
	//   [2-3]  Data type    (uint16)
	//   [4-7]  Count        (uint32)
	//   [8-11] Value/Offset (4 bytes) — for GPSInfoIFD (type LONG, count 1)
	//          this is the direct offset to the GPS IFD.
	for i := 0; i < numEntries; i++ {
		entryOff := ifd0Offset + 2 + i*12
		tag := bo.Uint16(tiffData[entryOff : entryOff+2])

		if tag == tagGPSIFD {
			// Nullify the GPS IFD offset value (bytes 8-11 of the entry).
			// Setting it to zero makes the GPS IFD unreachable through the
			// standard IFD chain. The GPS data remains in the file as orphaned
			// bytes, which is harmless and functionally equivalent to removal.
			for j := 8; j < 12; j++ {
				tiffData[entryOff+j] = 0
			}
			return true, nil
		}
	}

	return false, nil
}
