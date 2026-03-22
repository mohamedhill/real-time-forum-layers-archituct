package handlers

import (
	"bufio"
	"crypto/sha1"
	"database/sql"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	dbpkg "forum/backend/database"
	"forum/backend/service"
)

type ChatHandler struct {
	sessionService *service.SessionService
	hub            *chatHub
}

type chatHub struct {
	mu      sync.RWMutex
	clients map[int]*chatClient
}

type chatClient struct {
	userID   int
	nickname string
	conn     net.Conn
	send     chan []byte
	mu       sync.Mutex
}

type chatEnvelope struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

type chatUser struct {
	ID       int    `json:"id"`
	Nickname string `json:"nickname"`
	Online   bool   `json:"online"`
}

type usersPayload struct {
	CurrentUserID int        `json:"currentUserId"`
	Users         []chatUser `json:"users"`
}

type incomingChatMessage struct {
	Type string `json:"type"`
	To   int    `json:"to"`
	Text string `json:"text"`
}

type outgoingChatMessage struct {
	From      int    `json:"from"`
	To        int    `json:"to"`
	Text      string `json:"text"`
	Nickname  string `json:"nickname"`
	Timestamp string `json:"timestamp"`
}
package handlers

import (
	"bufio"
	"crypto/sha1"
	"database/sql"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	dbpkg "forum/backend/database"
	"forum/backend/service"
)

type ChatHandler struct {
	sessionService *service.SessionService
	hub            *chatHub
}

type chatHub struct {
	mu      sync.RWMutex
	clients map[int]*chatClient
}

type chatClient struct {
	userID   int
	nickname string
	conn     net.Conn
	send     chan []byte
	mu       sync.Mutex
}

type chatEnvelope struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

type chatUser struct {
	ID       int    `json:"id"`
	Nickname string `json:"nickname"`
	Online   bool   `json:"online"`
}

type usersPayload struct {
	CurrentUserID int        `json:"currentUserId"`
	Users         []chatUser `json:"users"`
}

type incomingChatMessage struct {
	Type string `json:"type"`
	To   int    `json:"to"`
	Text string `json:"text"`
}

type outgoingChatMessage struct {
	From      int    `json:"from"`
	To        int    `json:"to"`
	Text      string `json:"text"`
	Nickname  string `json:"nickname"`
	Timestamp string `json:"timestamp"`
}

const websocketGUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
func NewChatHandler(sessionService *service.SessionService) *ChatHandler {
	return &ChatHandler{
		sessionService: sessionService,
		hub:            &chatHub{clients: make(map[int]*chatClient)},
	}
}

func (h *ChatHandler) ServeWS(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session")
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	userID, nickname, err := h.sessionService.GetUserFromSession(cookie.Value)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	conn, rw, err := upgradeToWebSocket(w, r)
	if err != nil {
		http.Error(w, "websocket upgrade failed", http.StatusBadRequest)
		return
	}
	_ = rw

	client := &chatClient{
		userID:   userID,
		nickname: nickname,
		conn:     conn,
		send:     make(chan []byte, 32),
	}

	h.hub.register(client)
	h.pushUserList()

	go h.writePump(client)
	h.readPump(client)
}
func (h *ChatHandler) readPump(client *chatClient) {
	defer func() {
		h.hub.unregister(client.userID)
		h.pushUserList()
		close(client.send)
		client.conn.Close()
	}()

	for {
		payload, opcode, err := readWebSocketFrame(client.conn)
		if err != nil {
			if !errors.Is(err, io.EOF) {
				log.Println("websocket read error:", err)
			}
			return
		}

		switch opcode {
		case 0x8:
			return
		case 0x9:
			_ = writeWebSocketFrame(client.conn, 0xA, payload)
			continue
		case 0x1:
			var msg incomingChatMessage
			if err := json.Unmarshal(payload, &msg); err != nil {
				h.sendError(client, "invalid message payload")
				continue
			}
			switch msg.Type {
			case "message":
				h.handleDirectMessage(client, msg)
			case "users":
				h.sendUsers(client)
			}
		}
	}
}

func (h *ChatHandler) writePump(client *chatClient) {
	ticker := time.NewTicker(25 * time.Second)
	defer func() {
		ticker.Stop()
		client.conn.Close()
	}()

	for {
		select {
		case payload, ok := <-client.send:
			if !ok {
				return
			}
			if err := writeWebSocketFrame(client.conn, 0x1, payload); err != nil {
				return
			}
		case <-ticker.C:
			if err := writeWebSocketFrame(client.conn, 0x9, []byte("ping")); err != nil {
				return
			}
		}
	}
}

func (h *ChatHandler) handleDirectMessage(sender *chatClient, msg incomingChatMessage) {
	text := strings.TrimSpace(msg.Text)
	if msg.To == 0 || text == "" {
		return
	}

	payload := outgoingChatMessage{
		From:      sender.userID,
		To:        msg.To,
		Text:      text,
		Nickname:  sender.nickname,
		Timestamp: time.Now().Format(time.RFC3339),
	}

	encoded, err := json.Marshal(chatEnvelope{Type: "message", Data: payload})
	if err != nil {
		return
	}

	h.hub.sendTo(sender.userID, encoded)
	h.hub.sendTo(msg.To, encoded)
}

func (h *ChatHandler) sendUsers(client *chatClient) {
	users, err := h.loadUsers(client.userID)
	if err != nil {
		h.sendError(client, "failed to load users")
		return
	}

	encoded, err := json.Marshal(chatEnvelope{
		Type: "users",
		Data: usersPayload{
			CurrentUserID: client.userID,
			Users:         users,
		},
	})
	if err != nil {
		return
	}

	select {
	case client.send <- encoded:
	default:
	}
}

