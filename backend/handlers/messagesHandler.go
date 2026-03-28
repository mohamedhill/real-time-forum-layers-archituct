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

var (
	activeConnections   = make(map[int][]*websocket.Conn)
	activeConnectionsMu sync.Mutex
)

func addConnection(userID int, conn *websocket.Conn) {
	activeConnectionsMu.Lock()
	defer activeConnectionsMu.Unlock()
	activeConnections[userID] = append(activeConnections[userID], conn)
}

func removeConnection(userID int, conn *websocket.Conn) {
	activeConnectionsMu.Lock()
	defer activeConnectionsMu.Unlock()

	conns, exists := activeConnections[userID]
	if !exists {
		return
	}

	for i, c := range conns {
		if c == conn {
			activeConnections[userID] = append(conns[:i], conns[i+1:]...)
			break
		}
	}

	if len(activeConnections[userID]) == 0 {
		delete(activeConnections, userID)
		db.DataBase.Exec("UPDATE users SET is_online = FALSE WHERE id = ?", userID)
		broadcastToAll(map[string]interface{}{
			"type":   "offline",
			"userId": userID,
			"time":   time.Now().Format(time.RFC3339),
		})
	}
}

func sendToSingleUser(userID int, payload map[string]interface{}) {
	activeConnectionsMu.Lock()
	conns := append([]*websocket.Conn{}, activeConnections[userID]...)
	activeConnectionsMu.Unlock()

	for _, conn := range conns {
		if err := safeWriteJSON(conn, payload); err != nil {
			removeConnection(userID, conn)
		}
	}
}

func safeWriteJSON(conn *websocket.Conn, payload interface{}) error {
	if conn == nil {
		return nil
	}
	if err := conn.WriteJSON(payload); err != nil {
		_ = conn.Close()
		return err
	}
	return nil
}

func broadcastToAll(payload map[string]interface{}) {
	activeConnectionsMu.Lock()
	allConns := []*websocket.Conn{}
	for _, conns := range activeConnections {
		allConns = append(allConns, conns...)
	}
	activeConnectionsMu.Unlock()

	for _, conn := range allConns {
		_ = safeWriteJSON(conn, payload)
	}
}

func handleUserMessages(userID int, conn *websocket.Conn, dbConn *sql.DB) {
	defer func() {
		removeConnection(userID, conn)
		_ = conn.Close()
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
			if !ok {
				continue
			}

			var senderName, receiverName string
			_ = dbConn.QueryRow("SELECT username FROM users WHERE id = ?", userID).Scan(&senderName)
			_ = dbConn.QueryRow("SELECT username FROM users WHERE id = ?", receiverID).Scan(&receiverName)

			res, err := dbConn.Exec("INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)", userID, receiverID, messageText)
			if err != nil {
				continue
			}
			msgID64, _ := res.LastInsertId()
			msgID := int(msgID64)

			outMsg := map[string]interface{}{
				"type":             "message",
				"id":               msgID,
				"from":             userID,
				"to":               receiverID,
				"text":             messageText,
				"timestamp":        time.Now().Format(time.RFC3339),
				"senderUsername":   senderName,
				"receiverUsername": receiverName,
			}

			sendToSingleUser(receiverID, outMsg)
			sendToSingleUser(userID, outMsg)

			sendToSingleUser(receiverID, map[string]interface{}{
				"type":     "notification",
				"receiver": receiverID,
				"from":     userID,
				"message":  "New message",
				"time":     time.Now().Format(time.RFC3339),
			})

		case "typing", "stopTyping":
			receiverID, ok := parseInt(msg["receiver"])
			if !ok {
				continue
			}
			sendToSingleUser(receiverID, map[string]interface{}{
				"type":           msgType,
				"senderId":       userID,
				"senderUsername": msg["senderUsername"],
				"time":           time.Now().Format(time.RFC3339),
			})

		default:
			broadcastToAll(msg)
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
		writeError(w, http.StatusUnauthorized, "Unauthorized. Invalid session.")
		return
	}

	var username string
	_ = db.DataBase.QueryRow("SELECT username FROM users WHERE id = ?", userID).Scan(&username)

	conn, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	addConnection(userID, conn)
	db.DataBase.Exec("UPDATE users SET is_online = TRUE WHERE id = ?", userID)

	broadcastToAll(map[string]interface{}{
		"type":     "online",
		"userId":   userID,
		"username": username,
		"time":     time.Now().Format(time.RFC3339),
	})

	activeConnectionsMu.Lock()
	onlineUserIDs := []int{}
	for id := range activeConnections {
		onlineUserIDs = append(onlineUserIDs, id)
	}
	activeConnectionsMu.Unlock()

	// Get all users marked as online in the database
	rows, err := db.DataBase.Query("SELECT id, username FROM users WHERE is_online = TRUE")
	if err == nil {
		defer rows.Close()
		users := []map[string]interface{}{}
		for rows.Next() {
			var id int
			var username string
			if err := rows.Scan(&id, &username); err == nil {
				users = append(users, map[string]interface{}{
					"id":       id,
					"nickname": username,
					"online":   true,
				})
			}
		}

		_ = conn.WriteJSON(map[string]interface{}{
			"type": "users",
			"data": map[string]interface{}{
				"currentUserId": userID,
				"users":         users,
			},
			"time": time.Now().Format(time.RFC3339),
		})
	}

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
		writeError(w, http.StatusUnauthorized, "Unauthorized. Invalid session.")
		return
	}

	rows, err := db.DataBase.Query(`
		SELECT m.id, m.sender_id, m.receiver_id, m.message, m.created_at, u.username
		FROM messages m
		JOIN users u ON m.sender_id = u.id
		WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
		ORDER BY m.id DESC
		LIMIT 10 OFFSET ?`, senderID, receiverID, receiverID, senderID, offsetID)
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
