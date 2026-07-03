package imageops

import (
	"bytes"
	"fmt"

	gometadata "github.com/FlavioCFOliveira/GoMetadata"
)

// ExtractFujiColorTemperature uses GoMetadata to parse the raw EXIF MakerNote
// and extract the FujiFilm ColorTemperature tag (0x1005). Returns the value
// formatted as "5600K", or nil if unavailable.
//
// libvips does not surface MakerNote proprietary tags, so we need a dedicated
// EXIF parser for this. GoMetadata handles the FujiFilm MakerNote IFD format
// (8-byte "FUJIFILM" prefix + LE IFD at offset [12..15]) and returns parsed
// tag values via IFDEntry.Get().
func ExtractFujiColorTemperature(rawData []byte) *string {
	if len(rawData) == 0 {
		return nil
	}
	m, err := gometadata.Read(bytes.NewReader(rawData))
	if err != nil {
		return nil
	}
	if m.EXIF == nil || m.EXIF.MakerNoteIFD == nil {
		return nil
	}
	entry := m.EXIF.MakerNoteIFD.Get(0x1005) // ColorTemperature
	if entry == nil {
		return nil
	}
	v := entry.Uint16()
	if v == 0 {
		return nil
	}
	s := fmt.Sprintf("%dK", v)
	return &s
}
