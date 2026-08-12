package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	libos "viz/internal/os"
	"viz/internal/utils"

	"github.com/joho/godotenv"
	"github.com/spf13/viper"
)

const ConfigFileName = "viz.json"
const DefaultDataDirectory = "./data"

// ReadConfig reads the config file and environment variables
// to create a viper instance that can be used throughout the application
//
// Order of importance:
// Env Variables -> viz.json -> Defaults
//
// Defaults will apply if config or environments values fail to parse
func ReadConfig() (viper.Viper, error) {
	// Load environment variables from .env if present in project root
	_ = godotenv.Load(filepath.Join(libos.ProjectRoot, ".env"))

	configPath := libos.CurrentWorkingDirectory

	v := viper.New() // Create a new viper instance to avoid global state issues
	v.SetConfigName(utils.AppName)
	v.SetConfigType("json")
	v.AddConfigPath(configPath)
	v.AddConfigPath(libos.ProjectRoot)

	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	// Bind specific env vars
	_ = v.BindEnv("server.port", "API_PORT")
	_ = v.BindEnv("server.host", "API_HOST")
	_ = v.BindEnv("database.host", "DB_HOST")
	_ = v.BindEnv("database.port", "DB_PORT")
	_ = v.BindEnv("database.user", "DB_USER")
	_ = v.BindEnv("database.password", "DB_PASSWORD")
	_ = v.BindEnv("database.name", "DB_NAME")
	_ = v.BindEnv("redis.password", "REDIS_PASSWORD")
	_ = v.BindEnv("base_directory", "BASE_DIRECTORY")
	_ = v.BindEnv("upload.location", "UPLOAD_LOCATION")

	// Set Defaults
	v.SetDefault("base_url", "localhost")
	v.SetDefault("base_directory", DefaultDataDirectory)
	v.SetDefault("upload.location", "library")
	v.SetDefault("timezone", "utc")
	v.SetDefault("allowed_hosts", []string{})
	v.SetDefault("server.port", 7770)
	if utils.IsProduction {
		v.SetDefault("server.host", "0.0.0.0")
	} else {
		v.SetDefault("server.host", "localhost")
	}

	v.SetDefault("logging.level", "debug")

	v.SetDefault("database.location", "database")
	v.SetDefault("database.port", 5432)
	v.SetDefault("database.name", "viz")
	v.SetDefault("database.user", "postgres")
	v.SetDefault("database.max_open_conns", 25)
	v.SetDefault("database.max_idle_conns", 25)
	v.SetDefault("database.conn_max_lifetime_minutes", 5)

	v.SetDefault("redis.enabled", false)
	v.SetDefault("redis.host", "localhost")
	v.SetDefault("redis.port", 6379)
	v.SetDefault("redis.db", 0)
	v.SetDefault("redis.use_tls", false)
	v.SetDefault("redis.pool_size", 10)
	v.SetDefault("redis.dial_timeout_seconds", 5)
	v.SetDefault("redis.read_timeout_seconds", 3)
	v.SetDefault("redis.write_timeout_seconds", 3)

	v.SetDefault("libvips.match_system_logging", false)
	v.SetDefault("libvips.cache_max_memory_mb", 0)
	v.SetDefault("libvips.cache_max_files", 0)
	v.SetDefault("libvips.cache_max_operations", 0)
	v.SetDefault("libvips.concurrency", 1)

	v.SetDefault("storage.storage_path_template", "{{assetUid}}/{{filename}}")
	v.SetDefault("storage_metrics.enabled", true)
	v.SetDefault("storage_metrics.interval_seconds", 300)

	v.SetDefault("users.allow_manual_registration", true)

	// Cache defaults
	v.SetDefault("cache.gc_enabled", true)
	v.SetDefault("cache.images.http_max_age_seconds", 604800)             // 1 week
	v.SetDefault("cache.images.http_permanent_max_age_seconds", 31536000) // 1 year
	v.SetDefault("cache.cleanup_interval_minutes", 1440)                  // 24 hours
	v.SetDefault("cache.max_size_bytes", 10*1024*1024*1024)               // 10 GB
	v.SetDefault("cache.max_age_days", 30)
	v.SetDefault("cache.clear_permanent_transforms", false)
	v.SetDefault("cache.trash_max_age_days", 30) // 30 days

	// Security defaults (RFC 9106)
	v.SetDefault("security.argon2_memory_mb", 64)
	v.SetDefault("security.argon2_time", 3)
	v.SetDefault("security.argon2_threads", 4)

	err := v.ReadInConfig()
	if err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			// Config file not found; ignore error and use defaults
			// TODO: log this somehow
			return *v, nil
		} else {
			return viper.Viper{}, fmt.Errorf("error reading config file: %w", err)
		}
	}

	return *v, nil
}

func GetConfig() VizConfig {
	return AppConfig
}

// WriteConfig writes the updated configuration back to the viz.json file.
func WriteConfig(cfg VizConfig) error {
	AppConfig = cfg

	// Clear secrets before marshaling so they are never written to the file
	writeCfg := cfg
	writeCfg.Database.Password = ""
	writeCfg.Queue.Password = ""

	jsonBytes, err := json.MarshalIndent(writeCfg, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	configPath := filepath.Join(libos.CurrentWorkingDirectory, ConfigFileName)
	err = os.WriteFile(configPath, jsonBytes, 0644)
	if err != nil {
		// Fallback to project root
		configPath = filepath.Join(libos.ProjectRoot, ConfigFileName)
		err = os.WriteFile(configPath, jsonBytes, 0644)
		if err != nil {
			return fmt.Errorf("failed to write config file: %w", err)
		}
	}
	return nil
}

var (
	BaseDirectory string
)

func init() {
	cfg, err := ReadConfig()
	if err != nil {
		panic(err)
	}

	if err := cfg.Unmarshal(&AppConfig); err != nil {
		panic(fmt.Errorf("failed to unmarshal config into AppConfig: %w", err))
	}

	baseDir := cfg.GetString("base_directory")
	if strings.TrimSpace(baseDir) == "" {
		panic("base directory is not set in config")
	}

	if !filepath.IsAbs(baseDir) {
		baseDir = filepath.Join(libos.ProjectRoot, baseDir)
	}

	AppConfig.BaseDir = baseDir
	BaseDirectory = baseDir

	libos.MustCreateDirectory(baseDir)
}
