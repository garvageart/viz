package jobs

import (
	"fmt"
	"log/slog"
	"time"

	"github.com/go-co-op/gocron/v2"
	"gorm.io/gorm"

	"viz/internal/config"
)

func Start(db *gorm.DB, logger *slog.Logger, cfg config.VizConfig) error {
	scheduler, err := gocron.NewScheduler(gocron.WithLocation(time.Now().Location()))
	if err != nil {
		return fmt.Errorf("error creating scheduler: %w", err)
	}

	Jobs = make(map[string]gocron.Job)
	Scheduler = scheduler

	// Register daily trash cleanup job (runs at midnight)
	cleanupFunc := func() {
		PurgeExpiredTrash(db, cfg, logger)
	}
	if err := CreateJob("trash_cleanup", "0 0 * * *", cleanupFunc); err != nil {
		return fmt.Errorf("failed to register trash cleanup job: %w", err)
	}

	// Start the scheduler
	scheduler.Start()

	return nil
}

func Shutdown() error {
	return Scheduler.Shutdown()
}
