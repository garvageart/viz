package config

var AppConfig VizConfig

type ServerConfig struct {
	Host string `json:"host" mapstructure:"host"`
	Port int    `json:"port" mapstructure:"port"`
	Key  string `json:"key" mapstructure:"key"`
}

// RedisConfig holds the configuration for a Redis connection.
type RedisConfig struct {
	Enabled             bool   `json:"enabled" mapstructure:"enabled"`
	Host                string `json:"host" mapstructure:"host"`
	Port                int    `json:"port" mapstructure:"port"`
	Username            string `json:"username" mapstructure:"name"`
	Password            string `json:"password,omitempty" mapstructure:"password"`
	DB                  int    `json:"db" mapstructure:"db"`
	UseTLS              bool   `json:"use_tls" mapstructure:"use_tls"`
	PoolSize            int    `json:"pool_size" mapstructure:"pool_size"`
	DialTimeoutSeconds  int    `json:"dial_timeout_seconds" mapstructure:"dial_timeout_seconds"`
	ReadTimeoutSeconds  int    `json:"read_timeout_seconds" mapstructure:"read_timeout_seconds"`
	WriteTimeoutSeconds int    `json:"write_timeout_seconds" mapstructure:"write_timeout_seconds"`
}

// QueueConfig holds the configuration for the job queue.
type QueueConfig struct {
	RedisConfig `mapstructure:",squash"`
}

// DatabaseConfig holds the configuration for the database connection.
// Connection pool limits are applied at startup via sql.DB setters.
// Defaults are set in config.go. See docs/architecture/IMAGE_PROCESSING_MEMORY.md.
type DatabaseConfig struct {
	Location string `json:"location" mapstructure:"location"`
	User     string `json:"user" mapstructure:"user"`
	Password string `json:"password,omitempty" mapstructure:"password"`
	Name     string `json:"name" mapstructure:"name"`
	Port     int    `json:"port" mapstructure:"port"`

	// MaxOpenConns is the maximum number of open connections to the database.
	// Default: 25. Set to 0 for unlimited (not recommended in production).
	MaxOpenConns int `json:"max_open_conns" mapstructure:"max_open_conns"`

	// MaxIdleConns is the maximum number of idle connections kept in the pool.
	// Default: 25. Should be ≤ MaxOpenConns.
	MaxIdleConns int `json:"max_idle_conns" mapstructure:"max_idle_conns"`

	// ConnMaxLifetimeMinutes is how long (in minutes) a connection may be reused
	// before being recycled. Default: 5. Prevents stale connections from being
	// held open past server-side or load-balancer timeouts.
	ConnMaxLifetimeMinutes int `json:"conn_max_lifetime_minutes" mapstructure:"conn_max_lifetime_minutes"`
}

// LoggingConfig holds the configuration for logging.
type LoggingConfig struct {
	Level    string `json:"level" mapstructure:"level"`
	Timezone string `json:"timezone" mapstructure:"timezone"` // "local" or "utc"
}

// UploadConfig holds the configuration for uploads.
type UploadConfig struct {
	Location string `json:"location" mapstructure:"location"`
}

// LibvipsConfig holds the configuration for libvips.
type LibvipsConfig struct {
	MatchSystemLogging bool `json:"match_system_logging" mapstructure:"match_system_logging"`
	CacheMaxMemoryMB   int  `json:"cache_max_memory_mb" mapstructure:"cache_max_memory_mb"`
	CacheMaxFiles      int  `json:"cache_max_files" mapstructure:"cache_max_files"`
	CacheMaxOperations int  `json:"cache_max_operations" mapstructure:"cache_max_operations"`
	Concurrency        int  `json:"concurrency" mapstructure:"concurrency"`
	VectorEnabled      bool `json:"vector_enabled" mapstructure:"vector_enabled"`
}

// StorageMetricsConfig holds configuration for background storage calculation.
type StorageMetricsConfig struct {
	Enabled         bool `json:"enabled" mapstructure:"enabled"`
	IntervalSeconds int  `json:"interval_seconds" mapstructure:"interval_seconds"`
}

// ImageCacheConfig holds caching configuration specific to images.
type ImageCacheConfig struct {
	HTTPMaxAgeSeconds          int `json:"http_max_age_seconds" mapstructure:"http_max_age_seconds"`
	HTTPPermanentMaxAgeSeconds int `json:"http_permanent_max_age_seconds" mapstructure:"http_permanent_max_age_seconds"`
}

// CacheConfig holds the configuration for caching.
type CacheConfig struct {
	GCEnabled                bool             `json:"gc_enabled" mapstructure:"gc_enabled"`
	ClearPermanentTransforms bool             `json:"clear_permanent_transforms" mapstructure:"clear_permanent_transforms"`
	MaxSizeBytes             int64            `json:"max_size_bytes" mapstructure:"max_size_bytes"`
	MaxAgeDays               int              `json:"max_age_days" mapstructure:"max_age_days"`
	CleanupIntervalMinutes   int              `json:"cleanup_interval_minutes" mapstructure:"cleanup_interval_minutes"`
	TrashMaxAgeDays          int              `json:"trash_max_age_days" mapstructure:"trash_max_age_days"`
	Images                   ImageCacheConfig `json:"images" mapstructure:"images"`
}

type UserManagementConfig struct {
	AllowManualRegistration bool `json:"allow_manual_registration" mapstructure:"allow_manual_registration"`
}

type SecurityConfig struct {
	Argon2MemoryMB int `json:"argon2_memory_mb" mapstructure:"argon2_memory_mb"`
	Argon2Time     int `json:"argon2_time" mapstructure:"argon2_time"`
	Argon2Threads  int `json:"argon2_threads" mapstructure:"argon2_threads"`
}

// StorageConfig holds the configuration for image storage paths.
type StorageConfig struct {
	StoragePathTemplate string `json:"storage_path_template" mapstructure:"storage_path_template"`
}

// VizConfig is the root configuration structure.
type VizConfig struct {
	BaseURL        string               `json:"baseUrl" mapstructure:"baseUrl"`
	AllowedHosts   []string             `json:"allowed_hosts" mapstructure:"allowed_hosts"`
	Logging        LoggingConfig        `json:"logging" mapstructure:"logging"`
	BaseDir        string               `json:"base_directory" mapstructure:"base_directory"`
	Upload         UploadConfig         `json:"upload" mapstructure:"upload"`
	Database       DatabaseConfig       `json:"database" mapstructure:"database"`
	Queue          QueueConfig          `json:"redis" mapstructure:"redis"`
	Libvips        LibvipsConfig        `json:"libvips" mapstructure:"libvips"`
	Cache          CacheConfig          `json:"cache" mapstructure:"cache"`
	Users          UserManagementConfig `json:"users" mapstructure:"users"`
	StorageMetrics StorageMetricsConfig `json:"storage_metrics" mapstructure:"storage_metrics"`
	Storage        StorageConfig        `json:"storage" mapstructure:"storage"`
	Security       SecurityConfig       `json:"security" mapstructure:"security"`
}
