package logger

import (
	"context"
	"log/slog"
	"os"
)

func Fatal(logger *slog.Logger, msg string, args ...any) {
	logger.Log(context.Background(), LevelFatal, msg, args...)
	os.Exit(1)
}
