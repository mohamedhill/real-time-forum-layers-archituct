package handlers

import (
	"database/sql"
	"encoding/json"
	db "forum/backend/database"
	"net/http"
	"sync"
	"time"

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

func addConnection(userID int, nickname string, conn *websocket.Conn) *SafeConn {
	activeConnectionsMu.Lock()
	defer activeConnectionsMu.Unlock()

	sc := &SafeConn{Conn: conn}
	activeConnections[userID] = append(activeConnections[userID], sc)
	usernames[userID] = nickname
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

func handleUserMessages(userID int, conn *websocket.Conn, dbConn *sql.DB) {
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

func ChatWsHandler(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserFromSession(r, db.DataBase)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var nickname string
	db.DataBase.QueryRow("SELECT nickname FROM users WHERE id = ?", userID).Scan(&nickname)

	conn, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	safeConn := addConnection(userID, nickname, conn)

	db.DataBase.Exec("UPDATE users SET is_online = TRUE WHERE id = ?", userID)

	go broadcastToAll(map[string]interface{}{
		"type":     "online",
		"id":       userID,
		"nickname": nickname,
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

	_ = safeConn.WriteJSON(map[string]interface{}{
		"type": "users",
		"data": map[string]interface{}{
			"currentUserId": userID,
			"users":         users,
		},
	})

	handleUserMessages(userID, conn, db.DataBase)
}
