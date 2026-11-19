package workers

import (
	"log/slog"

	"gorm.io/gorm"

	"viz/internal/http"
	"viz/internal/jobs"
)

// Definitions returns every worker definition that is compiled into viz.
// This is the single list used for the catalog, the service, and the queue.
func Definitions(db *gorm.DB, wsBroker *http.WSBroker, logger *slog.Logger) []jobs.Definition {
	return []jobs.Definition{
		ImageProcessDefinition(db, wsBroker),
		ExifProcessDefinition(db, wsBroker),
		XMPGenerationDefinition(db, wsBroker, logger),
	}
}
