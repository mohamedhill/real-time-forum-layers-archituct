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

