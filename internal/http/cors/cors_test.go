package cors

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	"viz/internal/config"
)

// newTestRouter creates a chi.Mux with CORS middleware configured exactly like api.go.
func newTestRouter(allowedHosts []string) *chi.Mux {
	router := chi.NewRouter()
	router.Use(cors.Handler(cors.Options{
		AllowOriginFunc: func(r *http.Request, origin string) bool {
			return MatchOrigin(origin, allowedHosts)
		},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "OPTIONS", "DELETE"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
	router.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})
	return router
}

func TestCORSIntegration_AllowedOrigin(t *testing.T) {
	allowedHosts := append(config.AppConfig.AllowedHosts, DefaultAllowedHosts...)
	router := newTestRouter(allowedHosts)

	tests := []struct {
		name           string
		origin         string
		expectAllowed  bool
		expectWildcard bool
	}{
		{
			name:           "default allowed localhost",
			origin:         "http://localhost",
			expectAllowed:  true,
			expectWildcard: false,
		},
		{
			name:           "default allowed 127.0.0.1",
			origin:         "http://127.0.0.1",
			expectAllowed:  true,
			expectWildcard: false,
		},
		{
			name:           "wildcard *.localhost matches viz.localhost",
			origin:         "https://viz.localhost",
			expectAllowed:  true,
			expectWildcard: false,
		},
		{
			name:           "wildcard *.localhost matches app.localhost",
			origin:         "https://app.localhost",
			expectAllowed:  true,
			expectWildcard: false,
		},
		{
			name:          "disallowed origin",
			origin:        "https://abode.com",
			expectAllowed: false,
		},
		{
			name:          "empty origin",
			origin:        "",
			expectAllowed: false,
		},
		{
			name:          "bare localhost not matched by wildcard",
			origin:        "https://localhost",
			expectAllowed: true, // exact match on "localhost" in DefaultAllowedHosts
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/health", nil)
			if tt.origin != "" {
				req.Header.Set("Origin", tt.origin)
			}

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			acao := rr.Header().Get("Access-Control-Allow-Origin")
			// Vary header is set on all CORS responses
			vary := rr.Header().Get("Vary")

			if tt.expectAllowed {
				if acao == "" {
					t.Errorf("expected Access-Control-Allow-Origin to be set, got empty")
				}
				if tt.origin != "" && acao != tt.origin {
					t.Errorf("expected Access-Control-Allow-Origin = %q, got %q", tt.origin, acao)
				}
			} else {
				if acao != "" {
					t.Errorf("expected Access-Control-Allow-Origin to be empty for disallowed origin, got %q", acao)
				}
			}

			_ = vary // Vary: Origin is set by the CORS library
		})
	}
}

func TestCORSIntegration_PreflightRejected(t *testing.T) {
	router := newTestRouter([]string{"localhost"})

	req := httptest.NewRequest(http.MethodOptions, "/api/health", nil)
	req.Header.Set("Origin", "https://abode.com")
	req.Header.Set("Access-Control-Request-Method", "GET")

	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	acao := rr.Header().Get("Access-Control-Allow-Origin")
	if acao != "" {
		t.Errorf("preflight from disallowed origin should not get Access-Control-Allow-Origin, got %q", acao)
	}

	acam := rr.Header().Get("Access-Control-Allow-Methods")
	if acam != "" {
		t.Errorf("preflight from disallowed origin should not get Access-Control-Allow-Methods, got %q", acam)
	}
}

func TestCORSIntegration_PreflightAllowed(t *testing.T) {
	router := newTestRouter([]string{"*.localhost"})

	req := httptest.NewRequest(http.MethodOptions, "/api/health", nil)
	req.Header.Set("Origin", "https://viz.localhost")
	req.Header.Set("Access-Control-Request-Method", "GET")

	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	acao := rr.Header().Get("Access-Control-Allow-Origin")
	if acao != "https://viz.localhost" {
		t.Errorf("preflight from allowed origin should get Access-Control-Allow-Origin = %q, got %q", "https://viz.localhost", acao)
	}

	acam := rr.Header().Get("Access-Control-Allow-Methods")
	if acam == "" {
		t.Error("preflight from allowed origin should get Access-Control-Allow-Methods")
	}
}

func TestCORSIntegration_CredentialsAllowed(t *testing.T) {
	router := newTestRouter([]string{"*.localhost"})

	req := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	req.Header.Set("Origin", "https://viz.localhost")

	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	acac := rr.Header().Get("Access-Control-Allow-Credentials")
	if acac != "true" {
		t.Errorf("expected Access-Control-Allow-Credentials = true, got %q", acac)
	}
}

func TestCORSIntegration_NoOriginHeader(t *testing.T) {
	router := newTestRouter([]string{"localhost"})

	// Request without Origin header (e.g., same-origin or non-browser client)
	req := httptest.NewRequest(http.MethodGet, "/api/health", nil)

	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	// Should still return 200 OK — CORS just doesn't add headers
	if rr.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rr.Code)
	}

	acao := rr.Header().Get("Access-Control-Allow-Origin")
	if acao != "" {
		t.Errorf("no Origin header should not get Access-Control-Allow-Origin, got %q", acao)
	}
}

func TestCORSIntegration_IPv4(t *testing.T) {
	router := newTestRouter([]string{"127.0.0.1", "10.0.0.24"})

	tests := []struct {
		name          string
		origin        string
		expectAllowed bool
	}{
		{
			name:          "allowed ipv4 exact",
			origin:        "http://127.0.0.1",
			expectAllowed: true,
		},
		{
			name:          "allowed ipv4 with port",
			origin:        "http://10.0.0.24:7787",
			expectAllowed: true,
		},
		{
			name:          "disallowed ipv4",
			origin:        "http://192.168.1.100",
			expectAllowed: false,
		},
		{
			name:          "disallowed ipv4 with port",
			origin:        "http://192.168.1.100:8080",
			expectAllowed: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/health", nil)
			req.Header.Set("Origin", tt.origin)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			acao := rr.Header().Get("Access-Control-Allow-Origin")

			if tt.expectAllowed {
				if acao == "" {
					t.Errorf("expected Access-Control-Allow-Origin to be set, got empty")
				}
				if acao != tt.origin {
					t.Errorf("expected Access-Control-Allow-Origin = %q, got %q", tt.origin, acao)
				}
			} else {
				if acao != "" {
					t.Errorf("expected Access-Control-Allow-Origin to be empty for disallowed origin, got %q", acao)
				}
			}
		})
	}
}

func TestCORSIntegration_IPv6(t *testing.T) {
	router := newTestRouter([]string{"::1"})

	tests := []struct {
		name          string
		origin        string
		expectAllowed bool
	}{
		{
			name:          "allowed ipv6 loopback",
			origin:        "http://[::1]",
			expectAllowed: true,
		},
		{
			name:          "allowed ipv6 with port",
			origin:        "http://[::1]:3000",
			expectAllowed: true,
		},
		{
			name:          "disallowed ipv6",
			origin:        "http://[2001:db8::1]",
			expectAllowed: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/health", nil)
			req.Header.Set("Origin", tt.origin)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			acao := rr.Header().Get("Access-Control-Allow-Origin")

			if tt.expectAllowed {
				if acao == "" {
					t.Errorf("expected Access-Control-Allow-Origin to be set, got empty")
				}
				if acao != tt.origin {
					t.Errorf("expected Access-Control-Allow-Origin = %q, got %q", tt.origin, acao)
				}
			} else {
				if acao != "" {
					t.Errorf("expected Access-Control-Allow-Origin to be empty for disallowed origin, got %q", acao)
				}
			}
		})
	}
}
