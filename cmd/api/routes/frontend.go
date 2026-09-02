package routes

import (
	"bytes"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"gorm.io/gorm"
	"viz/internal/frontend"
)

type FrontendHandler struct {
	BuildPath string
	Logger    *slog.Logger
	DB        *gorm.DB
	// Cache index.html content
	indexContent []byte
	indexMutex   sync.RWMutex
}

func NewFrontendHandler(buildPath string, logger *slog.Logger, db *gorm.DB) *FrontendHandler {
	return &FrontendHandler{
		BuildPath: buildPath,
		Logger:    logger,
		DB:        db,
	}
}

func (h *FrontendHandler) getIndexContent() ([]byte, error) {
	h.indexMutex.RLock()
	if len(h.indexContent) > 0 {
		content := h.indexContent
		h.indexMutex.RUnlock()
		return content, nil
	}
	h.indexMutex.RUnlock()

	h.indexMutex.Lock()
	defer h.indexMutex.Unlock()

	// Double check
	if len(h.indexContent) > 0 {
		return h.indexContent, nil
	}

	content, err := os.ReadFile(filepath.Join(h.BuildPath, frontend.IndexHtml))
	if err != nil {
		return nil, err
	}

	h.indexContent = content
	return content, nil
}

func (h *FrontendHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/")
	// Default to index.html for root
	if path == "" {
		path = frontend.IndexHtml
	}

	// Clean path to prevent directory traversal
	cleanPath := filepath.Clean(path)
	fullPath := filepath.Join(h.BuildPath, cleanPath)

	// Check if file exists and is not a directory
	info, err := os.Stat(fullPath)
	isStaticFile := err == nil && !info.IsDir()

	// If it's a static file (and not index.html), serve it directly
	if isStaticFile && cleanPath != frontend.IndexHtml && cleanPath != "." {
		if strings.HasPrefix(r.URL.Path, "/_app/immutable/") {
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		} else if strings.HasPrefix(r.URL.Path, "/_app/") {
			w.Header().Set("Cache-Control", "public, max-age=3600")
		}
		http.ServeFile(w, r, fullPath)
		return
	}

	// Any path with a file extension or under /_app/ that does not exist on disk is a missing asset.
	// Returning 404 Not Found prevents the browser from receiving HTML for missing JS/CSS chunks,
	// allowing Vite and SvelteKit to cleanly trigger chunk preload error recovery (auto-reload).
	hasExtension := filepath.Ext(cleanPath) != ""
	if cleanPath != frontend.IndexHtml && cleanPath != "." && (strings.HasPrefix(r.URL.Path, "/_app/") || hasExtension) {
		h.Logger.Debug("asset not found", slog.String("path", fullPath))
		http.Error(w, "Asset Not Found", http.StatusNotFound)
		return
	}

	// Otherwise, serve index.html with theme injection (SPA catch-all)
	h.serveIndex(w, r)
}

func (h *FrontendHandler) getThemeCSS(themeName string) string {
	if strings.ContainsAny(themeName, "/\\") || themeName == ".." || themeName == "." {
		return ""
	}

	themesDir := filepath.Clean(filepath.Join(h.BuildPath, "themes"))
	cssPath := filepath.Clean(filepath.Join(themesDir, themeName+".css"))

	rel, err := filepath.Rel(themesDir, cssPath)
	if err != nil || strings.HasPrefix(rel, "..") || rel == "." {
		return ""
	}

	cssContent, err := os.ReadFile(cssPath)
	if err != nil {
		return ""
	}

	return fmt.Sprintf("<style id=\"generated-theme\">%s</style>", string(cssContent))
}

func (h *FrontendHandler) serveIndex(w http.ResponseWriter, r *http.Request) {
	// Don't serve index.html for missing API routes
	if strings.HasPrefix(r.URL.Path, "/api") {
		http.Error(w, "Not Found", http.StatusNotFound)
		return
	}

	indexData, err := h.getIndexContent()
	if err != nil {
		if os.IsNotExist(err) {
			h.Logger.Debug("index.html not found (frontend build missing)", slog.String("path", h.BuildPath))
			http.Error(w, "Frontend build not found. If you are in development, ensure the Vite dev server is running and you are accessing the correct port (e.g. 7777).", http.StatusNotFound)
			return
		}

		h.Logger.Error("failed to read index.html", slog.Any("error", err))
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Theme logic
	themeName := frontend.DefaultTheme
	for _, cookieName := range []string{"viz-theme", "viz_theme", "theme"} {
		if c, err := r.Cookie(cookieName); err == nil && c.Value != "" {
			themeName = c.Value
			break
		}
	}

	criticalCss := h.getThemeCSS(themeName)
	themeAttr := "data-theme=\"light\""

	// Replace placeholders
	// Note: Doing string replacement on every request might be slow for high load,
	// but fine for this scale. For optimization, use bytes.Replace.
	responseHtml := bytes.Replace(indexData, []byte(frontend.ThemeStylePlaceholder), []byte(criticalCss), 1)
	responseHtml = bytes.Replace(responseHtml, []byte(frontend.ThemeAttrPlaceholder), []byte(themeAttr), 1)

	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "0")
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write(responseHtml)
}
