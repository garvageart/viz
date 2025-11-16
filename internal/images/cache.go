package images

import (
	"context"
	"crypto/sha1"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"time"

	"log/slog"

	"imagine/internal/config"
)

const (
	TempTransformPrefix = "tmp-transform-"
)

// cacheFileName returns the filename for a given key and extension (sha1 hex)
func cacheFileName(key string, ext string) string {
	h := sha1.Sum([]byte(key))
	return fmt.Sprintf("%x.%s", h, ext)
}

// CacheDirForUID returns the transforms dir for a given UID, creating it if necessary
func CacheDirForUID(uid string) (string, error) {
	if err := CreateImageDir(uid); err != nil {
		return "", err
	}

	dir := filepath.Join(GetImageDir(uid), "transforms")
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return "", err
		}
	}

	return dir, nil
}

// CacheFilePath returns the expected cache file path for the given uid/key/ext
func CacheFilePath(uid string, key string, ext string) (string, error) {
	dir, err := CacheDirForUID(uid)
	if err != nil {
		return "", err
	}

	return filepath.Join(dir, cacheFileName(key, ext)), nil
}

// ReadCachedTransform returns the cached bytes if present (exists==true). If not present exists==false.
func ReadCachedTransform(uid string, key string, ext string) (data []byte, exists bool, err error) {
	path, err := CacheFilePath(uid, key, ext)
	if err != nil {
		return nil, false, err
	}

	b, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, false, nil
		}
		return nil, false, err
	}

	return b, true, nil
}

// WriteCachedTransform writes bytes to a temp file then renames into place atomically.
func WriteCachedTransform(uid string, key string, ext string, data []byte) error {
	dir, err := CacheDirForUID(uid)
	if err != nil {
		return err
	}

	tmpFile, err := os.CreateTemp(dir, TempTransformPrefix)
	if err != nil {
		return err
	}

	tmpPath := tmpFile.Name()

	// write
	if _, err := tmpFile.Write(data); err != nil {
		tmpFile.Close()
		os.Remove(tmpPath)
		return err
	}
	tmpFile.Close()

	finalPath := filepath.Join(dir, cacheFileName(key, ext))

	// atomic rename
	if err := os.Rename(tmpPath, finalPath); err != nil {
		os.Remove(tmpPath)
		return err
	}

	return nil
}

// PurgeTransformsForUID removes the transforms directory for a UID
func PurgeTransformsForUID(uid string) error {
	dir := filepath.Join(GetImageDir(uid), "transforms")
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		return nil
	}
	return os.RemoveAll(dir)
}

// StartTransformCacheGC starts a background goroutine that periodically
// enforces the transform cache eviction policy based on config values.
// The goroutine will stop when ctx is canceled.
func StartTransformCacheGC(ctx context.Context, logger *slog.Logger) {
	go func() {
		cfg, err := config.ReadConfig()

		var maxSizeBytes int64 = 10 * 1000 * 1000 * 1000 // 10 GB
		var maxAgeDays int = 30
		var cleanupIntervalMinutes int = 60 * 24 // daily

		if err == nil {
			if cfg.IsSet("cache.max_size_bytes") {
				maxSizeBytes = cfg.GetInt64("cache.max_size_bytes")
			}
			if cfg.IsSet("cache.max_age_days") {
				maxAgeDays = cfg.GetInt("cache.max_age_days")
			}
			if cfg.IsSet("cache.cleanup_interval_minutes") {
				cleanupIntervalMinutes = cfg.GetInt("cache.cleanup_interval_minutes")
			}
		} else if logger != nil {
			logger.Warn("cache gc: failed to read config, using defaults", slog.Any("error", err))
		}

		interval := time.Duration(cleanupIntervalMinutes) * time.Minute
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		doCleanup := func() {
			if logger != nil {
				logger.Debug("transform cache gc: starting", slog.Int64("max_size_bytes", maxSizeBytes), slog.Int("max_age_days", maxAgeDays))
			}

			type fileInfo struct {
				path string
				size int64
				mod  time.Time
			}

			var files []fileInfo
			var total int64

			entries, err := os.ReadDir(Directory)
			if err != nil {
				if logger != nil {
					logger.Warn("cache gc: failed to read images directory", slog.Any("error", err))
				}
			} else {
				for _, e := range entries {
					if !e.IsDir() {
						continue
					}

					transformsPath := filepath.Join(Directory, e.Name(), "transforms")
					info, err := os.Stat(transformsPath)
					if err != nil || !info.IsDir() {
						continue
					}

					tfiles, err := os.ReadDir(transformsPath)
					if err != nil {
						continue
					}

					for _, tf := range tfiles {
						if tf.IsDir() {
							continue
						}

						base := tf.Name()
						if len(base) >= len(TempTransformPrefix) && base[:len(TempTransformPrefix)] == TempTransformPrefix {
							continue
						}

						finfo, err := tf.Info()
						if err != nil {
							continue
						}

						p := filepath.Join(transformsPath, base)
						files = append(files, fileInfo{path: p, size: finfo.Size(), mod: finfo.ModTime()})
						total += finfo.Size()
					}
				}
			}

			cutoff := time.Now().AddDate(0, 0, -maxAgeDays)
			var remaining []fileInfo
			for _, f := range files {
				if f.mod.Before(cutoff) {
					if err := os.Remove(f.path); err == nil {
						if logger != nil {
							logger.Debug("transform cache gc: removed old file", slog.String("path", f.path), slog.Time("mod", f.mod))
						}

						total -= f.size
						continue
					} else if logger != nil {
						logger.Warn("transform cache gc: failed to remove old file", slog.String("path", f.path), slog.Any("error", err))
					}
				}

				remaining = append(remaining, f)
			}

			if total > maxSizeBytes {
				sort.Slice(remaining, func(i, j int) bool { return remaining[i].mod.Before(remaining[j].mod) })
				for _, f := range remaining {
					if total <= maxSizeBytes {
						break
					}
					if err := os.Remove(f.path); err == nil {
						total -= f.size
						if logger != nil {
							logger.Debug("transform cache gc: evicted file", slog.String("path", f.path), slog.Int64("size", f.size))
						}
					} else if logger != nil {
						logger.Warn("transform cache gc: failed to evict file", slog.String("path", f.path), slog.Any("error", err))
					}
				}
			}

			if logger != nil {
				logger.Debug("transform cache gc: finished", slog.Int64("remaining_total_bytes", total))
			}
		}

		doCleanup()

		for {
			select {
			case <-ctx.Done():
				if logger != nil {
					logger.Debug("transform cache gc: stopping")
				}
				return
			case <-ticker.C:
				doCleanup()
			}
		}
	}()
}
