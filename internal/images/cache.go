package images

import (
	"context"
	"crypto/sha1"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	goredis "github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"viz/internal/config"
	"viz/internal/dto"
	"viz/internal/entities"
	"viz/internal/images/transform"
)

const (
	TempTransformPrefix = "tmp-transform-"
)

const (
	CacheErrTransformNotFound = "cache: transform not found"
	CacheErrTransformExists   = "cache: transform already exists"
	CacheErrTransformFailed   = "cache: transform failed"
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

// FindCachedTransform returns the path to the cached transform if it exists.
// If not present, exists==false.
func FindCachedTransform(uid string, key string, ext string) (path string, exists bool, err error) {
	path, err = CacheFilePath(uid, key, ext)
	if err != nil {
		return "", false, err
	}

	_, err = os.Stat(path)
	if err != nil {
		if os.IsNotExist(err) {
			return "", false, nil
		}

		return "", false, err
	}

	return path, true, nil
}

// ReadCachedTransform reads the cached transform bytes for the given uid/key/ext.
func ReadCachedTransform(uid string, key string, ext string) (data []byte, err error) {
	path, ok, err := FindCachedTransform(uid, key, ext)
	if err != nil {
		return nil, err
	}

	if !ok {
		return nil, errors.New(CacheErrTransformNotFound)
	}

	b, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	return b, nil
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

var (
	cacheHits   uint64
	cacheMisses uint64

	redisClient    *goredis.Client
	redisKeyHits   = "viz:cache:hits"
	redisKeyMisses = "viz:cache:misses"

	statsFileName  = "cache_stats.json"
	statsFilePath  string
	statsFileMutex sync.Mutex
	dirtyStats     uint32 // 1 if stats changed in memory and need flush
)

type cacheStats struct {
	Hits   uint64 `json:"hits"`
	Misses uint64 `json:"misses"`
}

// InitCache initializes the cache persistence layer (either Redis or local file storage).
func InitCache(queueCfg config.QueueConfig, baseDir string, logger *slog.Logger) {
	if queueCfg.Enabled {
		address := fmt.Sprintf("%s:%d", queueCfg.Host, queueCfg.Port)
		var tlsConfig *tls.Config
		if queueCfg.UseTLS {
			tlsConfig = &tls.Config{
				InsecureSkipVerify: true,
			}
		}

		client := goredis.NewClient(&goredis.Options{
			Addr:         address,
			Username:     queueCfg.Username,
			Password:     queueCfg.Password,
			DB:           queueCfg.DB,
			PoolSize:     queueCfg.PoolSize,
			DialTimeout:  time.Duration(queueCfg.DialTimeoutSeconds) * time.Second,
			ReadTimeout:  time.Duration(queueCfg.ReadTimeoutSeconds) * time.Second,
			WriteTimeout: time.Duration(queueCfg.WriteTimeoutSeconds) * time.Second,
			TLSConfig:    tlsConfig,
		})

		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		if err := client.Ping(ctx).Err(); err == nil {
			redisClient = client
			logger.Info("Using Redis for persistent cache metrics", slog.String("address", address))
			return
		} else {
			logger.Warn("Failed to connect to Redis for cache metrics, falling back to file persistence", slog.Any("error", err))
		}
	}

	statsFilePath = filepath.Join(baseDir, statsFileName)
	// Clean up any left-over tmp file from a previous crash/unclean shutdown
	tmpPath := statsFilePath + ".tmp"
	if _, err := os.Stat(tmpPath); err == nil {
		_ = os.Remove(tmpPath)
	}
	loadCacheStatsFromFile(logger)
}

func loadCacheStatsFromFile(logger *slog.Logger) {
	statsFileMutex.Lock()
	defer statsFileMutex.Unlock()

	if _, err := os.Stat(statsFilePath); os.IsNotExist(err) {
		return
	}

	data, err := os.ReadFile(statsFilePath)
	if err != nil {
		logger.Error("Failed to read cache stats file", slog.String("path", statsFilePath), slog.Any("error", err))
		return
	}

	var stats cacheStats
	if err := json.Unmarshal(data, &stats); err != nil {
		logger.Error("Failed to parse cache stats JSON", slog.String("path", statsFilePath), slog.Any("error", err))
		return
	}

	atomic.StoreUint64(&cacheHits, stats.Hits)
	atomic.StoreUint64(&cacheMisses, stats.Misses)
	logger.Debug("Loaded cache stats from file", slog.Uint64("hits", stats.Hits), slog.Uint64("misses", stats.Misses))
}

// SaveCacheStats writes the in-memory cache stats to the persistent JSON file if Redis is not used.
func SaveCacheStats(logger *slog.Logger) {
	if redisClient != nil {
		return
	}

	if statsFilePath == "" {
		return
	}

	statsFileMutex.Lock()
	defer statsFileMutex.Unlock()

	if atomic.SwapUint32(&dirtyStats, 0) == 0 {
		return
	}

	stats := cacheStats{
		Hits:   atomic.LoadUint64(&cacheHits),
		Misses: atomic.LoadUint64(&cacheMisses),
	}

	data, err := json.MarshalIndent(stats, "", "  ")
	if err != nil {
		logger.Error("Failed to marshal cache stats JSON", slog.Any("error", err))
		return
	}

	tmpPath := statsFilePath + ".tmp"
	if err := os.WriteFile(tmpPath, data, 0644); err != nil {
		logger.Error("Failed to write temporary cache stats file", slog.String("path", tmpPath), slog.Any("error", err))
		return
	}

	if err := os.Rename(tmpPath, statsFilePath); err != nil {
		os.Remove(tmpPath)
		logger.Error("Failed to rename temporary cache stats file", slog.String("path", statsFilePath), slog.Any("error", err))
		return
	}
}

// StartCacheStatsWriter starts a background goroutine that periodically writes cache stats to disk.
func StartCacheStatsWriter(ctx context.Context, logger *slog.Logger) {
	if redisClient != nil {
		return
	}

	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			SaveCacheStats(logger)
			return
		case <-ticker.C:
			SaveCacheStats(logger)
		}
	}
}

