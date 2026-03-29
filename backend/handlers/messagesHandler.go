package handlers

import (
	"database/sql"
	"encoding/json"
	"html"
	"net/http"
	"strconv"
	"sync"
	"time"

	db "forum/backend/database"

	"github.com/gorilla/websocket"
)

var wsUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}
type SafeConn struct {
	Conn *websocket.Conn
	Mu   sync.Mutex
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

func addConnection(userID int, username string, conn *websocket.Conn) {
	activeConnectionsMu.Lock()
	defer activeConnectionsMu.Unlock()

	sc := &SafeConn{Conn: conn}
	activeConnections[userID] = append(activeConnections[userID], sc)
	usernames[userID] = username
}

func removeConnection(userID int, conn *websocket.Conn) {
	activeConnectionsMu.Lock()
	defer activeConnectionsMu.Unlock()

	conns, exists := activeConnections[userID]
	if !exists {
		return
	}

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
			"type":   "offline",
			"userId": userID,
			"time":   time.Now().Format(time.RFC3339),
		})
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
	allConns := []*SafeConn{}
	for _, conns := range activeConnections {
		allConns = append(allConns, conns...)
	}
	activeConnectionsMu.RUnlock()

	for _, conn := range allConns {
		_ = conn.WriteJSON(payload)
	}
}

func handleUserMessages(userID int, conn *websocket.Conn, dbConn *sql.DB) {
	defer func() {
		removeConnection(userID, conn)
		conn.Close()
	}()
	conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})
	for {
		_, msgBytes, err := conn.ReadMessage()
		if err != nil {
			return
		}

		var msg map[string]interface{}
		if err := json.Unmarshal(msgBytes, &msg); err != nil {
			continue
		}

		msgType, ok := msg["type"].(string)
		if !ok {
			continue
		}

		switch msgType {

		case "message":
			receiverID, ok := parseInt(msg["receiver"])
			if !ok {
				continue
			}

			messageText, ok := msg["message"].(string)
			if !ok || len(messageText) == 0 || len(messageText) > 1000 {
				continue
			}

			senderName := usernames[userID]
			receiverName := usernames[receiverID]

			res, err := dbConn.Exec(
				"INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)",
				userID, receiverID, messageText,
			)
			if err != nil {
				continue
			}

			msgID64, _ := res.LastInsertId()

			outMsg := map[string]interface{}{
				"type":             "message",
				"id":               int(msgID64),
				"from":             userID,
				"to":               receiverID,
				"text":             messageText,
				"timestamp":        time.Now().Format(time.RFC3339),
				"senderUsername":   senderName,
				"receiverUsername": receiverName,
			}

			sendToSingleUser(receiverID, outMsg)
			sendToSingleUser(userID, outMsg)

		case "typing", "stopTyping":
			receiverID, ok := parseInt(msg["receiver"])
			if !ok {
				continue
			}

			sendToSingleUser(receiverID, map[string]interface{}{
				"type":           msgType,
				"senderId":       userID,
				"senderUsername": usernames[userID],
				"time":           time.Now().Format(time.RFC3339),
			})
		}
	}
}
func parseInt(value interface{}) (int, bool) {
	switch v := value.(type) {
	case float64:
		return int(v), true
	case int:
		return v, true
	default:
		return 0, false
	}
}

func ChatWsHandler(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserFromSession(r, db.DataBase)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	var username string
	_ = db.DataBase.QueryRow("SELECT username FROM users WHERE id = ?", userID).Scan(&username)

	conn, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	addConnection(userID, username, conn)

	db.DataBase.Exec("UPDATE users SET is_online = TRUE WHERE id = ?", userID)

	go broadcastToAll(map[string]interface{}{
		"type":     "online",
		"userId":   userID,
		"username": username,
		"time":     time.Now().Format(time.RFC3339),
	})

	activeConnectionsMu.RLock()
	users := []map[string]interface{}{}
	for id, name := range usernames {
		users = append(users, map[string]interface{}{
			"id":       id,
			"nickname": name,
			"online":   true,
		})
	}
	activeConnectionsMu.RUnlock()

	_ = (&SafeConn{Conn: conn}).WriteJSON(map[string]interface{}{
		"type": "users",
		"data": map[string]interface{}{
			"currentUserId": userID,
			"users":         users,
		},
		"time": time.Now().Format(time.RFC3339),
	})

	handleUserMessages(userID, conn, db.DataBase)
}
func FetchUserMessagesHandler(w http.ResponseWriter, r *http.Request) {
	receiverID, err1 := strconv.Atoi(r.URL.Query().Get("receiver"))
	offsetID, err2 := strconv.Atoi(r.URL.Query().Get("offset"))

	if err1 != nil || err2 != nil {
		ResponseJSON(w, http.StatusBadRequest, map[string]any{
			"message": "Invalid parameters",
			"status":  http.StatusBadRequest,
		})
		return
	}
	senderID, err := GetUserFromSession(r, db.DataBase)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	rows, err := db.DataBase.Query(`
		SELECT m.id, m.sender_id, m.receiver_id, m.message, m.created_at, u.username
		FROM messages m
		JOIN users u ON m.sender_id = u.id
		WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
		ORDER BY m.id DESC
		LIMIT 10 OFFSET ?`,
		senderID, receiverID, receiverID, senderID, offsetID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "DB error")
		return
	}
	defer rows.Close()

	msgList := []map[string]interface{}{}

	for rows.Next() {
		var id, sender, receiver int
		var messageText, createdAt, senderUsername string

		if err := rows.Scan(&id, &sender, &receiver, &messageText, &createdAt, &senderUsername); err != nil {
			continue
		}
		msgList = append(msgList, map[string]interface{}{
			"id":             id,
			"sender":         sender,
			"receiver":       receiver,
			"message":        html.EscapeString(messageText),
			"time":           createdAt,
			"senderUsername": html.EscapeString(senderUsername),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(msgList)
}
