package http

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gorilla/websocket"
)

// WSClient represents a connected WebSocket client
type WSClient struct {
	ID     string
	Conn   *websocket.Conn
	Send   chan []byte
	Broker *WSBroker
	mu     sync.Mutex
}

// WSBroker manages WebSocket connections and message broadcasting
type WSBroker struct {
	clients    map[string]*WSClient
	register   chan *WSClient
	unregister chan *WSClient
	broadcast  chan *WSMessage
	mu         sync.RWMutex

	lastID     uint64
	history    []WSRecord
	historyMu  sync.RWMutex
	historyMax int

	logger *slog.Logger

	upgrader websocket.Upgrader
}

// WSMessage represents a message to be sent via WebSocket
type WSMessage struct {
	Event    string      `json:"event"`
	Data     interface{} `json:"data"`
	ClientID string      `json:"-"`  // If empty, broadcast to all
	ID       uint64      `json:"id"` // Monotonic ID for message tracking
}

// WSRecord is a stored history record
type WSRecord struct {
	ID        uint64      `json:"id"`
	Timestamp time.Time   `json:"timestamp"`
	Event     string      `json:"event"`
	Data      interface{} `json:"data"`
}

// NewWSBroker creates and starts a new WebSocket broker
func NewWSBroker(logger *slog.Logger) *WSBroker {
	broker := &WSBroker{
		clients:    make(map[string]*WSClient),
		register:   make(chan *WSClient),
		unregister: make(chan *WSClient),
		broadcast:  make(chan *WSMessage, 100),
		history:    make([]WSRecord, 0, 512),
		historyMax: 512,
		logger:     logger,
		upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin: func(r *http.Request) bool {
				// Allow all origins - customize for production
				return true
			},
		},
	}
	go broker.run()
	return broker
}

// run manages the broker's event loop
func (b *WSBroker) run() {
	for {
		select {
		case client := <-b.register:
			b.mu.Lock()
			b.clients[client.ID] = client
			b.mu.Unlock()
			b.logger.Info("WebSocket client connected", slog.String("clientId", client.ID), slog.Int("totalClients", len(b.clients)))

		case client := <-b.unregister:
			b.mu.Lock()
			if _, ok := b.clients[client.ID]; ok {
				close(client.Send)
				delete(b.clients, client.ID)
				b.logger.Info("WebSocket client disconnected", slog.String("clientId", client.ID), slog.Int("totalClients", len(b.clients)))
			}
			b.mu.Unlock()

		case message := <-b.broadcast:
			if message.ClientID != "" {
				// Send to specific client
				b.sendToClient(message.ClientID, message)
			} else {
				// Broadcast to all clients
				b.broadcastToAll(message)
			}
		}
	}
}

// broadcastToAll sends a message to all connected clients
func (b *WSBroker) broadcastToAll(msg *WSMessage) {
	// Assign ID and append to history
	msg.ID = atomic.AddUint64(&b.lastID, 1)
	b.appendHistory(msg.ID, msg.Event, msg.Data)

	jsonData, err := json.Marshal(msg)
	if err != nil {
		b.logger.Error("Failed to marshal broadcast message", slog.String("error", err.Error()))
		return
	}

	b.mu.RLock()
	defer b.mu.RUnlock()

	for _, client := range b.clients {
		select {
		case client.Send <- jsonData:
		default:
			// Client send buffer full, skip
			b.logger.Warn("Client send buffer full", slog.String("clientId", client.ID))
		}
	}
}

// sendToClient sends a message to a specific client
func (b *WSBroker) sendToClient(clientID string, msg *WSMessage) {
	b.mu.RLock()
	client, ok := b.clients[clientID]
	b.mu.RUnlock()

	if !ok {
		b.logger.Warn("Client not found for targeted message", slog.String("clientId", clientID))
		return
	}

	// Assign ID and append to history
	msg.ID = atomic.AddUint64(&b.lastID, 1)
	b.appendHistory(msg.ID, msg.Event, msg.Data)

	jsonData, err := json.Marshal(msg)
	if err != nil {
		b.logger.Error("Failed to marshal client message", slog.String("error", err.Error()))
		return
	}

	select {
	case client.Send <- jsonData:
	default:
		b.logger.Warn("Client send buffer full", slog.String("clientId", clientID))
	}
}

