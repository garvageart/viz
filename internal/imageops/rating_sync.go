package imageops

import "fmt"

// SyncRatingToFile is a helper stub to write the rating back to the image's
// XMP/sidecar. This operation is potentially destructive and may not be
// supported for all image formats. The function is provided as a helper but
// is disabled by default; only call it when you explicitly want to persist
// rating into files.
func SyncRatingToFile(imagePath string, rating *int) error {
	// TODO: implement writing to XMP/IPTC using a robust library (e.g., exiftool
	// wrapper or libxmp). For now this is a no-op stub to be implemented later.
	return fmt.Errorf("sync to file is not implemented")
}
