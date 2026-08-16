package http_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	libhttp "viz/internal/http"
)

func TestCreateAuthTokenCookieDefaultSameSite(t *testing.T) {
	// Verify that the auth token cookie defaults to Strict SameSite
	cookie := libhttp.CreateAuthTokenCookie(
		time.Now().Add(time.Hour),
		"test-token-value",
	)

	if cookie.SameSite != http.SameSiteStrictMode {
		t.Errorf("expected SameSite=Strict default, got %v", cookie.SameSite)
	}

	if !cookie.HttpOnly {
		t.Error("expected HttpOnly=true")
	}

	if cookie.Path != "/" {
		t.Errorf("expected Path=/, got %v", cookie.Path)
	}
}

func TestClearCookieDefaultSameSite(t *testing.T) {
	// Use httptest.ResponseRecorder to capture the Set-Cookie header
	rec := httptest.NewRecorder()

	libhttp.ClearCookie("test-cookie", rec)

	headers := rec.Header().Values("Set-Cookie")
	if len(headers) == 0 {
		t.Fatal("expected Set-Cookie header to be set")
	}

	setCookie := headers[0]
	if !strings.Contains(setCookie, "SameSite=Strict") {
		t.Errorf("expected SameSite=Strict in Set-Cookie header, got: %s", setCookie)
	}
}
