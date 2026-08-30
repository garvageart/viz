package config

var AppConfig VizConfig

type ServerConfig struct {
	// Host or IP the HTTP server binds to (e.g. 'localhost' or '0.0.0.0').
	Host string `json:"host,omitempty" mapstructure:"host"`
	// TCP port the API server listens on.
	Port int `json:"port,omitempty" mapstructure:"port" jsonschema:"minimum=1,maximum=65535"`
	// Server identification key or authentication secret.
	Key string `json:"key,omitempty" mapstructure:"key"`
}

// RedisConfig holds the configuration for a Redis connection.
type RedisConfig struct {
	// Enable Redis connection for async job processing and caching.
	Enabled bool `json:"enabled,omitempty" mapstructure:"enabled"`
	// Redis server host.
	Host string `json:"host,omitempty" mapstructure:"host"`
	// Redis server port.
	Port int `json:"port,omitempty" mapstructure:"port" jsonschema:"minimum=1,maximum=65535"`
	// Redis username for ACL authentication.
	Username string `json:"username,omitempty" mapstructure:"name"`
	// Redis password (prefer using REDIS_PASSWORD environment variable).
	Password string `json:"password,omitempty" mapstructure:"password"`
	// Redis database index.
	DB int `json:"db,omitempty" mapstructure:"db"`
	// Enable TLS encryption for Redis connection.
	UseTLS bool `json:"use_tls,omitempty" mapstructure:"use_tls"`
	// Redis client connection pool size.
	PoolSize int `json:"pool_size,omitempty" mapstructure:"pool_size"`
	// Redis connection dial timeout in seconds.
	DialTimeoutSeconds int `json:"dial_timeout_seconds,omitempty" mapstructure:"dial_timeout_seconds"`
	// Redis socket read timeout in seconds.
	ReadTimeoutSeconds int `json:"read_timeout_seconds,omitempty" mapstructure:"read_timeout_seconds"`
	// Redis socket write timeout in seconds.
	WriteTimeoutSeconds int `json:"write_timeout_seconds,omitempty" mapstructure:"write_timeout_seconds"`
}

// QueueConfig holds the configuration for the job queue.
type QueueConfig struct {
	RedisConfig `mapstructure:",squash"`
}

// DatabaseConfig holds the configuration for the database connection.
// Connection pool limits are applied at startup via sql.DB setters.
// Defaults are set in defaults.go. See docs/architecture/IMAGE_PROCESSING_MEMORY.md.
type DatabaseConfig struct {
	// Database host name or connection location.
	Location string `json:"location,omitempty" mapstructure:"location"`
	// Database username.
	User string `json:"user,omitempty" mapstructure:"user"`
	// Database password (prefer using DB_PASSWORD environment variable).
	Password string `json:"password,omitempty" mapstructure:"password"`
	// Database name.
	Name string `json:"name,omitempty" mapstructure:"name"`
	// PostgreSQL database port.
	Port int `json:"port,omitempty" mapstructure:"port" jsonschema:"minimum=1,maximum=65535"`

	// MaxOpenConns is the maximum number of open connections to the database.
	// Default: 25. Set to 0 for unlimited (not recommended in production).
	MaxOpenConns int `json:"max_open_conns,omitempty" mapstructure:"max_open_conns"`

	// MaxIdleConns is the maximum number of idle connections kept in the pool.
	// Default: 25. Should be ≤ MaxOpenConns.
	MaxIdleConns int `json:"max_idle_conns,omitempty" mapstructure:"max_idle_conns"`

	// ConnMaxLifetimeMinutes is how long (in minutes) a connection may be reused
	// before being recycled. Default: 5. Prevents stale connections from being
	// held open past server-side or load-balancer timeouts.
	ConnMaxLifetimeMinutes int `json:"conn_max_lifetime_minutes,omitempty" mapstructure:"conn_max_lifetime_minutes"`
}

