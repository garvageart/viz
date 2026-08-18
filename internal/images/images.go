package images

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"viz/internal/config"
	libos "viz/internal/os"
)

var (
	BaseDirectory  = config.AppConfig.BaseDir
	Library        = config.AppConfig.Upload.Location
	TrashDirectory string
)

func init() {
	upload := config.AppConfig.Upload.Location
	if strings.TrimSpace(upload) == "" {
		panic("upload location is not set in config")
	}

	upload = filepath.Join(BaseDirectory, upload)
	libos.MustCreateDirectory(upload)
	Library = upload

	trash := filepath.Join(BaseDirectory, "trash")
	libos.MustCreateDirectory(trash)
	TrashDirectory = trash

	ValidateStorageMount()
}

// ValidateStorageMount verifies that the base storage directory contains a .viz sentinel file.
// On the first run on an active storage volume, it automatically initializes the .viz sentinel.
// On subsequent boots or if the volume is unmounted, it panics if the sentinel file is missing.
func ValidateStorageMount() {
	if strings.TrimSpace(BaseDirectory) == "" {
		return
	}

	sentinelPath := filepath.Join(BaseDirectory, ".viz")
	if _, err := os.Stat(sentinelPath); err == nil {
		return
	}

	// check if base storage directory has existing contents if no sentinel
	baseEntries, err := os.ReadDir(BaseDirectory)
	if err == nil && len(baseEntries) > 0 {
		// auto-initialize sentinel file on first run
		writeErr := os.WriteFile(sentinelPath, []byte("viz\n"), 0644)
		if writeErr != nil {
			fmt.Fprintf(os.Stderr, "failed to create storage sentinel file %s: %v\n", sentinelPath, writeErr)
			return
		}

		fmt.Printf("initialized storage mount sentinel file: %s\n", sentinelPath)
		return
	}

	panic(fmt.Sprintf("storage volume is not mounted. missing sentinel file: %s", sentinelPath))
}