func (h *ChatHandler) pushUserList() {
	h.hub.mu.RLock()
	ids := make([]int, 0, len(h.hub.clients))
	for id := range h.hub.clients {
		ids = append(ids, id)
	}
	h.hub.mu.RUnlock()

	for _, id := range ids {
		h.hub.mu.RLock()
		client := h.hub.clients[id]
		h.hub.mu.RUnlock()
		if client != nil {
			h.sendUsers(client)
		}
	}
}

func (h *ChatHandler) loadUsers(currentUserID int) ([]chatUser, error) {
	rows, err := dbpkg.DataBase.Query(
		`SELECT id, nickname FROM users WHERE id != ? ORDER BY nickname`,
		currentUserID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]chatUser, 0)
	for rows.Next() {
		var user chatUser
		if err := rows.Scan(&user.ID, &user.Nickname); err != nil {
			return nil, err
		}
		user.Online = h.hub.isOnline(user.ID)
		users = append(users, user)
	}

	if err := rows.Err(); err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	return users, nil
}

func (h *ChatHandler) sendError(client *chatClient, text string) {
	encoded, err := json.Marshal(chatEnvelope{
		Type: "error",
		Data: map[string]string{"message": text},
	})
	if err != nil {
		return
	}

	select {
	case client.send <- encoded:
	default:
	}
}

func (h *chatHub) register(client *chatClient) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.clients[client.userID] = client
}

func (h *chatHub) unregister(userID int) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.clients, userID)
}

func (h *chatHub) sendTo(userID int, payload []byte) {
	h.mu.RLock()
	client := h.clients[userID]
	h.mu.RUnlock()
	if client == nil {
		return
	}

	select {
	case client.send <- payload:
	default:
	}
}

func (h *chatHub) isOnline(userID int) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	_, ok := h.clients[userID]
	return ok
}

func upgradeToWebSocket(w http.ResponseWriter, r *http.Request) (net.Conn, *bufio.ReadWriter, error) {
	if !strings.EqualFold(r.Header.Get("Connection"), "Upgrade") &&
		!strings.Contains(strings.ToLower(r.Header.Get("Connection")), "upgrade") {
		return nil, nil, errors.New("missing connection upgrade header")
	}

	if !strings.EqualFold(r.Header.Get("Upgrade"), "websocket") {
		return nil, nil, errors.New("missing upgrade websocket header")
	}

	key := r.Header.Get("Sec-WebSocket-Key")
	if key == "" {
		return nil, nil, errors.New("missing websocket key")
	}

	hj, ok := w.(http.Hijacker)
	if !ok {
		return nil, nil, errors.New("hijacking unsupported")
	}

	conn, rw, err := hj.Hijack()
	if err != nil {
		return nil, nil, err
	}

	acceptKey := computeAcceptKey(key)
	response := fmt.Sprintf(
		"HTTP/1.1 101 Switching Protocols\r\n"+
			"Upgrade: websocket\r\n"+
			"Connection: Upgrade\r\n"+
			"Sec-WebSocket-Accept: %s\r\n\r\n",
		acceptKey,
	)

	if _, err := rw.WriteString(response); err != nil {
		conn.Close()
		return nil, nil, err
	}
	if err := rw.Flush(); err != nil {
		conn.Close()
		return nil, nil, err
	}

	return conn, rw, nil
}

func computeAcceptKey(key string) string {
	sum := sha1.Sum([]byte(key + websocketGUID))
	return base64.StdEncoding.EncodeToString(sum[:])
}

func readWebSocketFrame(conn net.Conn) ([]byte, byte, error) {
	header := make([]byte, 2)
	if _, err := io.ReadFull(conn, header); err != nil {
		return nil, 0, err
	}

	opcode := header[0] & 0x0F
	masked := header[1]&0x80 != 0
	payloadLen := int(header[1] & 0x7F)

	switch payloadLen {
	case 126:
		ext := make([]byte, 2)
		if _, err := io.ReadFull(conn, ext); err != nil {
			return nil, 0, err
		}
		payloadLen = int(binary.BigEndian.Uint16(ext))
	case 127:
		ext := make([]byte, 8)
		if _, err := io.ReadFull(conn, ext); err != nil {
			return nil, 0, err
		}
		payloadLen64 := binary.BigEndian.Uint64(ext)
		if payloadLen64 > 1<<20 {
			return nil, 0, errors.New("payload too large")
		}
		payloadLen = int(payloadLen64)
	}

	var maskKey []byte
	if masked {
		maskKey = make([]byte, 4)
		if _, err := io.ReadFull(conn, maskKey); err != nil {
			return nil, 0, err
		}
	}

	payload := make([]byte, payloadLen)
	if _, err := io.ReadFull(conn, payload); err != nil {
		return nil, 0, err
	}

	if masked {
		for i := range payload {
			payload[i] ^= maskKey[i%4]
		}
	}

	return payload, opcode, nil
}
func writeWebSocketFrame(conn net.Conn, opcode byte, payload []byte) error {
	frame := make([]byte, 0, 10+len(payload))
	frame = append(frame, 0x80|opcode)

	payloadLen := len(payload)
	switch {
	case payloadLen < 126:
		frame = append(frame, byte(payloadLen))
	case payloadLen <= 65535:
		frame = append(frame, 126)
		ext := make([]byte, 2)
		binary.BigEndian.PutUint16(ext, uint16(payloadLen))
		frame = append(frame, ext...)
	default:
		frame = append(frame, 127)
		ext := make([]byte, 8)
		binary.BigEndian.PutUint64(ext, uint64(payloadLen))
		frame = append(frame, ext...)
	}

	frame = append(frame, payload...)
	_, err := conn.Write(frame)
	return err
}

