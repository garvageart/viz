package images

import "strings"

// ImageContentType returns a proper Content-Type header value for a given image
// file extension, normalizing common aliases (e.g. "jpg" → "jpeg", "tif" → "tiff").
func ImageContentType(ext string) string {
	switch strings.ToLower(ext) {
	case "jpg", "jpeg":
		return "image/jpeg"
	case "png":
		return "image/png"
	case "webp":
		return "image/webp"
	case "gif":
		return "image/gif"
	case "tif", "tiff":
		return "image/tiff"
	case "bmp":
		return "image/bmp"
	case "avif":
		return "image/avif"
	case "heif", "heic":
		return "image/heif"
	case "svg":
		return "image/svg+xml"
	case "webpll":
		return "image/webp"
	default:
		return "image/" + ext
	}
}
