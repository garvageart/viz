package os

import "os"

// CreateDirectory creates a directory if it does not exist.
func CreateDirectory(dir string) error {
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		if mkerr := os.MkdirAll(dir, 0o755); mkerr != nil {
			return mkerr
		}
	}

	return nil
}

// MustCreateDirectory creates a directory if it does not exist.
//
// Panics on error.
func MustCreateDirectory(dir string) {
	err := CreateDirectory(dir)
	if err != nil {
		panic(err)
	}
}
