package images

import (
	"path/filepath"
	"strings"
	"viz/internal/config"
	"viz/internal/os"
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
	os.MustCreateDirectory(upload)
	Library = upload

	trash := filepath.Join(BaseDirectory, "trash")
	os.MustCreateDirectory(trash)
	TrashDirectory = trash
}
