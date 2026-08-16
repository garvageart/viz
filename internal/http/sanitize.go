package http

import "strings"

// SanitizeFilename strips characters that could cause HTTP header injection
// when used in Content-Disposition or other header values.
// Removes CR, LF, and null bytes.
func SanitizeFilename(name string) string {
	name = strings.ReplaceAll(name, "\r", "")
	name = strings.ReplaceAll(name, "\n", "")
	name = strings.ReplaceAll(name, "\x00", "")
	return name
}
