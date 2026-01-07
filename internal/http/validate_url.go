package http

import (
	"errors"
	"net"
	"net/url"
	"strings"
)

var (
	ErrInvalidScheme = errors.New("invalid URL scheme")
	ErrPrivateIP     = errors.New("destination is a private or local address")
	ErrInvalidHost   = errors.New("invalid host")
)

// ValidateURL checks if the URL is safe to download from.
// It rejects non-HTTP/HTTPS schemes and private/local IP addresses.
func ValidateURL(rawURL string) error {
	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		return err
	}

	scheme := strings.ToLower(parsedURL.Scheme)
	if scheme != "http" && scheme != "https" {
		return ErrInvalidScheme
	}

	hostname := parsedURL.Hostname()
	if hostname == "" {
		return ErrInvalidHost
	}

	ips, err := net.LookupIP(hostname)
	if err != nil {
		return err
	}

	for _, ip := range ips {
		if isPrivateIP(ip) {
			return ErrPrivateIP
		}
	}

	return nil
}

func isPrivateIP(ip net.IP) bool {
	if ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() {
		return true
	}

	// IPv4 private ranges
	if ip4 := ip.To4(); ip4 != nil {
		switch {
		case ip4[0] == 10:
			return true
		case ip4[0] == 172 && ip4[1] >= 16 && ip4[1] <= 31:
			return true
		case ip4[0] == 192 && ip4[1] == 168:
			return true
		}
		return false
	}

	// IPv6 private ranges (Unique Local Address)
	// fc00::/7
	if len(ip) == 16 {
		return ip[0]&0xfe == 0xfc
	}

	return false
}
