package logger

import (
	"fmt"
	"log/slog"
	"os"

	"imagine/internal/utils"

	slogmulti "github.com/samber/slog-multi"
)

var (
	GlobalLogger *slog.Logger
)

type VizLogLevel string

func GetLevelFromString(level string) slog.Level {
	switch VizLogLevel(level) {
	case "debug":
		return slog.LevelDebug
	case "info":
		return slog.LevelInfo
	case "warn":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	case "fatal":
		return LevelFatal
	default:
		return slog.LevelInfo
	}
}

func SetupDefaultLogHandlers(logLevel slog.Level) []slog.Handler {
	logShowRecordEnv := os.Getenv("LOG_SHOW_RECORD")
	shouldAddSource := logShowRecordEnv == "true"
	isProduction := utils.IsProduction

	logFileJSON := FileLog{
		Directory: LogDirectoryDefault,
		Filename:  fmt.Sprintf("%s.json", LogFileFormatDefault),
	}

	consoleHandlerOpts := slog.HandlerOptions{
		AddSource: shouldAddSource,
		Level:     logLevel,
	}

	fileHandlerOpts := slog.HandlerOptions{
		AddSource: true,
		Level:     logLevel,
	}

	var consoleLogger slog.Handler
	if isProduction {
		// Production logger with no colour
		consoleLogger = slog.NewTextHandler(os.Stderr, &fileHandlerOpts)
	} else {
		// Setups up colour logger
		consoleLogger = NewColourHandler(&consoleHandlerOpts, WithDestinationWriter(os.Stderr), WithColor())
	}

	return []slog.Handler{
		slog.NewJSONHandler(logFileJSON, &fileHandlerOpts),
		consoleLogger,
	}
}

func CreateLogger(handlers []slog.Handler) *slog.Logger {
	return slog.New(slogmulti.Fanout(handlers...))
}

func CreateDefaultLogger(logLevel slog.Level) *slog.Logger {
	return CreateLogger(SetupDefaultLogHandlers(logLevel))
}
