package routes_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"gorm.io/gorm"

	"viz/api/routes"
	"viz/internal/dto"
	"viz/internal/entities"
	libhttp "viz/internal/http"
	"viz/internal/tests"
)

func createTestUserSession(t *testing.T, db *gorm.DB) (string, entities.User) {
	user := entities.User{
		Uid:   fmt.Sprintf("user-%d", time.Now().UnixNano()),
		Email: "user@example.com",
		Role:  dto.UserRoleUser,
	}
	require.NoError(t, db.Create(&user).Error)

	future := time.Now().Add(1 * time.Hour)
	session := entities.Session{
		Uid:       fmt.Sprintf("sess-%d", time.Now().UnixNano()),
		UserUid:   user.Uid,
		Token:     fmt.Sprintf("token-%d", time.Now().UnixNano()),
		ExpiresAt: &future,
	}
	require.NoError(t, db.Create(&session).Error)

	return session.Token, user
}

func setupUserSettingsRouter(db *gorm.DB) chi.Router {
	logger := newTestLogger()
	router := chi.NewRouter()
	router.Use(libhttp.AuthMiddleware(db, logger))
	router.Mount("/accounts", routes.AccountsRouter(db, logger))
	return router
}

func TestUserSettings(t *testing.T) {
	db := tests.NewTestDB(t)
	router := setupUserSettingsRouter(db)
	token, _ := createTestUserSession(t, db)

	// Seed defaults
	boolSetting := entities.SettingDefault{
		Name:           "test_bool",
		DisplayName:    "Test Bool",
		Value:          "false",
		ValueType:      dto.Boolean,
		IsUserEditable: true,
		Group:          "General",
		Description:    "Test boolean setting",
	}
	strSetting := entities.SettingDefault{
		Name:           "test_str",
		DisplayName:    "Test String",
		Value:          "default_val",
		ValueType:      dto.String,
		IsUserEditable: true,
		Group:          "General",
		Description:    "Test string setting",
	}
	require.NoError(t, db.Create(&boolSetting).Error)
	require.NoError(t, db.Create(&strSetting).Error)

	t.Run("GET /accounts/me/settings", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/accounts/me/settings", nil)
		req.AddCookie(&http.Cookie{Name: libhttp.AuthTokenCookie, Value: token})
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusOK, rec.Code)

		var settings []dto.Setting
		require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &settings))
		assert.Len(t, settings, 2)
		for _, s := range settings {
			assert.False(t, s.IsOverridden)
		}
	})

	t.Run("PATCH /accounts/me/settings - Boolean normalization", func(t *testing.T) {
		// Pass uppercase "TRUE"
		patchBody, _ := json.Marshal(map[string]string{"value": "TRUE"})
		req := httptest.NewRequest("PATCH", "/accounts/me/settings?name=test_bool", bytes.NewReader(patchBody))
		req.AddCookie(&http.Cookie{Name: libhttp.AuthTokenCookie, Value: token})
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusOK, rec.Code)

		var setting dto.Setting
		require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &setting))
		assert.Equal(t, "true", setting.Value)
		assert.True(t, setting.IsOverridden)

		// Verify DB override value is normalized to lower case "true"
		var override entities.SettingOverride
		require.NoError(t, db.Where("name = ?", "test_bool").First(&override).Error)
		assert.Equal(t, "true", override.Value)
	})

	t.Run("DELETE /accounts/me/settings - Reset override", func(t *testing.T) {
		req := httptest.NewRequest("DELETE", "/accounts/me/settings?name=test_bool", nil)
		req.AddCookie(&http.Cookie{Name: libhttp.AuthTokenCookie, Value: token})
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusOK, rec.Code)

		var setting dto.Setting
		require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &setting))
		assert.Equal(t, "false", setting.Value)
		assert.False(t, setting.IsOverridden)

		// Verify DB override was deleted
		var count int64
		db.Model(&entities.SettingOverride{}).Where("name = ?", "test_bool").Count(&count)
		assert.Equal(t, int64(0), count)
	})
}

func TestUserProfileRequiresAuth(t *testing.T) {
	db := tests.NewTestDB(t)
	logger := newTestLogger()

	user := entities.User{
		Uid:   "profile-test-user",
		Email: "profile@test.com",
		Name:  "Test User",
		Role:  dto.UserRoleUser,
	}
	require.NoError(t, db.Create(&user).Error)

	router := chi.NewRouter()
	router.Use(libhttp.AuthMiddleware(db, logger))
	router.Mount("/accounts", routes.AccountsRouter(db, logger))

	ts := httptest.NewServer(router)
	defer ts.Close()

	req, err := http.NewRequest("GET", ts.URL+"/accounts/"+user.Uid, nil)
	require.NoError(t, err)

	resp, err := ts.Client().Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode,
		"unauthenticated request to /accounts/{uid} must return 401")
}
