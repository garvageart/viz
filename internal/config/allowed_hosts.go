package config

import (
	"net"
	"strings"
)

// MatchOrigin checks whether the given origin matches any entry in the allowed hosts list.
// The origin may include a scheme (e.g. "https://viz.localhost") and/or port — both are
// stripped before matching against the host list.
// Supported patterns:
//   - Exact match: "localhost" matches "localhost"
//   - Wildcard prefix: "*.example.com" matches "sub.example.com" but not "example.com"
//   - Wildcard sole: "*" matches everything
func MatchOrigin(origin string, allowedHosts []string) bool {
	host := extractHost(origin)

	for _, pattern := range allowedHosts {
		if matchHost(host, pattern) {
			return true
		}
	}
	return false
}

// extractHost normalizes an origin URI into a bare hostname.
// "https://viz.localhost:7787" -> "viz.localhost"
// "http://[::1]:3000" -> "::1"
func extractHost(uri string) string {
	h := uri

	// Strip scheme
	if idx := strings.Index(h, "://"); idx != -1 {
		h = h[idx+3:]
	}

	// net.SplitHostPort handles IPv6 bracket notation correctly
	if host, _, err := net.SplitHostPort(h); err == nil {
		return host
	}

	// No port — strip brackets from IPv6: "[::1]" -> "::1"
	if strings.HasPrefix(h, "[") && strings.HasSuffix(h, "]") {
		h = h[1 : len(h)-1]
	}

	return h
}

func matchHost(host, pattern string) bool {
	if pattern == "*" {
		return true
	}

	if !strings.Contains(pattern, "*") {
		return host == pattern
	}

	// Wildcard prefix: "*.example.com"
	if strings.HasPrefix(pattern, "*.") {
		suffix := pattern[1:] // ".example.com"
		return strings.HasSuffix(host, suffix)
	}

	// Wildcard elsewhere: exact match
	return host == pattern
}
