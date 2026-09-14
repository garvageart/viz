package http

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

func newTestWSServer(t *testing.T, allowedHosts ...string) (*WSBroker, string, string) {
	t.Helper()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	broker := NewWSBroker(logger, allowedHosts...)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		broker.ServeWS(w, r)
	}))

	t.Cleanup(server.Close)

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")
	return broker, wsURL, server.URL
}

func TestWebSocket_UpgradeOriginMatrix(t *testing.T) {
	// Standard server with default allowed hosts (localhost, 127.0.0.1, *.localhost) plus a custom domain
	_, wsURL, _ := newTestWSServer(t, "myphotos.customdomain.org")

	tests := []struct {
		name       string
		origin     string
		wantStatus int
	}{
		{
			name:       "empty origin (non-browser client)",
			origin:     "",
			wantStatus: http.StatusSwitchingProtocols,
		},
		{
			name:       "localhost origin with custom preview port",
			origin:     "http://localhost:7778",
			wantStatus: http.StatusSwitchingProtocols,
		},
		{
			name:       "127.0.0.1 origin with dev port",
			origin:     "http://127.0.0.1:5173",
			wantStatus: http.StatusSwitchingProtocols,
		},
		{
			name:       "subdomain matching *.localhost",
			origin:     "http://app.localhost:3000",
			wantStatus: http.StatusSwitchingProtocols,
		},
		{
			name:       "configured custom allowed host",
			origin:     "https://myphotos.customdomain.org",
			wantStatus: http.StatusSwitchingProtocols,
		},
		{
			name:       "unauthorized external origin rejected with 403",
			origin:     "https://unauthorized-external-site.com",
			wantStatus: http.StatusForbidden,
		},
	}

	dialer := websocket.Dialer{
		HandshakeTimeout: 3 * time.Second,
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			headers := make(http.Header)
			if tt.origin != "" {
				headers.Set("Origin", tt.origin)
			}

			conn, resp, err := dialer.Dial(wsURL, headers)
			if tt.wantStatus == http.StatusSwitchingProtocols {
				if err != nil {
					t.Fatalf("expected successful handshake (101), got error: %v", err)
				}
				if resp == nil || resp.StatusCode != http.StatusSwitchingProtocols {
					t.Fatalf("expected status 101, got %v", resp)
				}
				conn.Close()
			} else {
				if err == nil {
					conn.Close()
					t.Fatalf("expected handshake rejection (%d), but connection succeeded", tt.wantStatus)
				}
				if resp == nil || resp.StatusCode != tt.wantStatus {
					t.Fatalf("expected status %d, got %v (err: %v)", tt.wantStatus, resp, err)
				}
			}
		})
	}
}

func TestWebSocket_EventBroadcastLifecycle(t *testing.T) {
	broker, wsURL, serverURL := newTestWSServer(t)

	dialer := websocket.Dialer{
		HandshakeTimeout: 3 * time.Second,
	}
	headers := make(http.Header)
	headers.Set("Origin", serverURL)

	conn, _, err := dialer.Dial(wsURL, headers)
	if err != nil {
		t.Fatalf("failed to dial websocket: %v", err)
	}
	defer conn.Close()

	if err := conn.SetReadDeadline(time.Now().Add(5 * time.Second)); err != nil {
		t.Fatalf("failed to set read deadline: %v", err)
	}

	// 1. Verify initial 'connected' message
	var msg1 WSMessage
	if err := conn.ReadJSON(&msg1); err != nil {
		t.Fatalf("failed to read initial 'connected' message: %v", err)
	}
	if msg1.Event != "connected" {
		t.Fatalf("expected event 'connected', got %q", msg1.Event)
	}

	// 2. Verify initial 'server-online' message
	var msg2 WSMessage
	if err := conn.ReadJSON(&msg2); err != nil {
		t.Fatalf("failed to read initial 'server-online' message: %v", err)
	}
	if msg2.Event != "server-online" {
		t.Fatalf("expected event 'server-online', got %q", msg2.Event)
	}

	// 3. Broadcast an application event (e.g., collection-deleted) and verify client receives it
	expectedData := map[string]any{"uid": "coll_test_123"}
	if err := broker.Broadcast("collection-deleted", expectedData); err != nil {
		t.Fatalf("failed to broadcast event: %v", err)
	}

	var broadcastMsg WSMessage
	if err := conn.ReadJSON(&broadcastMsg); err != nil {
		t.Fatalf("failed to receive broadcast message: %v", err)
	}
	if broadcastMsg.Event != "collection-deleted" {
		t.Fatalf("expected event 'collection-deleted', got %q", broadcastMsg.Event)
	}

	dataBytes, err := json.Marshal(broadcastMsg.Data)
	if err != nil {
		t.Fatalf("failed to marshal received data: %v", err)
	}
	var receivedData map[string]any
	if err := json.Unmarshal(dataBytes, &receivedData); err != nil {
		t.Fatalf("failed to unmarshal received data: %v", err)
	}
	if receivedData["uid"] != "coll_test_123" {
		t.Fatalf("expected uid 'coll_test_123', got %v", receivedData["uid"])
	}

	// 4. Verify client count tracking and clean unregister on close
	if count := broker.GetClientCount(); count != 1 {
		t.Fatalf("expected 1 active client, got %d", count)
	}

	conn.Close()

	// Wait briefly for unregister channel processing
	time.Sleep(100 * time.Millisecond)
	if count := broker.GetClientCount(); count != 0 {
		t.Fatalf("expected 0 active clients after disconnect, got %d", count)
	}
}
