package utils

import (
	"os"
	"testing"
)

const (
	AppName = "viz"
)

var (
	IsProduction  = IsEnvironment("production")
	IsTest        = testing.Testing() || IsEnvironment("test")
	IsDevelopment = !IsProduction && !IsTest

	Environment = func() string {
		if env := os.Getenv("ENV"); env != "" {
			return env
		}
		return "development"
	}()
)
