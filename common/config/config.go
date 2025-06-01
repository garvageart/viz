package config

***REMOVED***
***REMOVED***

***REMOVED***

	"github.com/spf13/viper"

	libos "imagine/common/os"
***REMOVED***

type Config[T any] interface {
	ReadConfig(***REMOVED*** (map[string]T, error***REMOVED***
***REMOVED***

func ReadConfig(***REMOVED*** (viper.Viper, error***REMOVED*** {
	configPath := libos.CurrentWorkingDirectory + "/config"

	viper.SetConfigName(utils.AppName***REMOVED***
	viper.SetConfigType("json"***REMOVED***
	viper.AddConfigPath(configPath***REMOVED***

	err := viper.ReadInConfig(***REMOVED***

***REMOVED***
		if _, ok := err.(viper.ConfigFileNotFoundError***REMOVED***; ok {
			return viper.Viper{***REMOVED***, fmt.Errorf("can't find config file: %w", err***REMOVED***
	***REMOVED*** else {
			return viper.Viper{***REMOVED***, fmt.Errorf("error reading config file: %w", err***REMOVED***
	***REMOVED***
***REMOVED***

	return *viper.GetViper(***REMOVED***, nil
***REMOVED***
