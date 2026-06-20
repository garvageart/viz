package routes_test

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"log/slog"

	"viz/api/routes"
	"viz/internal/dto"
	"viz/internal/entities"
	"viz/internal/images"
)

// Helper function to create a new test logger
func newTestLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

// Helper function to create a new in-memory SQLite database
func newTestDB(t *testing.T) *gorm.DB {
	// Use a unique database name to prevent data collision between concurrent/subsequent tests
	dbName := fmt.Sprintf("file:memdb-%d?mode=memory&cache=shared", time.Now().UnixNano())
	db, err := gorm.Open(sqlite.Open(dbName), &gorm.Config{})
	assert.NoError(t, err)
	// Auto-migrate all entities
	err = db.AutoMigrate(
		&entities.User{},
		&entities.ImageAsset{},
		&entities.Collection{},
		&entities.Session{},
		&entities.APIKey{},
		&entities.DownloadToken{},
		&entities.WorkerJob{},
		&entities.UserWithPassword{},
		&entities.SettingDefault{},
		&entities.SettingOverride{},
	)
	assert.NoError(t, err)
	return db
}

// Helper function to create an admin user and session token
func createAdminSession(t *testing.T, db *gorm.DB) string {
	admin := entities.User{
		Uid:   "admin-uid",
		Email: "admin@example.com",
		Role:  dto.UserRoleAdmin,
	}
	err := db.Create(&admin).Error
	assert.NoError(t, err)

	future := time.Now().Add(1 * time.Hour)
	session := entities.Session{
		Uid:       "session-uid",
		Token:     "valid-token",
		UserUid:   admin.Uid,
		ExpiresAt: &future,
	}
	err = db.Create(&session).Error
	assert.NoError(t, err)

	return "valid-token"
}

func TestAdminSystemStats(t *testing.T) {
	db := newTestDB(t)
	token := createAdminSession(t, db)
	logger := newTestLogger()
	storageStats := images.NewStorageStatsHolder(os.TempDir()) // Use temp dir for stats

	r := chi.NewRouter()
	r.Mount("/admin", routes.AdminRouter(db, logger, storageStats))

	ts := httptest.NewServer(r)
	defer ts.Close()

	// Make request with session cookie to the system stats endpoint
	req, err := http.NewRequest(http.MethodGet, ts.URL+"/admin/system/stats", nil)
	assert.NoError(t, err)
	req.AddCookie(&http.Cookie{
		Name:  "viz-auth_token",
		Value: token,
	})

	resp, err := ts.Client().Do(req)
	assert.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var stats dto.SystemStatsResponse
	err = json.NewDecoder(resp.Body).Decode(&stats)
	assert.NoError(t, err)

	// Assertions for SystemStatsResponse
	assert.GreaterOrEqual(t, stats.UptimeSeconds, int64(0))
	assert.GreaterOrEqual(t, stats.NumGoroutine, 1) // At least one goroutine should be running
	assert.GreaterOrEqual(t, stats.AllocMemory, int64(0))
	assert.GreaterOrEqual(t, stats.SysMemory, int64(0))
	assert.GreaterOrEqual(t, stats.StorageUsedBytes, int64(0))
	assert.NotEmpty(t, stats.StoragePath)
	assert.NotNil(t, stats.TotalSystemSpaceBytes)
	assert.GreaterOrEqual(t, stats.TotalSystemSpaceBytes, int64(0))
}

func TestAdminDatabaseStats(t *testing.T) {
	db := newTestDB(t)
	token := createAdminSession(t, db)
	logger := newTestLogger()
	storageStats := images.NewStorageStatsHolder(os.TempDir())

	r := chi.NewRouter()
	r.Mount("/admin", routes.AdminRouter(db, logger, storageStats))

	ts := httptest.NewServer(r)
	defer ts.Close()

	// Make request with session cookie to the database stats endpoint
	req, err := http.NewRequest(http.MethodGet, ts.URL+"/admin/db/stats", nil)
	assert.NoError(t, err)
	req.AddCookie(&http.Cookie{
		Name:  "viz-auth_token",
		Value: token,
	})

	resp, err := ts.Client().Do(req)
	assert.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var stats dto.DatabaseStatsResponse
	err = json.NewDecoder(resp.Body).Decode(&stats)
	assert.NoError(t, err)

	// Assertions for DatabaseStatsResponse
	assert.GreaterOrEqual(t, stats.UserCount, int64(0))
	assert.GreaterOrEqual(t, stats.ImageCount, int64(0))
	assert.GreaterOrEqual(t, stats.CollectionCount, int64(0))

	// DbSizeBytes and ActiveConnections are Postgres-specific and can be nil for SQLite
	if db.Dialector.Name() == "postgres" {
		assert.NotNil(t, stats.DbSizeBytes)
		assert.GreaterOrEqual(t, *stats.DbSizeBytes, int64(0))
		assert.NotNil(t, stats.ActiveConnections)
		assert.GreaterOrEqual(t, *stats.ActiveConnections, int64(0))
	} else {
		assert.Nil(t, stats.DbSizeBytes)
		assert.Nil(t, stats.ActiveConnections)
	}
}
