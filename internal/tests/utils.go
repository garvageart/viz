package tests

import (
	"fmt"
	"testing"
	"time"
	"viz/internal/entities"

	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// Helper function to create a new in-memory SQLite database
func NewTestDB(t *testing.T) *gorm.DB {
	// Use a unique database name to prevent data collision between concurrent/subsequent tests
	dbName := fmt.Sprintf("file:memdb-%d?mode=memory&cache=shared&_busy_timeout=5000", time.Now().UnixNano())
	db, err := gorm.Open(sqlite.Open(dbName), &gorm.Config{})
	assert.NoError(t, err)

	sqlDB, err := db.DB()
	assert.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)

	err = db.AutoMigrate(entities.Models()...)

	assert.NoError(t, err)
	return db
}
