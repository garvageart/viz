package routes_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"viz/api/routes"
	"viz/internal/tests"
)

func TestSetupResponseOmitsSessionToken(t *testing.T) {
	db := tests.NewTestDB(t)
	logger := newTestLogger()

	router := chi.NewRouter()
	router.Mount("/setup", routes.SetupRouter(db, logger))

	ts := httptest.NewServer(router)
	defer ts.Close()

	body, _ := json.Marshal(map[string]any{
		"name":     "Admin",
		"email":    "admin@test.com",
		"password": "securePassword123!",
	})
	resp, err := http.Post(ts.URL+"/setup/superadmin", "application/json", bytes.NewReader(body))
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusCreated, resp.StatusCode)

	var response map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&response))

	_, hasToken := response["sessionToken"]
	assert.False(t, hasToken, "setup response must not contain sessionToken")
	assert.Contains(t, response, "user", "setup response must contain user")
}

func TestSetupRejectsSecondSuperadmin(t *testing.T) {
	db := tests.NewTestDB(t)
	logger := newTestLogger()

	router := chi.NewRouter()
	router.Mount("/setup", routes.SetupRouter(db, logger))

	ts := httptest.NewServer(router)
	defer ts.Close()

	body, _ := json.Marshal(map[string]any{
		"name":     "Admin",
		"email":    "admin@test.com",
		"password": "securePassword123!",
	})

	resp1, err := http.Post(ts.URL+"/setup/superadmin", "application/json", bytes.NewReader(body))
	require.NoError(t, err)
	resp1.Body.Close()

	body2, _ := json.Marshal(map[string]any{
		"name":     "Admin2",
		"email":    "admin2@test.com",
		"password": "securePassword123!",
	})
	resp2, err := http.Post(ts.URL+"/setup/superadmin", "application/json", bytes.NewReader(body2))
	require.NoError(t, err)
	defer resp2.Body.Close()

	assert.Equal(t, http.StatusConflict, resp2.StatusCode,
		"second superadmin setup must be rejected")
}
