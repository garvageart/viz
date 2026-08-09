package routes_test

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"log/slog"

	"github.com/go-chi/chi/v5"
	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"

	"viz/api/routes"
	"viz/internal/dto"
	"viz/internal/entities"
	"viz/internal/images"
	"viz/internal/tests"
)

// Helper function to create a new test logger
func newTestLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
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
	db := tests.NewTestDB(t)
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
	db := tests.NewTestDB(t)
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

func TestHardDeleteUserEdgeCases(t *testing.T) {
	db := tests.NewTestDB(t)

	// 1. Edge Case: Non-existent user UID returns ErrRecordNotFound
	err := entities.HardDeleteUser(db, "non-existent-uid")
	assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

	// 2. Edge Case: Full cascade deletion (Sessions, APIKeys, Settings, Collections, Images)
	userUid := "target-user-uid"
	otherUserUid := "other-user-uid"

	user := entities.User{Uid: userUid, Email: "target@example.com", Role: dto.UserRoleUser}
	otherUser := entities.User{Uid: otherUserUid, Email: "other@example.com", Role: dto.UserRoleUser}
	assert.NoError(t, db.Create(&user).Error)
	assert.NoError(t, db.Create(&otherUser).Error)

	// Session & APIKey & SettingOverride
	session := entities.Session{Uid: "sess-1", UserUid: userUid}
	apiKey := entities.APIKey{Uid: "key-1", UserID: &userUid}
	setting := entities.SettingOverride{UserId: userUid, Name: "theme", Value: "dark"}
	assert.NoError(t, db.Create(&session).Error)
	assert.NoError(t, db.Create(&apiKey).Error)
	assert.NoError(t, db.Create(&setting).Error)

	// User's own collection
	userColl := entities.Collection{Uid: "coll-1", Name: "User Coll", CreatedByID: &userUid, OwnerID: &userUid}
	assert.NoError(t, db.Create(&userColl).Error)

	// Other user's collection
	otherColl := entities.Collection{Uid: "coll-2", Name: "Other Coll", CreatedByID: &otherUserUid, OwnerID: &otherUserUid}
	assert.NoError(t, db.Create(&otherColl).Error)

	// Image assets
	image := entities.ImageAsset{Uid: "img-1", OwnerID: &userUid, UploadedByID: &userUid, Name: "test.jpg"}
	assert.NoError(t, db.Create(&image).Error)

	// CollectionImage added by target user to other user's collection
	collId := otherColl.ID
	collImg := entities.CollectionImage{CollectionID: &collId, Uid: image.Uid, AddedByID: &userUid}
	assert.NoError(t, db.Create(&collImg).Error)

	// Perform hard delete
	err = entities.HardDeleteUser(db, userUid)
	assert.NoError(t, err)

	// Assertions:
	// - User deleted
	var count int64
	db.Model(&entities.User{}).Unscoped().Where("uid = ?", userUid).Count(&count)
	assert.Equal(t, int64(0), count)

	// - Session, APIKey, Setting deleted
	db.Model(&entities.Session{}).Unscoped().Where("user_uid = ?", userUid).Count(&count)
	assert.Equal(t, int64(0), count)

	db.Model(&entities.APIKey{}).Unscoped().Where("user_id = ?", userUid).Count(&count)
	assert.Equal(t, int64(0), count)

	db.Model(&entities.SettingOverride{}).Unscoped().Where("user_id = ?", userUid).Count(&count)
	assert.Equal(t, int64(0), count)

	// - User's collection deleted
	db.Model(&entities.Collection{}).Unscoped().Where("id = ?", userColl.ID).Count(&count)
	assert.Equal(t, int64(0), count)

	// - Other collection remains, but collection_images added by target user deleted
	db.Model(&entities.Collection{}).Unscoped().Where("id = ?", otherColl.ID).Count(&count)
	assert.Equal(t, int64(1), count)

	db.Model(&entities.CollectionImage{}).Unscoped().Where("added_by_id = ?", userUid).Count(&count)
	assert.Equal(t, int64(0), count)

	// - Image asset still exists, but owner_id and uploaded_by_id nullified
	var updatedImg entities.ImageAsset
	assert.NoError(t, db.Unscoped().Where("uid = ?", image.Uid).First(&updatedImg).Error)
	assert.Nil(t, updatedImg.OwnerID)
	assert.Nil(t, updatedImg.UploadedByID)
}
