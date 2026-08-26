package logger

import (
	"fmt"
	"log/slog"
	"os"

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

func SetupDefaultLogHandlers(logLevel slog.Level, useLocal bool, pretty bool) []slog.Handler {
	logShowRecordEnv := os.Getenv("LOG_SHOW_RECORD")
	shouldAddSource := logShowRecordEnv == "true"

	logFileJSON := FileLog{
		Directory: LogDirectoryDefault,
		Filename:  fmt.Sprintf("%s.json", LogFileFormatDefault),
	}

	consoleHandlerOpts := slog.HandlerOptions{
		AddSource:   shouldAddSource,
		Level:       logLevel,
		ReplaceAttr: ConvertTimeToLocalIfEnabled(useLocal, nil),
	}

	fileHandlerOpts := slog.HandlerOptions{
		AddSource:   true,
		Level:       logLevel,
		ReplaceAttr: ConvertTimeToLocalIfEnabled(useLocal, nil),
	}

	var consoleLogger slog.Handler
	if pretty {
		// Sets up colour pretty logger
		consoleLogger = NewColourHandler(&consoleHandlerOpts, WithDestinationWriter(os.Stderr), WithColor())
	} else {
		// Standard flat single-line JSON logging for log aggregators and Dokploy
		consoleLogger = slog.NewJSONHandler(os.Stderr, &consoleHandlerOpts)
	}

	return []slog.Handler{
		slog.NewJSONHandler(logFileJSON, &fileHandlerOpts),
		consoleLogger,
	}
}

func CreateLogger(handlers []slog.Handler) *slog.Logger {
	return slog.New(slogmulti.Fanout(handlers...))
}

func CreateDefaultLogger(logLevel slog.Level, useLocal bool, pretty bool) *slog.Logger {
	return CreateLogger(SetupDefaultLogHandlers(logLevel, useLocal, pretty))
}
