package config

import (
	"testing"
)

func TestMatchOrigin_ExactMatch(t *testing.T) {
	hosts := []string{"localhost", "127.0.0.1", "example.com"}

	tests := []struct {
		origin string
		want   bool
	}{
		{"localhost", true},
		{"127.0.0.1", true},
		{"example.com", true},
		{"capitalist.com", false},
		{"", false},
		{"localhost.capitalist.com", false},
		// With scheme — should strip and still match
		{"http://localhost", true},
		{"https://127.0.0.1", true},
		{"https://example.com", true},
		{"https://capitalist.com", false},
	}

	for _, tt := range tests {
		t.Run(tt.origin, func(t *testing.T) {
			got := MatchOrigin(tt.origin, hosts)
			if got != tt.want {
				t.Errorf("MatchOrigin(%q, %v) = %v, want %v", tt.origin, hosts, got, tt.want)
			}
		})
	}
}

func TestMatchOrigin_WildcardPrefix(t *testing.T) {
	hosts := []string{"*.localhost", "*.example.com"}

	tests := []struct {
		origin string
		want   bool
	}{
		{"viz.localhost", true},
		{"app.localhost", true},
		{"sub.example.com", true},
		{"a.b.example.com", true},
		// With scheme
		{"https://viz.localhost", true},
		{"http://sub.example.com", true},
		// Wildcard prefix should NOT match the bare domain
		{"localhost", false},
		{"example.com", false},
		// Should not match unrelated domains
		{"capitalist.com", false},
		{"viz.capitalist.com", false},
		{"https://capitalist.com", false},
	}

	for _, tt := range tests {
		t.Run(tt.origin, func(t *testing.T) {
			got := MatchOrigin(tt.origin, hosts)
			if got != tt.want {
				t.Errorf("MatchOrigin(%q, %v) = %v, want %v", tt.origin, hosts, got, tt.want)
			}
		})
	}
}

func TestMatchOrigin_WildcardAll(t *testing.T) {
	hosts := []string{"*"}

	tests := []struct {
		origin string
		want   bool
	}{
		{"anything.com", true},
		{"localhost", true},
		{"192.168.1.1", true},
		{"", true},
		{"https://anything.com", true},
	}

	for _, tt := range tests {
		t.Run(tt.origin, func(t *testing.T) {
			got := MatchOrigin(tt.origin, hosts)
			if got != tt.want {
				t.Errorf("MatchOrigin(%q, %v) = %v, want %v", tt.origin, hosts, got, tt.want)
			}
		})
	}
}

func TestMatchOrigin_EmptyList(t *testing.T) {
	got := MatchOrigin("localhost", []string{})
	if got {
		t.Error("MatchOrigin with empty list should return false")
	}
}

func TestMatchOrigin_NilList(t *testing.T) {
	got := MatchOrigin("localhost", nil)
	if got {
		t.Error("MatchOrigin with nil list should return false")
	}
}

func TestMatchOrigin_MixedPatterns(t *testing.T) {
	hosts := []string{"capitalist.com", "*.localhost", "127.0.0.1"}

	tests := []struct {
		name   string
		origin string
		want   bool
	}{
		{"exact match", "capitalist.com", true},
		{"wildcard match", "viz.localhost", true},
		{"exact match second", "127.0.0.1", true},
		{"no match", "attacker.com", false},
		{"bare domain not matched by wildcard", "localhost", false},
		{"scheme stripped exact match", "http://capitalist.com", true},
		{"scheme stripped wildcard match", "https://viz.localhost", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := MatchOrigin(tt.origin, hosts)
			if got != tt.want {
				t.Errorf("MatchOrigin(%q, %v) = %v, want %v", tt.origin, hosts, got, tt.want)
			}
		})
	}
}

func TestMatchOrigin_PortStripping(t *testing.T) {
	hosts := []string{"localhost", "*.example.com"}

	tests := []struct {
		name   string
		origin string
		want   bool
	}{
		{"host with port", "http://localhost:8080", true},
		{"wildcard with port", "https://viz.example.com:443", true},
		{"exact with port mismatch", "http://capitalist.com:8080", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := MatchOrigin(tt.origin, hosts)
			if got != tt.want {
				t.Errorf("MatchOrigin(%q, %v) = %v, want %v", tt.origin, hosts, got, tt.want)
			}
		})
	}
}

func TestMatchOrigin_IPv4(t *testing.T) {
	hosts := []string{"127.0.0.1", "192.168.1.0/24", "10.0.0.24"}

	tests := []struct {
		name   string
		origin string
		want   bool
	}{
		{"exact ipv4", "127.0.0.1", true},
		{"exact ipv4 with scheme", "http://127.0.0.1", true},
		{"exact ipv4 with port", "http://127.0.0.1:3000", true},
		{"exact ipv4 with scheme and port", "https://10.0.0.24:7787", true},
		{"different ipv4", "192.168.1.100", false},
		{"different ipv4 with scheme", "http://192.168.1.100", false},
		{"different ipv4 with port", "http://192.168.1.100:8080", false},
		{"loopback variants", "http://0.0.0.0", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := MatchOrigin(tt.origin, hosts)
			if got != tt.want {
				t.Errorf("MatchOrigin(%q, %v) = %v, want %v", tt.origin, hosts, got, tt.want)
			}
		})
	}
}

func TestMatchOrigin_IPv6(t *testing.T) {
	hosts := []string{"::1", "localhost"}

	tests := []struct {
		name   string
		origin string
		want   bool
	}{
		{"ipv6 loopback", "::1", true},
		{"ipv6 loopback with scheme", "http://[::1]", true},
		{"ipv6 loopback with port", "http://[::1]:8080", true},
		{"ipv6 full", "http://[2001:db8::1]", false},
		{"ipv6 link-local", "http://[fe80::1]:3000", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := MatchOrigin(tt.origin, hosts)
			if got != tt.want {
				t.Errorf("MatchOrigin(%q, %v) = %v, want %v", tt.origin, hosts, got, tt.want)
			}
		})
	}
}