// Broadcast sends an event to all connected clients
func (b *WSBroker) Broadcast(eventType string, data interface{}) error {
	select {
	case b.broadcast <- &WSMessage{
		Event: eventType,
		Data:  data,
	}:
		return nil
	default:
		return fmt.Errorf("broadcast channel full")
	}
}

// SendToClient sends an event to a specific client by ID
func (b *WSBroker) SendToClient(clientID, eventType string, data interface{}) error {
	select {
	case b.broadcast <- &WSMessage{
		Event:    eventType,
		Data:     data,
		ClientID: clientID,
	}:
		return nil
	default:
		return fmt.Errorf("broadcast channel full")
	}
}

// GetClientCount returns the number of connected clients
func (b *WSBroker) GetClientCount() int {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return len(b.clients)
}

// GetClientIDs returns all connected client IDs
func (b *WSBroker) GetClientIDs() []string {
	b.mu.RLock()
	defer b.mu.RUnlock()

	ids := make([]string, 0, len(b.clients))
	for id := range b.clients {
		ids = append(ids, id)
	}
	return ids
}

// ServeWS handles WebSocket upgrade and client lifecycle
func (b *WSBroker) ServeWS(w http.ResponseWriter, r *http.Request) {
	conn, err := b.upgrader.Upgrade(w, r, nil)
	if err != nil {
		b.logger.Error("WebSocket upgrade failed", slog.String("error", err.Error()))
		return
	}

	clientID := GetRequestID(r)
	client := &WSClient{
		ID:     clientID,
		Conn:   conn,
		Send:   make(chan []byte, 256),
		Broker: b,
	}

	// Register client
	b.register <- client

	// Send connection confirmation
	connectionMsg := &WSMessage{
		Event: "connected",
		Data: map[string]interface{}{
			"clientId": clientID,
			"message":  "Connected to WebSocket stream",
		},
		ID: 0, // Don't increment ID for connection message
	}
	if data, err := json.Marshal(connectionMsg); err == nil {
		client.Send <- data
	}

	// Start goroutines for reading and writing
	go client.writePump()
	go client.readPump()
}

const (
	// Time allowed to write a message to the peer
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer
	pongWait = 60 * time.Second

	// Send pings to peer with this period (must be less than pongWait)
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer
	maxMessageSize = 512 * 1024 // 512KB
)

// readPump pumps messages from the WebSocket connection to the broker
func (c *WSClient) readPump() {
	defer func() {
		c.Broker.unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				c.Broker.logger.Error("WebSocket read error", slog.String("clientId", c.ID), slog.String("error", err.Error()))
			}
			break
		}

		// Handle incoming messages from client (optional - could add client-to-server messaging)
		c.Broker.logger.Debug("Received message from client", slog.String("clientId", c.ID), slog.String("message", string(message)))
	}
}

// writePump pumps messages from the broker to the WebSocket connection
func (c *WSClient) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// Channel closed
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued messages to the current websocket message
			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// appendHistory appends to in-memory history with max length
func (b *WSBroker) appendHistory(id uint64, eventType string, data interface{}) {
	b.historyMu.Lock()
	defer b.historyMu.Unlock()

	b.history = append(b.history, WSRecord{
		ID:        id,
		Timestamp: time.Now(),
		Event:     eventType,
		Data:      data,
	})

	if len(b.history) > b.historyMax {
		// Drop oldest
		drop := len(b.history) - b.historyMax
		if drop < 0 {
			drop = 0
		}
		b.history = b.history[drop:]
	}
}

// GetRecent returns the most recent up to limit records
func (b *WSBroker) GetRecent(limit int) []WSRecord {
	b.historyMu.RLock()
	defer b.historyMu.RUnlock()

	n := len(b.history)
	if limit <= 0 || limit > n {
		limit = n
	}

	out := make([]WSRecord, limit)
	copy(out, b.history[n-limit:])
	return out
}

// Since returns records with ID > cursor up to limit
func (b *WSBroker) Since(cursor uint64, limit int) []WSRecord {
	b.historyMu.RLock()
	defer b.historyMu.RUnlock()

	out := make([]WSRecord, 0, limit)
	for _, rec := range b.history {
		if rec.ID > cursor {
			out = append(out, rec)
			if limit > 0 && len(out) >= limit {
				break
			}
		}
	}
	return out
}

// LastID returns the last assigned event ID
func (b *WSBroker) LastID() uint64 {
	return atomic.LoadUint64(&b.lastID)
}
