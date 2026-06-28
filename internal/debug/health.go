package debug

import (
	"context"

	"gorm.io/gorm"
)

// HealthService provides health check functionality for the application.
type HealthService struct {
	db *gorm.DB
}

// NewHealthService creates a new HealthService instance with the given database connection.
func NewHealthService(db *gorm.DB) *HealthService {
	return &HealthService{
		db: db,
	}
}

// Check performs a health check by pinging the database and returns the result status.
func (h *HealthService) Check(ctx context.Context) map[string]string {
	var err error
	if err = h.db.WithContext(ctx).Exec("SELECT 1").Error; err != nil {
		return map[string]string{
			"database": "error: " + err.Error(),
		}
	}
	return map[string]string{
		"database": "ok",
	}
}

// IsReady returns true if the database connection is healthy and ready.
func (h *HealthService) IsReady(ctx context.Context) bool {
	result := h.Check(ctx)
	return result["database"] == "ok"
}
