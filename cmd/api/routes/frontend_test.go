package routes_test

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"viz/api/routes"
)

func TestFrontendHandler(t *testing.T) {
	tempDir := t.TempDir()

	// Create index.html
	indexContent := "<html><head>%THEME_ATTR% %viz.css.theme_style%</head><body>App</body></html>"
	err := os.WriteFile(filepath.Join(tempDir, "index.html"), []byte(indexContent), 0644)
	require.NoError(t, err)

	// Create an immutable asset
	immutableDir := filepath.Join(tempDir, "_app", "immutable", "nodes")
	err = os.MkdirAll(immutableDir, 0755)
	require.NoError(t, err)

	assetContent := "console.log('asset');"
	err = os.WriteFile(filepath.Join(immutableDir, "0.abc123.js"), []byte(assetContent), 0644)
	require.NoError(t, err)

	logger := newTestLogger()
	handler := routes.NewFrontendHandler(tempDir, logger, nil)

	t.Run("serves index.html with no-cache headers for root", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Equal(t, "no-cache, no-store, must-revalidate", rec.Header().Get("Cache-Control"))
		assert.Contains(t, rec.Body.String(), "<body>App</body>")
	})

	t.Run("serves existing immutable asset with long-term cache headers", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/_app/immutable/nodes/0.abc123.js", nil)
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Equal(t, "public, max-age=31536000, immutable", rec.Header().Get("Cache-Control"))
		assert.Equal(t, assetContent, rec.Body.String())
	})

	t.Run("returns 404 Not Found for missing asset under _app (does not serve index.html)", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/_app/immutable/nodes/0.CWZ33kKn.js", nil)
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusNotFound, rec.Code)
		assert.NotContains(t, rec.Body.String(), "<body>App</body>")
	})

	t.Run("returns 404 Not Found for missing static file extension (does not serve index.html)", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/missing-bundle.js", nil)
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusNotFound, rec.Code)
		assert.NotContains(t, rec.Body.String(), "<body>App</body>")
	})

	t.Run("serves index.html for SPA route fallback", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/collections/123", nil)
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Equal(t, "no-cache, no-store, must-revalidate", rec.Header().Get("Cache-Control"))
		assert.Contains(t, rec.Body.String(), "<body>App</body>")
	})

	t.Run("serves index.html with valid theme from cookie", func(t *testing.T) {
		themesDir := filepath.Join(tempDir, "themes")
		err := os.MkdirAll(themesDir, 0755)
		require.NoError(t, err)

		themeCSS := "body { background: #123; }"
		err = os.WriteFile(filepath.Join(themesDir, "gitlab-adjusted.css"), []byte(themeCSS), 0644)
		require.NoError(t, err)

		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.AddCookie(&http.Cookie{
			Name:  "viz-theme",
			Value: "gitlab-adjusted",
		})
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Contains(t, rec.Body.String(), `<style id="generated-theme">`+themeCSS+`</style>`)
	})

	t.Run("does nothing when theme file does not exist", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.AddCookie(&http.Cookie{
			Name:  "viz-theme",
			Value: "nonexistent-theme",
		})
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)
		assert.NotContains(t, rec.Body.String(), `<style id="generated-theme">`)
	})

	t.Run("rejects path traversal in theme cookie and prevents reading external files", func(t *testing.T) {
		outsideDir := t.TempDir()
		externalCSS := "/* sensitive outside css */"
		err := os.WriteFile(filepath.Join(outsideDir, "secret.css"), []byte(externalCSS), 0644)
		require.NoError(t, err)

		traversalPayloads := []string{
			"../../../../../../etc/hostname",
			"../secret",
			"....//secret",
			"/etc/passwd",
			"secret/nested",
			"\\windows\\system32",
			"..",
			".",
		}

		for _, payload := range traversalPayloads {
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			req.AddCookie(&http.Cookie{
				Name:  "viz-theme",
				Value: payload,
			})
			rec := httptest.NewRecorder()

			handler.ServeHTTP(rec, req)

			assert.Equal(t, http.StatusOK, rec.Code)
			assert.NotContains(t, rec.Body.String(), externalCSS)
			assert.NotContains(t, rec.Body.String(), `<style id="generated-theme">`)
		}
	})
}