// IncrementCacheHits atomically increments the server-side cache hits count.
func IncrementCacheHits() {
	if redisClient != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		if err := redisClient.Incr(ctx, redisKeyHits).Err(); err == nil {
			return
		}
	}
	atomic.AddUint64(&cacheHits, 1)
	atomic.StoreUint32(&dirtyStats, 1)
}

// IncrementCacheMisses atomically increments the server-side cache misses count.
func IncrementCacheMisses() {
	if redisClient != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		if err := redisClient.Incr(ctx, redisKeyMisses).Err(); err == nil {
			return
		}
	}
	atomic.AddUint64(&cacheMisses, 1)
	atomic.StoreUint32(&dirtyStats, 1)
}

// GetCacheStatus calculates and returns the current status of the image transform cache.
func GetCacheStatus() (dto.CacheStatusResponse, error) {
	var totalSize int64
	var totalItems int64

	entries, err := os.ReadDir(Directory)
	if err != nil {
		return dto.CacheStatusResponse{}, fmt.Errorf("failed to read images directory: %w", err)
	}

	for _, e := range entries {
		if !e.IsDir() {
			continue
		}

		transformsPath := filepath.Join(Directory, e.Name(), "transforms")
		info, err := os.Stat(transformsPath)
		if err != nil {
			if os.IsNotExist(err) {
				continue
			}
			return dto.CacheStatusResponse{}, fmt.Errorf("failed to stat transforms directory %s: %w", transformsPath, err)
		}
		if !info.IsDir() {
			continue
		}

		tfiles, err := os.ReadDir(transformsPath)
		if err != nil {
			return dto.CacheStatusResponse{}, fmt.Errorf("failed to read transforms directory %s: %w", transformsPath, err)
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
				return dto.CacheStatusResponse{}, fmt.Errorf("failed to get file info for %s: %w", filepath.Join(transformsPath, base), err)
			}

			totalSize += finfo.Size()
			totalItems++
		}
	}

	var hits uint64
	var misses uint64

	if redisClient != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		hStr, err1 := redisClient.Get(ctx, redisKeyHits).Result()
		switch err1 {
		case nil:
			hVal, errH := strconv.ParseUint(hStr, 10, 64)
			if errH == nil {
				hits = hVal
			}
		case goredis.Nil:
			hits = 0
		default:
			hits = atomic.LoadUint64(&cacheHits)
		}

		mStr, err2 := redisClient.Get(ctx, redisKeyMisses).Result()
		switch err2 {
		case nil:
			mVal, errM := strconv.ParseUint(mStr, 10, 64)
			if errM == nil {
				misses = mVal
			}
		case goredis.Nil:
			misses = 0
		default:
			misses = atomic.LoadUint64(&cacheMisses)
		}
	} else {
		hits = atomic.LoadUint64(&cacheHits)
		misses = atomic.LoadUint64(&cacheMisses)
	}

	var hitRatio float64
	if hits+misses > 0 {
		hitRatio = float64(hits) / float64(hits+misses)
	}

	return dto.CacheStatusResponse{
		Size:     int(totalSize),
		Items:    int(totalItems),
		Hits:     int(hits),
		Misses:   int(misses),
		HitRatio: float32(hitRatio),
	}, nil
}

