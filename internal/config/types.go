package config

var AppConfig ImagineConfig

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
	Username            string `json:"username" mapstructure:"username"`
	Password            string `json:"password" mapstructure:"password"`
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
type DatabaseConfig struct {
	Location string `json:"location" mapstructure:"location"`
	User     string `json:"user" mapstructure:"user"`
	Password string `json:"password" mapstructure:"password"`
	Name     string `json:"name" mapstructure:"name"`
	Port     int    `json:"port" mapstructure:"port"`
}

// LoggingConfig holds the configuration for logging.
type LoggingConfig struct {
	Level string `json:"level" mapstructure:"level"`
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

// CacheConfig holds the configuration for caching.
type CacheConfig struct {
	GCEnabled bool `json:"gc_enabled" mapstructure:"gc_enabled"`
}

type UserManagementConfig struct {
	AllowManualRegistration bool `json:"allow_manual_registration" mapstructure:"allow_manual_registration"`
}

type SecurityConfig struct {
	Argon2MemoryMB int `json:"argon2_memory_mb" mapstructure:"argon2_memory_mb"`
	Argon2Time     int `json:"argon2_time" mapstructure:"argon2_time"`
	Argon2Threads  int `json:"argon2_threads" mapstructure:"argon2_threads"`
}

// ImagineConfig is the root configuration structure.
type ImagineConfig struct {
	BaseURL        string               `json:"baseUrl" mapstructure:"baseUrl"`
	Logging        LoggingConfig        `json:"logging" mapstructure:"logging"`
	BaseDir        string               `json:"base_directory" mapstructure:"base_directory"`
	Upload         UploadConfig         `json:"upload" mapstructure:"upload"`
	Database       DatabaseConfig       `json:"database" mapstructure:"database"`
	Queue          QueueConfig          `json:"redis" mapstructure:"redis"`
	Libvips        LibvipsConfig        `json:"libvips" mapstructure:"libvips"`
	Cache          CacheConfig          `json:"cache" mapstructure:"cache"`
	UserManagement UserManagementConfig	`json:"user_management" mapstructure:"user_management"`
	StorageMetrics StorageMetricsConfig `json:"storage_metrics" mapstructure:"storage_metrics"`
	Security       SecurityConfig       `json:"security" mapstructure:"security"`
}
