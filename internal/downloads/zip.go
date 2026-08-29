package downloads

import (
	"archive/zip"
	"context"
	"io"
	"log/slog"
	"os"
	"path/filepath"

	"viz/internal/entities"
	"viz/internal/images"
)

// WriteImagesToZip writes the provided slice of ImageAsset entities into the provided zip.Writer
// in the order of the provided uids slice. Missing or unreadable files are skipped and logged.
func WriteImagesToZip(ctx context.Context, logger *slog.Logger, zw *zip.Writer, imgs []entities.ImageAsset, uids []string) error {
	if len(uids) == 0 {
		return nil
	}

	imgMap := make(map[string]entities.ImageAsset, len(imgs))
	for _, im := range imgs {
		imgMap[im.Uid] = im
	}

	for _, uid := range uids {
		imageEntity, ok := imgMap[uid]
		if !ok {
			logger.Warn("image not found for export", slog.String("uid", uid))
			continue
		}

		diskPath := images.GetImagePath(imageEntity.Uid, imageEntity.ImageMetadata.FileName)
		f, err := os.Open(diskPath)
		if err != nil {
			logger.Error("failed to open image file for export", slog.Any("error", err), slog.String("path", diskPath))
			continue
		}

		safeName := filepath.Base(imageEntity.ImageMetadata.FileName)
		// Use the original filename inside the ZIP (do not prefix with UID)
		zipFileName := safeName

		fileHeader := &zip.FileHeader{
			Name:   zipFileName,
			Method: zip.Store,
		}

		// try to set a meaningful mod time
		fileHeader.Modified = imageEntity.UpdatedAt

		w, err := zw.CreateHeader(fileHeader)
		if err != nil {
			f.Close()
			logger.Error("failed to create zip entry", slog.Any("error", err))
			continue
		}

		if _, err := io.Copy(w, f); err != nil {
			f.Close()
			logger.Error("failed to write image to zip", slog.Any("error", err))
			continue
		}

		f.Close()
	}

	return nil
}

// CalculateZipSize calculates the expected ZIP file size under zip.Store (uncompressed)
func CalculateZipSize(imgs []entities.ImageAsset, uids []string, checkDisk bool) int64 {
	imgMap := make(map[string]entities.ImageAsset, len(imgs))
	for _, im := range imgs {
		imgMap[im.Uid] = im
	}

	var totalSize int64 = 22 // EOCD size
	for _, uid := range uids {
		imageEntity, ok := imgMap[uid]
		if !ok {
			continue
		}
		if imageEntity.ImageMetadata.FileSize == nil {
			continue
		}
		if checkDisk {
			diskPath := images.GetImagePath(imageEntity.Uid, imageEntity.ImageMetadata.FileName)
			if _, err := os.Stat(diskPath); err != nil {
				continue
			}
		}
		safeName := filepath.Base(imageEntity.ImageMetadata.FileName)
		// Go zip.Writer under zip.Store streaming has:
		// Local header: 30 + len(name) + 9 (Extra Field - Extended Timestamp)
		// File data: FileSize
		// Data Descriptor: 16 (on non-seeking streams)
		// Central Directory header: 46 + len(name) + 9 (Extra Field - Extended Timestamp)
		totalSize += 110 + 2*int64(len(safeName)) + *imageEntity.ImageMetadata.FileSize
	}
	return totalSize
}
