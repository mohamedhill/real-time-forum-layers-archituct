package handlers
/**

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
 */