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
	"viz/internal/dto"
	"viz/internal/entities"
	"viz/internal/tests"
)

func TestLoginUniformError(t *testing.T) {
	db := tests.NewTestDB(t)
	logger := newTestLogger()

	user := entities.User{
		Uid:   "login-test-user",
		Email: "real@example.com",
		Role:  dto.UserRoleUser,
	}
	require.NoError(t, db.Create(&user).Error)

	router := chi.NewRouter()
	router.Mount("/auth", routes.AuthRouter(db, logger))

	ts := httptest.NewServer(router)
	defer ts.Close()

	// Non-existent email
	bodyMissing, _ := json.Marshal(map[string]string{
		"email":    "nonexistent@example.com",
		"password": "wrongpassword",
	})
	respMissing, err := http.Post(ts.URL+"/auth/login", "application/json", bytes.NewReader(bodyMissing))
	require.NoError(t, err)
	defer respMissing.Body.Close()

	// Real email, wrong password
	bodyWrong, _ := json.Marshal(map[string]string{
		"email":    "real@example.com",
		"password": "wrongpassword",
	})
	respWrong, err := http.Post(ts.URL+"/auth/login", "application/json", bytes.NewReader(bodyWrong))
	require.NoError(t, err)
	defer respWrong.Body.Close()

	assert.Equal(t, http.StatusUnauthorized, respMissing.StatusCode,
		"non-existent user must return 401")
	assert.Equal(t, http.StatusUnauthorized, respWrong.StatusCode,
		"wrong password must return 401")

	var errMissing, errWrong dto.ErrorResponse
	require.NoError(t, json.NewDecoder(respMissing.Body).Decode(&errMissing))
	require.NoError(t, json.NewDecoder(respWrong.Body).Decode(&errWrong))
	assert.Equal(t, errMissing.Error, errWrong.Error,
		"error messages must be identical to prevent user enumeration")
}
