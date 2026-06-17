//go:build !windows

package os

import (
	"syscall"
)

// GetDiskSpace returns the free and total disk space in bytes for a given path.
// For Unix-like systems, it uses syscall.Statfs.
func GetDiskSpace(path string) (freeBytes uint64, totalBytes uint64, err error) {
	fs := syscall.Statfs_t{}
	err = syscall.Statfs(path, &fs)
	if err != nil {
		return 0, 0, err
	}

	// Available blocks * block size = free space in bytes
	freeBytes = fs.Bavail * uint64(fs.Bsize)
	// Total blocks * block size = total space in bytes
	totalBytes = fs.Blocks * uint64(fs.Bsize)

	return freeBytes, totalBytes, nil
}
