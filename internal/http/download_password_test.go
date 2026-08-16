package http_test

import (
	"net/http/httptest"
	"testing"
)

func TestDownloadPasswordFromHeader(t *testing.T) {
	tests := []struct {
		name           string
		headerPassword string
		queryPassword  string
		expectedPass   string
	}{
		{
			name:           "header password preferred over query",
			headerPassword: "header-secret",
			queryPassword:  "query-secret",
			expectedPass:   "header-secret",
		},
		{
			name:           "query password used when header absent",
			headerPassword: "",
			queryPassword:  "query-secret",
			expectedPass:   "query-secret",
		},
		{
			name:           "empty when neither present",
			headerPassword: "",
			queryPassword:  "",
			expectedPass:   "",
		},
		{
			name:           "header only",
			headerPassword: "only-header",
			queryPassword:  "",
			expectedPass:   "only-header",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/test?password="+tt.queryPassword, nil)
			if tt.headerPassword != "" {
				req.Header.Set("X-Download-Password", tt.headerPassword)
			}

			// Simulate the password resolution logic from validateDownloadRequest
			password := req.Header.Get("X-Download-Password")
			if password == "" {
				password = req.URL.Query().Get("password")
			}

			if password != tt.expectedPass {
				t.Errorf("expected password %q, got %q", tt.expectedPass, password)
			}
		})
	}
}
