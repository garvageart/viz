package db

import (
	"context"
	"fmt"
	"io/fs"
	"log/slog"

	"github.com/pressly/goose/v3"
	"gorm.io/gorm"

	"viz/internal/logger"
)

type gooseLogger struct {
	logger *slog.Logger
}

func (g *gooseLogger) Fatal(v ...any) {
	g.logger.Log(context.Background(), logger.LevelFatal, fmt.Sprint(v...))
}

func (g *gooseLogger) Fatalf(format string, v ...any) {
	g.logger.Log(context.Background(), logger.LevelFatal, fmt.Sprintf(format, v...))
}

func (g *gooseLogger) Print(v ...any) {
	g.logger.Info(fmt.Sprint(v...))
}

func (g *gooseLogger) Println(v ...any) {
	g.logger.Info(fmt.Sprintln(v...))
}

func (g *gooseLogger) Printf(format string, v ...any) {
	g.logger.Info(fmt.Sprintf(format, v...))
}

func RunGooseMigrations(gormDB *gorm.DB, logger *slog.Logger, migrationFS fs.FS) error {
	logger.Info("Starting Goose database migrations...")

	sqlDB, err := gormDB.DB()
	if err != nil {
		return fmt.Errorf("failed to get standard sql.DB connection: %w", err)
	}

	goose.SetBaseFS(migrationFS)

	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("failed to set goose dialect: %w", err)
	}

	goose.SetLogger(&gooseLogger{logger: logger})

	// Run Up migrations on the sub-directory "sql" where SQL files are embedded
	if err := goose.Up(sqlDB, "sql"); err != nil {
		return fmt.Errorf("goose up failed: %w", err)
	}

	logger.Info("Goose database migrations completed successfully.")
	return nil
}
