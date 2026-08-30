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

	// Bind Defaults from DefaultConfig()
	bindConfigDefaults(v, DefaultConfig())

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

func bindConfigDefaults(v *viper.Viper, defaults VizConfig) {
	data, err := json.Marshal(defaults)
	if err != nil {
		return
	}

	var m map[string]any
	if err := json.Unmarshal(data, &m); err != nil {
		return
	}

	for k, val := range m {
		v.SetDefault(k, val)
	}
}

var (
	BaseDirectory string
)

func init() {
	cfg, err := ReadConfig()
	if err != nil {
		panic(err)
	}

	AppConfig = DefaultConfig()
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
