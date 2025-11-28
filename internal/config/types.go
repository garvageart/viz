package config

// RedisConfig holds the configuration for a Redis connection.
type RedisConfig struct {
	Enabled             bool   `json:"enabled"`
	Host                string `json:"host"`
	Port                int    `json:"port"`
	Username            string `json:"username"`
	Password            string `json:"password"`
	DB                  int    `json:"db"`
	UseTLS              bool   `json:"use_tls"`
	PoolSize            int    `json:"pool_size"`
	DialTimeoutSeconds  int    `json:"dial_timeout_seconds"`
	ReadTimeoutSeconds  int    `json:"read_timeout_seconds"`
	WriteTimeoutSeconds int    `json:"write_timeout_seconds"`
}

// QueueConfig holds the configuration for the job queue.
type QueueConfig struct {
	RedisConfig `mapstructure:",squash"`
}

// DatabaseConfig holds the configuration for the database connection.
type DatabaseConfig struct {
	Location string `json:"location"`
	User     string `json:"user"`
	Password string `json:"password"`
	Name     string `json:"name"`
	Port     int    `json:"port"`
}

// LoggingConfig holds the configuration for logging.
type LoggingConfig struct {
	Level string `json:"level"`
}

// UploadConfig holds the configuration for uploads.
type UploadConfig struct {
	Location string `json:"location"`
}

// LibvipsConfig holds the configuration for libvips.
type LibvipsConfig struct {
	MatchSystemLogging bool `json:"match_system_logging"`
	CacheMaxMemoryMB   int  `json:"cache_max_memory_mb"`
	CacheMaxFiles      int  `json:"cache_max_files"`
	Concurrency        int  `json:"concurrency"`
}

// ImagineConfig is the root configuration structure.
type ImagineConfig struct {
	BaseURL   string          `json:"baseUrl"`
	Logging   LoggingConfig   `json:"logging"`
	BaseDir   string          `json:"base_directory"`
	Upload    UploadConfig    `json:"upload"`
	Database  DatabaseConfig  `json:"database"`
	Queue     QueueConfig     `json:"redis"`
	Libvips   LibvipsConfig   `json:"libvips"`
	Cache     CacheConfig     `json:"cache"`
}

// CacheConfig holds the configuration for caching.
type CacheConfig struct {
	GCEnabled bool `json:"gc_enabled"`
}