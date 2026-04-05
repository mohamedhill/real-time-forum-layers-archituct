package handlers

import (
	"database/sql"
	"encoding/json"
	db "forum/backend/database"
	"net/http"
	"sync"
	"time"

	"forum/backend/middleware"

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

type ChatMessage struct {
	ID               int
	From             int
	To               int
	Text             string
	Timestamp        string
	SenderNickname   string
	ReceiverNickname string
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

func addConnection(userID int, nickname string, conn *websocket.Conn) *SafeConn {
	activeConnectionsMu.Lock()
	defer activeConnectionsMu.Unlock()

	sc := &SafeConn{Conn: conn}
	activeConnections[userID] = append(activeConnections[userID], sc)
	usernames[userID] = nickname
	return sc
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

func handleUserMessages(userID int, conn *websocket.Conn, safeConn *SafeConn, dbConn *sql.DB) {
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
			_ = sendUsersSnapshot(safeConn, userID, dbConn)

		case "history":
			receiverID, ok := parseInt(msg["receiver"])
			if !ok {
				continue
			}

			offset, ok := parseOptionalInt(msg["offset"])
			if !ok {
				offset = 0
			}

			limit, ok := parseOptionalInt(msg["limit"])
			if !ok || limit <= 0 {
				limit = 10
			}

			messages, hasMore, err := fetchConversationMessages(dbConn, userID, receiverID, limit, offset)
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
					"userId":  receiverID,
					"offset":  offset,
					"hasMore": hasMore,
					"items":   buildMessagePayloads(messages),
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

			res, err := dbConn.Exec(
				"INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)",
				userID, receiverID, text,
			)
			if err != nil {
				sendToSingleUser(userID, map[string]interface{}{
					"type": "error",
					"data": map[string]interface{}{
						"message": "Could not send message",
					},
				})
				continue
			}

			id64, _ := res.LastInsertId()

			out := map[string]interface{}{
				"type":             "message",
				"id":               int(id64),
				"from":             userID,
				"to":               receiverID,
				"text":             text,
				"senderNickname":   senderName,
				"receiverNickname": receiverName,
				"time":             time.Now(),
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

func sendUsersSnapshot(conn *SafeConn, userID int, dbConn *sql.DB) error {
	users, err := buildUserList(dbConn, userID)
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

func buildUserList(dbConn *sql.DB, currentUserID int) ([]map[string]interface{}, error) {
	activeConnectionsMu.RLock()
	onlineUsers := make(map[int]bool, len(activeConnections))
	for id, conns := range activeConnections {
		onlineUsers[id] = len(conns) > 0
	}
	activeConnectionsMu.RUnlock()

	rows, err := dbConn.Query("SELECT id, nickname FROM users WHERE id != ? ORDER BY nickname ASC", currentUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := []map[string]interface{}{}
	for rows.Next() {
		var id int
		var nickname string
		if err := rows.Scan(&id, &nickname); err != nil {
			return nil, err
		}

		lastMessage, lastMessageTime, err := fetchLastConversationMessage(dbConn, currentUserID, id)
		if err != nil {
			return nil, err
		}

		users = append(users, map[string]interface{}{
			"id":              id,
			"nickname":        nickname,
			"online":          onlineUsers[id],
			"lastMessageText": lastMessage,
			"lastMessageTime": lastMessageTime,
		})
	}

	return users, rows.Err()
}

func fetchLastConversationMessage(dbConn *sql.DB, currentUserID int, otherUserID int) (string, string, error) {
	var text sql.NullString
	var createdAt sql.NullString

	err := dbConn.QueryRow(`
		SELECT message, created_at
		FROM messages
		WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
		ORDER BY created_at DESC, id DESC
		LIMIT 1
	`, currentUserID, otherUserID, otherUserID, currentUserID).Scan(&text, &createdAt)
	if err == sql.ErrNoRows {
		return "", "", nil
	}
	if err != nil {
		return "", "", err
	}

	return text.String, createdAt.String, nil
}

func fetchConversationMessages(dbConn *sql.DB, currentUserID int, otherUserID int, limit int, offset int) ([]ChatMessage, bool, error) {
	rows, err := dbConn.Query(`
		SELECT
			m.id,
			m.sender_id,
			m.receiver_id,
			m.message,
			m.created_at,
			sender.nickname,
			receiver.nickname
		FROM messages m
		JOIN users sender ON sender.id = m.sender_id
		JOIN users receiver ON receiver.id = m.receiver_id
		WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
		ORDER BY m.created_at DESC, m.id DESC
		LIMIT ? OFFSET ?
	`, currentUserID, otherUserID, otherUserID, currentUserID, limit+1, offset)
	if err != nil {
		return nil, false, err
	}
	defer rows.Close()

	messages := []ChatMessage{}
	for rows.Next() {
		var message ChatMessage
		if err := rows.Scan(
			&message.ID,
			&message.From,
			&message.To,
			&message.Text,
			&message.Timestamp,
			&message.SenderNickname,
			&message.ReceiverNickname,
		); err != nil {
			return nil, false, err
		}
		messages = append(messages, message)
	}
	if err := rows.Err(); err != nil {
		return nil, false, err
	}

	hasMore := len(messages) > limit
	if hasMore {
		messages = messages[:limit]
	}

	for left, right := 0, len(messages)-1; left < right; left, right = left+1, right-1 {
		messages[left], messages[right] = messages[right], messages[left]
	}

	return messages, hasMore, nil
}

func buildMessagePayloads(messages []ChatMessage) []map[string]interface{} {
	payloads := make([]map[string]interface{}, 0, len(messages))
	for _, message := range messages {
		payloads = append(payloads, map[string]interface{}{
			"id":               message.ID,
			"from":             message.From,
			"to":               message.To,
			"text":             message.Text,
			"time":             message.Timestamp,
			"senderNickname":   message.SenderNickname,
			"receiverNickname": message.ReceiverNickname,
		})
	}
	return payloads
}

func ChatWsHandler(w http.ResponseWriter, r *http.Request) {
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

	_ = sendUsersSnapshot(safeConn, userID, db.DataBase)

	handleUserMessages(userID, conn, safeConn, db.DataBase)
}
