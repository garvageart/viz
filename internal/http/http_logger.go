package http

import (
	"fmt"
	"log/slog"
	"os"
	"strings"

	imalog "viz/internal/logger"
	"viz/internal/utils"
)

func setupChiLogHandler(name string, logLevel slog.Level) []slog.Handler {
	httpLogFileDefaults := imalog.LogFileDefaults
	logShowRecordEnv := os.Getenv("LOG_SHOW_RECORD")
	shouldAddSource := logShowRecordEnv == "true"
	isProduction := utils.IsProduction

	httpLogFileWriter := imalog.FileLog{
		Directory: httpLogFileDefaults.Directory + "/http",
		Filename:  fmt.Sprintf("%s-http-%s", imalog.LogFileFormatDefault, strings.ReplaceAll(name, "-", "_")),
	}

	logFileJSON := imalog.FileLog{
		Directory: imalog.LogDirectoryDefault,
		Filename:  fmt.Sprintf("%s.json", imalog.LogFileFormatDefault),
	}

	// Strip all ANSI codes from the log output set by the
	// go-chi logger middleware. Even if colour logging is disabled is production
	// during development the middleware wraps strings in colour
	replaceAttrsFunc := func(groups []string, a slog.Attr) slog.Attr {
		if a.Key == slog.MessageKey {
			a.Value = slog.StringValue(imalog.StripAnsi(a.Value.String()))
		}
		return a
	}

	fileHandlerOpts := &slog.HandlerOptions{
		AddSource: true,
		Level:     logLevel,
		ReplaceAttr: replaceAttrsFunc,
	}

	httpLogFileHandler := imalog.NewFileLogger(&imalog.ImalogHandlerOptions{
		Writer: httpLogFileWriter,
		HandlerOptions: fileHandlerOpts,
	})

	mainLogFileHandler := imalog.NewFileLogger(&imalog.ImalogHandlerOptions{
		Writer: logFileJSON,
		HandlerOptions: &slog.HandlerOptions{
			AddSource: true,
			Level:     logLevel,
		},
	})

	consoleHandlerOpts := slog.HandlerOptions{
		AddSource: shouldAddSource,
		Level:     logLevel,
	}

	var consoleLogger slog.Handler
	if isProduction {
		// Production logger with no colour
		consoleLogger = slog.NewTextHandler(os.Stderr, fileHandlerOpts)
	} else {
		// Setups up colour logger
		consoleLogger = imalog.NewColourHandler(&consoleHandlerOpts, imalog.WithDestinationWriter(os.Stderr), imalog.WithColor())
	}

	return []slog.Handler{
		httpLogFileHandler,
		mainLogFileHandler,
		consoleLogger,
	}
}

func SetupChiLogger(name string, logLevel slog.Level) *slog.Logger {
	handlers := setupChiLogHandler(name, logLevel)

	logger := imalog.CreateLogger(handlers)
	return logger
}
