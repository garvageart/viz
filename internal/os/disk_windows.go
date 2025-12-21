package os

import (
	"path/filepath"

	"golang.org/x/sys/windows"
)

// GetDiskSpace returns the total disk space in bytes for a given path.
// For Windows, it uses windows.GetDiskFreeSpaceEx.
func GetDiskSpace(path string) (freeBytes uint64, totalBytes uint64, err error) {
	absPath, err := filepath.Abs(path)
	if err != nil {
		return 0, 0, err
	}

	if len(absPath) == 2 && absPath[1] == ':' {
		absPath += `\`
	}

	var totalNumberOfFreeBytes uint64

	pathPtr, err := windows.UTF16PtrFromString(absPath)
	if err != nil {
		return 0, 0, err
	}

	err = windows.GetDiskFreeSpaceEx(
		pathPtr,
		&freeBytes,
		&totalBytes,
		&totalNumberOfFreeBytes,
	)
	if err != nil {
		return 0, 0, err
	}

	return freeBytes, totalBytes, nil
}