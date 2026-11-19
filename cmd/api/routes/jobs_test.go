package routes_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"

	"viz/api/routes"
	"viz/internal/auth"
	"viz/internal/dto"
	"viz/internal/entities"
	"viz/internal/jobs"
	"viz/internal/tests"
)

// newJobsTestRouter builds the jobs router backed by the test DB the same way
// production mounts it in api.go: jobs are an admin-only route under their own
// base route, regardless of cookie or API-key auth.
func newJobsTestRouter(t *testing.T, db *gorm.DB) http.Handler {
	t.Helper()

	logger := newTestLogger()
	catalog, err := jobs.NewCatalog()
	require.NoError(t, err)

	service, err := jobs.NewService(db, catalog, logger, nil)
	require.NoError(t, err)

	router := chi.NewRouter()
	router.Mount("/jobs", routes.JobsRouter(db, service, logger))
	return router
}

func createJobsTestUser(t *testing.T, db *gorm.DB, uid string, role dto.UserRole) entities.User {
	t.Helper()

	user := entities.User{
		Uid:   uid,
		Email: uid + "@example.com",
		Role:  role,
	}
	require.NoError(t, db.Create(&user).Error)
	return user
}

func createSessionToken(t *testing.T, db *gorm.DB, user entities.User, token string) string {
	t.Helper()

	future := time.Now().Add(1 * time.Hour)
	session := entities.Session{
		Uid:       "session-" + token,
		Token:     token,
		UserUid:   user.Uid,
		ExpiresAt: &future,
	}
	require.NoError(t, db.Create(&session).Error)
	return token
}

func createJobsTestAPIKey(t *testing.T, db *gorm.DB, user entities.User, scopes []string) string {
	t.Helper()

	fullKey, uidStr, hashedSecret, err := auth.GenerateAPIKey()
	require.NoError(t, err)

	key := entities.APIKey{
		Uid:       uidStr,
		KeyHashed: hashedSecret,
		UserID:    &user.Uid,
		Scopes:    scopes,
	}
	require.NoError(t, db.Create(&key).Error)
	return fullKey
}

func requestWithSession(t *testing.T, method, url, token string) *http.Request {
	t.Helper()

	req, err := http.NewRequest(method, url, nil)
	require.NoError(t, err)
	req.AddCookie(&http.Cookie{
		Name:  "viz-auth_token",
		Value: token,
	})
	return req
}

func requestWithAPIKey(t *testing.T, method, url, key string) *http.Request {
	t.Helper()

	req, err := http.NewRequest(method, url, nil)
	require.NoError(t, err)
	req.Header.Set("Authorization", "Bearer "+key)
	return req
}

func TestJobsRouterRejectsUnauthenticated(t *testing.T) {
	db := tests.NewTestDB(t)
	ts := httptest.NewServer(newJobsTestRouter(t, db))
	defer ts.Close()

	req, err := http.NewRequest(http.MethodGet, ts.URL+"/jobs/types", nil)
	assert.NoError(t, err)

	resp, err := ts.Client().Do(req)
	assert.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
}

func TestJobsRouterRejectsNonAdminCookie(t *testing.T) {
	db := tests.NewTestDB(t)
	user := createJobsTestUser(t, db, "jobs-test-user", dto.UserRoleUser)
	token := createSessionToken(t, db, user, "jobs-user-token")

	ts := httptest.NewServer(newJobsTestRouter(t, db))
	defer ts.Close()

	resp, err := ts.Client().Do(requestWithSession(t, http.MethodGet, ts.URL+"/jobs/types", token))
	assert.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusForbidden, resp.StatusCode)
}

func TestJobsRouterRejectsNonAdminAPIKey(t *testing.T) {
	db := tests.NewTestDB(t)
	user := createJobsTestUser(t, db, "jobs-test-key-user", dto.UserRoleUser)
	key := createJobsTestAPIKey(t, db, user, []string{"images:read"})

	ts := httptest.NewServer(newJobsTestRouter(t, db))
	defer ts.Close()

	resp, err := ts.Client().Do(requestWithAPIKey(t, http.MethodGet, ts.URL+"/jobs/types", key))
	assert.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusForbidden, resp.StatusCode)
}

func TestJobsRouterAllowsAdminCookie(t *testing.T) {
	db := tests.NewTestDB(t)
	user := createJobsTestUser(t, db, "jobs-test-admin", dto.UserRoleAdmin)
	token := createSessionToken(t, db, user, "jobs-admin-token")

	ts := httptest.NewServer(newJobsTestRouter(t, db))
	defer ts.Close()

	resp, err := ts.Client().Do(requestWithSession(t, http.MethodGet, ts.URL+"/jobs/types", token))
	assert.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var body dto.JobTypeListResponse
	assert.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
}

func TestJobsRouterRejectsAdminAPIKeyWithoutScopes(t *testing.T) {
	db := tests.NewTestDB(t)
	user := createJobsTestUser(t, db, "jobs-test-admin-key", dto.UserRoleAdmin)
	key := createJobsTestAPIKey(t, db, user, []string{})

	ts := httptest.NewServer(newJobsTestRouter(t, db))
	defer ts.Close()

	resp, err := ts.Client().Do(requestWithAPIKey(t, http.MethodGet, ts.URL+"/jobs/types", key))
	assert.NoError(t, err)
	defer resp.Body.Close()

	// Scopes apply to individual API keys: an admin owner is not enough.
	assert.Equal(t, http.StatusForbidden, resp.StatusCode)
}