// ClearCache removes cached transform files and resets persistent metrics.
// If keepPermanent is true, it preserves pre-generated permanent transforms.
func ClearCache(logger *slog.Logger, db *gorm.DB, keepPermanent bool) error {
	if redisClient != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		redisClient.Set(ctx, redisKeyHits, 0, 0)
		redisClient.Set(ctx, redisKeyMisses, 0, 0)
	}
	atomic.StoreUint64(&cacheHits, 0)
	atomic.StoreUint64(&cacheMisses, 0)
	atomic.StoreUint32(&dirtyStats, 1)
	SaveCacheStats(logger)

	entries, err := os.ReadDir(Directory)
	if err != nil {
		return fmt.Errorf("failed to read images directory: %w", err)
	}

	permanentHashes := make(map[string]bool)
	if keepPermanent && db != nil {
		var err error
		permanentHashes, err = GetPermanentTransformHashes(db)
		if err != nil {
			logger.Error("failed to build permanent transform list for cache clear", slog.Any("error", err))
			return fmt.Errorf("failed to build permanent transform list: %w", err)
		}
	}

	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		uid := e.Name()

		if keepPermanent {
			dir := filepath.Join(GetImageDir(uid), "transforms")
			files, err := os.ReadDir(dir)
			if err != nil {
				if os.IsNotExist(err) {
					continue
				}
				return fmt.Errorf("failed to read transforms directory for UID %s: %w", uid, err)
			}

			for _, f := range files {
				if f.IsDir() {
					continue
				}

				base := f.Name()
				hash := strings.TrimSuffix(base, filepath.Ext(base))
				if permanentHashes[hash] {
					continue
				}

				p := filepath.Join(dir, base)
				if err := os.Remove(p); err != nil && !os.IsNotExist(err) {
					logger.Warn("failed to remove dynamic transform file", slog.String("path", p), slog.Any("error", err))
				}
			}
		} else {
			if err := PurgeTransformsForUID(uid); err != nil {
				return fmt.Errorf("failed to purge transforms for UID %s: %w", uid, err)
			}
		}

		logger.Debug("cleared transform cache for UID", slog.String("uid", uid), slog.Bool("keep_permanent", keepPermanent))
	}
	return nil
}

// PermanentHashGetter is a function that returns a set of hashes for permanent transforms that should be preserved.
type PermanentHashGetter func(db *gorm.DB) (map[string]bool, error)

// GetPermanentTransformHashes builds a map of hashes for all permanent transforms of existing images.
func GetPermanentTransformHashes(db *gorm.DB) (map[string]bool, error) {
	permanentHashes := make(map[string]bool)
	var images []entities.ImageAsset

	// Process images in batches to avoid loading everything into memory
	err := db.Model(&entities.ImageAsset{}).Where("deleted_at IS NULL").FindInBatches(&images, 1000, func(tx *gorm.DB, batch int) error {
		for _, img := range images {
			if img.ImageMetadata == nil {
				continue
			}
			// Recalculate etag for each permanent transform and add its hash to the set
			for _, params := range GetAllPermanentTransforms() {
				etag := *transform.CreateTransformEtag(img, &params)
				// The filename is the SHA1 hash of the etag
				fname := cacheFileName(etag, params.Format)
				hash := strings.TrimSuffix(fname, filepath.Ext(fname))
				permanentHashes[hash] = true
			}
		}
		return nil
	}).Error

	return permanentHashes, err
}