// LoggingConfig holds the configuration for logging.
type LoggingConfig struct {
	// Minimum log level threshold.
	Level string `json:"level,omitempty" mapstructure:"level" jsonschema:"enum=debug,enum=info,enum=warn,enum=error"`
	// Timezone for log timestamps ("local" or "utc").
	Timezone string `json:"timezone,omitempty" mapstructure:"timezone" jsonschema:"enum=utc,enum=local"`
	// Enable colorized human-readable console logging instead of structured JSON.
	Pretty bool `json:"pretty,omitempty" mapstructure:"pretty"`
}

// UploadConfig holds the configuration for uploads.
type UploadConfig struct {
	// Directory name or path where uploaded files are placed.
	Location string `json:"location,omitempty" mapstructure:"location"`
}

// DownloadConfig holds the configuration for downloads.
type DownloadConfig struct {
	// Default base filename for downloaded ZIP archives.
	ZipExportName string `json:"zip_export_name,omitempty" mapstructure:"zip_export_name"`
}

// LibvipsConfig holds the configuration for libvips.
type LibvipsConfig struct {
	// Route libvips internal logs through application structured logging.
	MatchSystemLogging bool `json:"match_system_logging,omitempty" mapstructure:"match_system_logging"`
	// Maximum memory limit in MB for libvips operation cache (0 disables cache).
	CacheMaxMemoryMB int `json:"cache_max_memory_mb,omitempty" mapstructure:"cache_max_memory_mb"`
	// Maximum open files tracked in libvips operation cache (0 disables cache).
	CacheMaxFiles int `json:"cache_max_files,omitempty" mapstructure:"cache_max_files"`
	// Maximum operations retained in libvips cache (0 disables cache).
	CacheMaxOperations int `json:"cache_max_operations,omitempty" mapstructure:"cache_max_operations"`
	// libvips worker thread concurrency count.
	Concurrency int `json:"concurrency,omitempty" mapstructure:"concurrency"`
	// Enable SIMD vectorization in libvips image transformations.
	VectorEnabled bool `json:"vector_enabled,omitempty" mapstructure:"vector_enabled"`
}

// StorageMetricsConfig holds configuration for background storage calculation.
type StorageMetricsConfig struct {
	// Enable periodic disk storage calculations.
	Enabled bool `json:"enabled,omitempty" mapstructure:"enabled"`
	// Interval in seconds between storage metrics calculation runs.
	IntervalSeconds int `json:"interval_seconds,omitempty" mapstructure:"interval_seconds"`
}

// ImageCacheConfig holds caching configuration specific to images.
type ImageCacheConfig struct {
	// Cache-Control max-age header in seconds for standard derivative images (default 7 days).
	HTTPMaxAgeSeconds int `json:"http_max_age_seconds,omitempty" mapstructure:"http_max_age_seconds"`
	// Cache-Control max-age header in seconds for immutable permanent assets (default 1 year).
	HTTPPermanentMaxAgeSeconds int `json:"http_permanent_max_age_seconds,omitempty" mapstructure:"http_permanent_max_age_seconds"`
}

// CacheConfig holds the configuration for caching.
type CacheConfig struct {
	// Enable background garbage collection for cached derivatives.
	GCEnabled bool `json:"gc_enabled,omitempty" mapstructure:"gc_enabled"`
	// Allow eviction of permanent transforms during cache pruning.
	ClearPermanentTransforms bool `json:"clear_permanent_transforms,omitempty" mapstructure:"clear_permanent_transforms"`
	// Maximum cache disk budget in bytes (default 10 GB).
	MaxSizeBytes int64 `json:"max_size_bytes,omitempty" mapstructure:"max_size_bytes"`
	// Max age in days for unaccessed cache entries before cleanup.
	MaxAgeDays int `json:"max_age_days,omitempty" mapstructure:"max_age_days"`
	// Interval in minutes between automatic cache garbage collection sweeps.
	CleanupIntervalMinutes int `json:"cleanup_interval_minutes,omitempty" mapstructure:"cleanup_interval_minutes"`
	// Retention period in days for soft-deleted items in trash before purge.
	TrashMaxAgeDays int `json:"trash_max_age_days,omitempty" mapstructure:"trash_max_age_days"`
	// HTTP caching header parameters for image responses.
	Images ImageCacheConfig `json:"images,omitempty" mapstructure:"images"`
}

