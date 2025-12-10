package config

import (
	"fmt"
	libos "imagine/internal/os"
	"imagine/internal/utils"

	"github.com/spf13/viper"
)

func ReadConfig() (viper.Viper, error) {
	configPath := libos.CurrentWorkingDirectory

	v := viper.New() // Create a new viper instance to avoid global state issues
	v.SetConfigName(utils.AppName)
	v.SetConfigType("json")
	v.AddConfigPath(configPath)

	err := v.ReadInConfig()
	if err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			return viper.Viper{}, fmt.Errorf("can't find config file: %w", err)
		} else {
			return viper.Viper{}, fmt.Errorf("error reading config file: %w", err)
		}
	}
	return *v, nil
}

func SetDefaultConfig() {
	AppConfig.Logging.Level = "info"
	AppConfig.UserManagement.AllowManualRegistration = true
	AppConfig.StorageMetrics.Enabled = false
	AppConfig.Database.Port = 5432
	
}

func GetConfig() ImagineConfig {
	return AppConfig
}

var (
	ServerKeys = map[string]string{
		"api":  "api",
		"viz":  "viz",
	}

	ImagineServers = func() map[string]*ImagineServer {
		var host string
		if utils.IsProduction {
			host = "0.0.0.0"
		} else {
			host = "localhost"
		}

		config, err := ReadConfig()
		if err != nil {
			panic("Unable to read config file " + err.Error())
		}

		result := map[string]*ImagineServer{}
		for _, serverKey := range ServerKeys {
			result[serverKey] = &ImagineServer{ServerConfig: &ServerConfig{}}

			result[serverKey].Port = config.GetInt(fmt.Sprintf("servers.%s.port", serverKey))
			result[serverKey].Host = host
			result[serverKey].Key = serverKey
		}

		return result
	}()
)