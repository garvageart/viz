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
	dbName := fmt.Sprintf("file:memdb-%d?mode=memory&cache=shared", time.Now().UnixNano())
	db, err := gorm.Open(sqlite.Open(dbName), &gorm.Config{})
	assert.NoError(t, err)

	err = db.AutoMigrate(
		entities.ImageAsset{},
		entities.Collection{},
		entities.CollectionImage{},
		entities.Session{},
		entities.APIKey{},
		entities.User{},
		entities.DownloadToken{},
		entities.WorkerJob{},
		entities.UserWithPassword{},
		entities.SettingDefault{},
		entities.SettingOverride{},
		entities.ImageTransform{},
	)

	assert.NoError(t, err)
	return db
}
