package config

import (
	"viz/internal/utils"
)

// DefaultConfig returns a VizConfig populated with default configuration values.
// This is the single source of truth for runtime configuration defaults.
func DefaultConfig() VizConfig {
	serverHost := "localhost"
	if utils.IsProduction {
		serverHost = "0.0.0.0"
	}

	return VizConfig{
		BaseURL:      "localhost",
		BaseDir:      DefaultDataDirectory,
		AllowedHosts: []string{},
		Timezone:     "utc",
		Server: ServerConfig{
			Host: serverHost,
			Port: 7770,
		},
		Logging: LoggingConfig{
			Level:    "debug",
			Timezone: "utc",
			Pretty:   false,
		},
		Upload: UploadConfig{
			Location: "library",
		},
		Download: DownloadConfig{
			ZipExportName: "viz-bulk_export",
		},
		Database: DatabaseConfig{
			Location:               "database",
			Port:                   5432,
			Name:                   "viz",
			User:                   "postgres",
			MaxOpenConns:           25,
			MaxIdleConns:           25,
			ConnMaxLifetimeMinutes: 5,
		},
		Queue: QueueConfig{
			RedisConfig: RedisConfig{
				Enabled:             false,
				Host:                "localhost",
				Port:                6379,
				DB:                  0,
				UseTLS:              false,
				PoolSize:            10,
				DialTimeoutSeconds:  5,
				ReadTimeoutSeconds:  3,
				WriteTimeoutSeconds: 3,
			},
		},
		Libvips: LibvipsConfig{
			MatchSystemLogging: false,
			CacheMaxMemoryMB:   0,
			CacheMaxFiles:      0,
			CacheMaxOperations: 0,
			Concurrency:        1,
			VectorEnabled:      false,
		},
		Cache: CacheConfig{
			GCEnabled:                true,
			ClearPermanentTransforms: false,
			MaxSizeBytes:             10 * 1024 * 1024 * 1024, // 10 GB
			MaxAgeDays:               30,
			CleanupIntervalMinutes:   1440,
			TrashMaxAgeDays:          30,
			Images: ImageCacheConfig{
				HTTPMaxAgeSeconds:          604800,   // 7 days
				HTTPPermanentMaxAgeSeconds: 31536000, // 1 year
			},
		},
		Users: UserManagementConfig{
			AllowManualRegistration: true,
		},
		StorageMetrics: StorageMetricsConfig{
			Enabled:         true,
			IntervalSeconds: 300,
		},
		Storage: StorageConfig{
			StoragePathTemplate: "{{assetUid}}/{{filename}}",
		},
		Security: SecurityConfig{
			Argon2MemoryMB: 64,
			Argon2Time:     3,
			Argon2Threads:  4,
		},
	}
}