func TestJobsRouterRejectsAdminAPIKeyWithUnrelatedScopes(t *testing.T) {
	db := tests.NewTestDB(t)
	user := createJobsTestUser(t, db, "jobs-test-admin-unrelated", dto.UserRoleAdmin)
	key := createJobsTestAPIKey(t, db, user, []string{"images:read"})

	ts := httptest.NewServer(newJobsTestRouter(t, db))
	defer ts.Close()

	resp, err := ts.Client().Do(requestWithAPIKey(t, http.MethodGet, ts.URL+"/jobs/types", key))
	assert.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusForbidden, resp.StatusCode)
}

func TestJobsRouterRejectsAdminAPIKeyWithWrongScopedRoute(t *testing.T) {
	db := tests.NewTestDB(t)
	user := createJobsTestUser(t, db, "jobs-test-admin-wrongroute", dto.UserRoleAdmin)
	key := createJobsTestAPIKey(t, db, user, []string{"jobs:update"})

	ts := httptest.NewServer(newJobsTestRouter(t, db))
	defer ts.Close()

	resp, err := ts.Client().Do(requestWithAPIKey(t, http.MethodGet, ts.URL+"/jobs/types", key))
	assert.NoError(t, err)
	defer resp.Body.Close()

	// jobs:update does not satisfy the jobs:read requirement of GET /types.
	assert.Equal(t, http.StatusForbidden, resp.StatusCode)
}

func TestJobsRouterAllowsAdminAPIKeyWithReadingScope(t *testing.T) {
	db := tests.NewTestDB(t)
	user := createJobsTestUser(t, db, "jobs-test-admin-readkey", dto.UserRoleAdmin)
	key := createJobsTestAPIKey(t, db, user, []string{"jobs:read"})

	ts := httptest.NewServer(newJobsTestRouter(t, db))
	defer ts.Close()

	resp, err := ts.Client().Do(requestWithAPIKey(t, http.MethodGet, ts.URL+"/jobs/types", key))
	assert.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

func TestJobsRouterAllowsAdminAPIKeyWithCreateScope(t *testing.T) {
	db := tests.NewTestDB(t)
	user := createJobsTestUser(t, db, "jobs-test-admin-createkey", dto.UserRoleAdmin)
	key := createJobsTestAPIKey(t, db, user, []string{"jobs:create"})

	ts := httptest.NewServer(newJobsTestRouter(t, db))
	defer ts.Close()

	// Empty body passes the scope check and fails at JSON decoding instead.
	req, err := http.NewRequest(http.MethodPost, ts.URL+"/jobs/", nil)
	assert.NoError(t, err)
	req.Header.Set("Authorization", "Bearer "+key)
	resp, err := ts.Client().Do(req)
	assert.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
}

func TestJobsRouterRejectsAdminAPIKeyWithoutCreateScope(t *testing.T) {
	db := tests.NewTestDB(t)
	user := createJobsTestUser(t, db, "jobs-test-admin-nocreatekey", dto.UserRoleAdmin)
	key := createJobsTestAPIKey(t, db, user, []string{"jobs:read"})

	ts := httptest.NewServer(newJobsTestRouter(t, db))
	defer ts.Close()

	req, err := http.NewRequest(http.MethodPost, ts.URL+"/jobs/", nil)
	assert.NoError(t, err)
	req.Header.Set("Authorization", "Bearer "+key)
	resp, err := ts.Client().Do(req)
	assert.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusForbidden, resp.StatusCode)
}

func TestJobsRouterRejectsNonAdminAPIKeyWithJobScopes(t *testing.T) {
	db := tests.NewTestDB(t)
	user := createJobsTestUser(t, db, "jobs-test-plain-key", dto.UserRoleUser)
	key := createJobsTestAPIKey(t, db, user, []string{"jobs:read", "jobs:create", "jobs:update", "jobs:delete"})

	ts := httptest.NewServer(newJobsTestRouter(t, db))
	defer ts.Close()

	resp, err := ts.Client().Do(requestWithAPIKey(t, http.MethodGet, ts.URL+"/jobs/types", key))
	assert.NoError(t, err)
	defer resp.Body.Close()

	// Scopes do not make a route accessible to non-admin users.
	assert.Equal(t, http.StatusForbidden, resp.StatusCode)
}

func TestJobsRouterAllowsSuperadminAPIKeyWithScope(t *testing.T) {
	db := tests.NewTestDB(t)
	user := createJobsTestUser(t, db, "jobs-test-superadmin-key", dto.UserRoleSuperadmin)
	key := createJobsTestAPIKey(t, db, user, []string{"jobs:read"})

	ts := httptest.NewServer(newJobsTestRouter(t, db))
	defer ts.Close()

	resp, err := ts.Client().Do(requestWithAPIKey(t, http.MethodGet, ts.URL+"/jobs/types", key))
	assert.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

func TestJobsRouterAllowsNonAdminScopelessCookieToBeRefused(t *testing.T) {
	db := tests.NewTestDB(t)
	user := createJobsTestUser(t, db, "jobs-test-user-cookie", dto.UserRoleUser)
	token := createSessionToken(t, db, user, "jobs-user-cookie-token")

	ts := httptest.NewServer(newJobsTestRouter(t, db))
	defer ts.Close()

	resp, err := ts.Client().Do(requestWithSession(t, http.MethodPost, ts.URL+"/jobs/", token))
	assert.NoError(t, err)
	defer resp.Body.Close()

	// Cookie sessions bypass scopes entirely, but not the admin role gate.
	assert.Equal(t, http.StatusForbidden, resp.StatusCode)
}
