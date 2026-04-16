package handlers

import (
	"encoding/json"
	db "forum/backend/database"
	"net/http"
	"sync"

	"forum/backend/middleware"
	"forum/backend/service"

	"github.com/gorilla/websocket"
)

var wsUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type SafeConn struct {
	Conn  *websocket.Conn
	Mu    sync.Mutex
	Token string
}

func (s *SafeConn) WriteJSON(v interface{}) error {
	s.Mu.Lock()
	defer s.Mu.Unlock()
	return s.Conn.WriteJSON(v)
}

var (
	activeConnections   = make(map[int][]*SafeConn)
	usernames           = make(map[int]string)
	activeConnectionsMu sync.RWMutex
)

type MessageHandler struct {
	messageService *service.MessageService
}

func NewMessageHandler(messageService *service.MessageService) *MessageHandler {
	return &MessageHandler{messageService: messageService}
}

func addAuthenticatedConnection(user middleware.SessionUser, conn *websocket.Conn) *SafeConn {
	activeConnectionsMu.Lock()
	defer activeConnectionsMu.Unlock()

	sc := &SafeConn{
		Conn:  conn,
		Token: user.Token,
	}
	activeConnections[user.ID] = append(activeConnections[user.ID], sc)
	usernames[user.ID] = user.Nickname
	return sc
}

func removeConnection(userID int, conn *websocket.Conn) {
	activeConnectionsMu.Lock()
	defer activeConnectionsMu.Unlock()

	conns := activeConnections[userID]
	for i, c := range conns {
		if c.Conn == conn {
			activeConnections[userID] = append(conns[:i], conns[i+1:]...)
			break
		}
	}
	if len(activeConnections[userID]) == 0 {
		delete(activeConnections, userID)
		delete(usernames, userID)

		db.DataBase.Exec("UPDATE users SET is_online = FALSE WHERE id = ?", userID)

		go broadcastToAll(map[string]interface{}{
			"type": "offline",
			"id":   userID,
		})
	}
}

func CloseConnectionsForSession(token string) {
	if token == "" {
		return
	}

	activeConnectionsMu.RLock()
	toClose := make([]struct {
		userID int
		conn   *websocket.Conn
	}, 0)
	for userID, conns := range activeConnections {
		for _, safeConn := range conns {
			if safeConn.Token == token {
				toClose = append(toClose, struct {
					userID int
					conn   *websocket.Conn
				}{
					userID: userID,
					conn:   safeConn.Conn,
				})
			}
		}
	}
	activeConnectionsMu.RUnlock()

	for _, item := range toClose {
		_ = item.conn.Close()
		removeConnection(item.userID, item.conn)
	}
}

func sendToSingleUser(userID int, payload map[string]interface{}) {
	activeConnectionsMu.RLock()
	conns := append([]*SafeConn{}, activeConnections[userID]...)
	activeConnectionsMu.RUnlock()

	for _, conn := range conns {
		if err := conn.WriteJSON(payload); err != nil {
			conn.Conn.Close()
			removeConnection(userID, conn.Conn)
		}
	}
}

func broadcastToAll(payload map[string]interface{}) {
	activeConnectionsMu.RLock()
	all := []*SafeConn{}
	for _, conns := range activeConnections {
		all = append(all, conns...)
	}
	activeConnectionsMu.RUnlock()

	for _, conn := range all {
		if err := conn.WriteJSON(payload); err != nil {
			conn.Conn.Close()
		}
	}
}

func (h *MessageHandler) handleUserMessages(userID int, conn *websocket.Conn, safeConn *SafeConn) {
	defer func() {
		removeConnection(userID, conn)
		conn.Close()
	}()

	for {
		_, msgBytes, err := conn.ReadMessage()
		if err != nil {
			return
		}

		var msg map[string]interface{}
		if err := json.Unmarshal(msgBytes, &msg); err != nil {
			continue
		}

		switch msg["type"] {
		case "users":
			_ = h.sendUsersSnapshot(safeConn, userID)

		case "history":
			receiverID, ok := parseInt(msg["receiver"])
			if !ok {
				continue
			}

			lastIndex, ok := parseOptionalInt(msg["lastIndex"])
			if !ok {
				lastIndex = 0
			}

			limit, ok := parseOptionalInt(msg["limit"])
			if !ok || limit <= 0 {
				limit = 10
			}

			messages, hasMore, err := h.messageService.GetConversationHistory(userID, receiverID, limit, lastIndex)
			if err != nil {
				_ = safeConn.WriteJSON(map[string]interface{}{
					"type": "error",
					"data": map[string]interface{}{
						"message": "Could not load messages",
					},
				})
				continue
			}

			_ = safeConn.WriteJSON(map[string]interface{}{
				"type": "history",
				"data": map[string]interface{}{
					"userId":    receiverID,
					"lastIndex": lastIndex,
					"hasMore":   hasMore,
					"items":     h.messageService.BuildMessagePayloads(messages),
				},
			})

		case "message":
			receiverID, ok := parseInt(msg["receiver"])
			if !ok {
				continue
			}

			text, ok := msg["message"].(string)
			if !ok || text == "" {
				continue
			}

			senderName := usernames[userID]
			receiverName := usernames[receiverID]

			out, err := h.messageService.CreateMessage(userID, receiverID, text, senderName, receiverName)
			if err != nil {
				sendToSingleUser(userID, map[string]interface{}{
					"type": "error",
					"data": map[string]interface{}{
						"message": err.Error(),
					},
				})
				continue
			}

			sendToSingleUser(receiverID, out)
			sendToSingleUser(userID, out)

		case "typing", "stopTyping":
			receiverID, ok := parseInt(msg["receiver"])
			if !ok {
				continue
			}

			sendToSingleUser(receiverID, map[string]interface{}{
				"type":           msg["type"],
				"senderId":       userID,
				"senderNickname": usernames[userID],
			})
		}
	}
}

func parseInt(v interface{}) (int, bool) {
	switch val := v.(type) {
	case float64:
		return int(val), true
	case int:
		return val, true
	default:
		return 0, false
	}
}

func parseOptionalInt(v interface{}) (int, bool) {
	if v == nil {
		return 0, false
	}
	return parseInt(v)
}

func getOnlineUsersSnapshot() map[int]bool {
	activeConnectionsMu.RLock()
	defer activeConnectionsMu.RUnlock()

	onlineUsers := make(map[int]bool, len(activeConnections))
	for id, conns := range activeConnections {
		onlineUsers[id] = len(conns) > 0
	}

	return onlineUsers
}

func (h *MessageHandler) sendUsersSnapshot(conn *SafeConn, userID int) error {
	users, err := h.messageService.GetUsersSnapshot(userID, getOnlineUsersSnapshot())
	if err != nil {
		return err
	}

	return conn.WriteJSON(map[string]interface{}{
		"type": "users",
		"data": map[string]interface{}{
			"currentUserId": userID,
			"users":         users,
		},
	})
}

func (h *MessageHandler) ChatWsHandler(w http.ResponseWriter, r *http.Request) {
	sessionUser, ok := middleware.GetSessionUser(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	conn, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	safeConn := addAuthenticatedConnection(sessionUser, conn)
	userID := sessionUser.ID
	nickname := sessionUser.Nickname

	db.DataBase.Exec("UPDATE users SET is_online = TRUE WHERE id = ?", userID)

	go broadcastToAll(map[string]interface{}{
		"type":     "online",
		"id":       userID,
		"nickname": nickname,
	})

	_ = h.sendUsersSnapshot(safeConn, userID)

	h.handleUserMessages(userID, conn, safeConn)
}
