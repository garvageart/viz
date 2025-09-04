package http

import (
	"fmt"
	"log/slog"
	"strings"

	imalog "imagine/internal/logger"
)

func setupChiLogHandler(name string) []slog.Handler {
	httpLogFileDefaults := imalog.LogFileDefaults
	logLevel := imalog.DefaultLogLevel

	logFileWriter := imalog.FileLog{
		Directory: httpLogFileDefaults.Directory + "/http",
		Filename:  fmt.Sprintf("%s-http-%s", imalog.LogFileFormatDefault, strings.ReplaceAll(name, "-", "_")),
	}

	fileHandler := imalog.NewFileLogger(&imalog.ImalogHandlerOptions{
		Writer: logFileWriter,
		HandlerOptions: &slog.HandlerOptions{
			AddSource: true,
			Level:     logLevel,
			// Strip all ANSI codes from the log output set by the
			// go-chi logger middleware. Even if colour logging is disabled is production
			// during development the middleware wraps strings in colour
			ReplaceAttr: func(groups []string, a slog.Attr) slog.Attr {
				if a.Key == slog.MessageKey {
					a.Value = slog.StringValue(imalog.StripAnsi(a.Value.String()))
				}
				return a
			},
		},
	})

	// Setup console logger
	consoleHandler := imalog.NewColourHandler(&slog.HandlerOptions{
		Level:     logLevel,
		AddSource: false,
	})

	return []slog.Handler{
		fileHandler,
		consoleHandler,
	}
}
func SetupChiLogger(name string) *slog.Logger {
	handlers := setupChiLogHandler(name)

	logger := imalog.CreateLogger(handlers)
	return logger
}