type UserManagementConfig struct {
	// Allow new users to sign up manually from the UI.
	AllowManualRegistration bool `json:"allow_manual_registration,omitempty" mapstructure:"allow_manual_registration"`
}

type SecurityConfig struct {
	// Memory cost parameter in MB for Argon2id password hashing (RFC 9106 recommended: 64MB).
	Argon2MemoryMB int `json:"argon2_memory_mb,omitempty" mapstructure:"argon2_memory_mb"`
	// Time cost (iterations) for Argon2id password hashing (RFC 9106 recommended: 3).
	Argon2Time int `json:"argon2_time,omitempty" mapstructure:"argon2_time"`
	// Parallelism threads for Argon2id password hashing (RFC 9106 recommended: 4).
	Argon2Threads int `json:"argon2_threads,omitempty" mapstructure:"argon2_threads"`
}

// StorageConfig holds the configuration for image storage paths.
type StorageConfig struct {
	// Template format for organizing asset storage paths.
	StoragePathTemplate string `json:"storage_path_template,omitempty" mapstructure:"storage_path_template"`
}

// VizConfig is the root configuration structure for viz.json.
//
//go:generate go run ../../tools/genschema -o ../../resources/schemas/viz.schema.json
type VizConfig struct {
	// HTTP server host and port settings.
	Server ServerConfig `json:"server,omitempty" mapstructure:"server"`
	// Base URL of the application instance (e.g. 'localhost' or 'https://photos.example.com').
	BaseURL string `json:"base_url,omitempty" mapstructure:"base_url"`
	// Hostnames and IP addresses the server is allowed to respond to.
	AllowedHosts []string `json:"allowed_hosts,omitempty" mapstructure:"allowed_hosts"`
	// Application timezone identifier (e.g. 'utc', 'local').
	Timezone string `json:"timezone,omitempty" mapstructure:"timezone"`
	// Application logging configuration.
	Logging LoggingConfig `json:"logging,omitempty" mapstructure:"logging"`
	// Base filesystem directory path for storing application data, assets, and caches.
	BaseDir string `json:"base_directory,omitempty" mapstructure:"base_directory"`
	// Asset upload settings.
	Upload UploadConfig `json:"upload,omitempty" mapstructure:"upload"`
	// Asset download and bulk export settings.
	Download DownloadConfig `json:"download,omitempty" mapstructure:"download"`
	// PostgreSQL database connection and pool settings.
	Database DatabaseConfig `json:"database,omitempty" mapstructure:"database"`
	// Redis connection settings for background task queues and caching.
	Queue QueueConfig `json:"redis,omitempty" mapstructure:"redis"`
	// libvips image processing engine configuration.
	Libvips LibvipsConfig `json:"libvips,omitempty" mapstructure:"libvips"`
	// Derivative asset caching and garbage collection settings.
	Cache CacheConfig `json:"cache,omitempty" mapstructure:"cache"`
	// User registration and authentication policies.
	Users UserManagementConfig `json:"users,omitempty" mapstructure:"users"`
	// Background storage metrics calculation settings.
	StorageMetrics StorageMetricsConfig `json:"storage_metrics,omitempty" mapstructure:"storage_metrics"`
	// Image filesystem layout configuration.
	Storage StorageConfig `json:"storage,omitempty" mapstructure:"storage"`
	// Security and password hashing configuration.
	Security SecurityConfig `json:"security,omitempty" mapstructure:"security"`
}

// PublicVizConfig is the sanitized public configuration safe to expose to frontend / clients.
type PublicVizConfig struct {
	BaseURL      string         `json:"base_url"`
	AllowedHosts []string       `json:"allowed_hosts"`
	Timezone     string         `json:"timezone"`
	Download     DownloadConfig `json:"download"`
	Storage      StorageConfig  `json:"storage"`
}

// Public returns a sanitized copy of VizConfig safe for public client injection and broadcast.
func (c VizConfig) Public() PublicVizConfig {
	return PublicVizConfig{
		BaseURL:      c.BaseURL,
		AllowedHosts: c.AllowedHosts,
		Timezone:     c.Logging.Timezone,
		Download:     c.Download,
		Storage:      c.Storage,
	}
}