// PerformTransformCacheCleanup executes the cache cleanup logic.
func PerformTransformCacheCleanup(rootDir string, logger *slog.Logger, db *gorm.DB, cfg config.CacheConfig, hashGetter PermanentHashGetter) {
	var maxSizeBytes int64 = 10 * 1000 * 1000 * 1000 // 10 GB
	var maxAgeDays int = 30
	var cleanupIntervalMinutes int = 60 * 24 // daily
	var shouldPreservePermanent bool = true

	if cfg.GCEnabled {
		maxSizeBytes = cfg.MaxSizeBytes
		maxAgeDays = cfg.MaxAgeDays
		cleanupIntervalMinutes = cfg.CleanupIntervalMinutes
		shouldPreservePermanent = !cfg.ClearPermanentTransforms
	}

	if cleanupIntervalMinutes <= 0 {
		cleanupIntervalMinutes = 1440 // 24 hours
	}

	logger.Debug("transform cache gc: starting", slog.Int64("max_size_bytes", maxSizeBytes), slog.Int("max_age_days", maxAgeDays), slog.Bool("preserve_permanent", shouldPreservePermanent))

	permanentHashes := make(map[string]bool)
	if shouldPreservePermanent && db != nil && hashGetter != nil {
		logger.Debug("transform cache gc: building list of permanent transforms to preserve")
		var err error
		permanentHashes, err = hashGetter(db)
		if err != nil {
			logger.Error("transform cache gc: failed to build permanent transform list", slog.Any("error", err))
		} else {
			logger.Debug("transform cache gc: finished building permanent transform list", slog.Int("count", len(permanentHashes)))
		}
	}

	type fileInfo struct {
		path string
		size int64
		mod  time.Time
	}

	var files []fileInfo
	var total int64

	entries, err := os.ReadDir(rootDir)
	if err != nil {
		logger.Warn("cache gc: failed to read images directory", slog.Any("error", err))
		return
	}

	for _, e := range entries {
		if !e.IsDir() {
			continue
		}

		transformsPath := filepath.Join(rootDir, e.Name(), "transforms")
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
			if strings.HasPrefix(base, TempTransformPrefix) {
				finfo, err := tf.Info()
				if err == nil {
					// Clean up temporary transform files that have been orphaned (older than 1 hour)
					if finfo.ModTime().Before(time.Now().Add(-1 * time.Hour)) {
						p := filepath.Join(transformsPath, base)
						_ = os.Remove(p)
						logger.Debug("transform cache gc: cleaned up orphaned temp file", slog.String("path", p))
					}
				}
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

	cutoff := time.Now().AddDate(0, 0, -maxAgeDays)
	var remaining []fileInfo
	for _, f := range files {
		if shouldPreservePermanent {
			hash := strings.TrimSuffix(filepath.Base(f.path), filepath.Ext(f.path))
			if permanentHashes[hash] {
				continue // Skip to next file
			}
		}

		if f.mod.Before(cutoff) {
			if err := os.Remove(f.path); err == nil {
				logger.Debug("transform cache gc: removed old file", slog.String("path", f.path), slog.Time("mod", f.mod))

				total -= f.size
				continue
			} else {
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
				logger.Debug("transform cache gc: evicted file", slog.String("path", f.path), slog.Int64("size", f.size))
			} else {
				logger.Warn("transform cache gc: failed to evict file", slog.String("path", f.path), slog.Any("error", err))
			}
		}
	}

	logger.Debug("transform cache gc: finished", slog.Int64("remaining_total_bytes", total))
}

// StartTransformCacheGC starts a background goroutine that periodically
// enforces the transform cache eviction policy based on config values.
// The goroutine will stop when ctx is canceled.
func StartTransformCacheGC(ctx context.Context, logger *slog.Logger, db *gorm.DB) {
	go func() {
		cfg := config.AppConfig
		cleanupIntervalMinutes := cfg.Cache.CleanupIntervalMinutes
		if cleanupIntervalMinutes <= 0 {
			cleanupIntervalMinutes = 1440 // 24 hours
			{
				logger.Warn("transform cache gc: invalid cleanup interval, using default", slog.Int("interval_minutes", cleanupIntervalMinutes))
			}
		}

		interval := time.Duration(cleanupIntervalMinutes) * time.Minute
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		doCleanup := func() {
			PerformTransformCacheCleanup(Directory, logger, db, config.AppConfig.Cache, GetPermanentTransformHashes)
		}

		// do startup run
		doCleanup()

		for {
			select {
			case <-ctx.Done():
				logger.Debug("transform cache gc: stopping")
				return
			case <-ticker.C:
				doCleanup()
			}
		}
	}()
}
