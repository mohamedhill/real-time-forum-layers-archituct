package service

import (
	"sync"

	"forum/backend/models"

	"github.com/gorilla/websocket"
)

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

type WebSocketService struct {
	activeConnections   map[int][]*SafeConn
	usernames           map[int]string
	activeConnectionsMu sync.RWMutex
	sessionService      *SessionService
}

func NewWebSocketService(sessionService *SessionService) *WebSocketService {
	return &WebSocketService{
		activeConnections: make(map[int][]*SafeConn),
		usernames:         make(map[int]string),
		sessionService:    sessionService,
	}
}

func (ws *WebSocketService) AddConnection(user models.SessionUser, conn *websocket.Conn) *SafeConn {
	ws.activeConnectionsMu.Lock()
	defer ws.activeConnectionsMu.Unlock()

	sc := &SafeConn{
		Conn:  conn,
		Token: user.Token,
	}
	ws.activeConnections[user.ID] = append(ws.activeConnections[user.ID], sc)
	ws.usernames[user.ID] = user.Nickname

	// Set user online
	ws.sessionService.SetUserOnline(user.ID)

	return sc
}

func (ws *WebSocketService) RemoveConnection(userID int, conn *websocket.Conn) {
	ws.activeConnectionsMu.Lock()
	defer ws.activeConnectionsMu.Unlock()

	conns := ws.activeConnections[userID]
	for i, c := range conns {
		if c.Conn == conn {
			ws.activeConnections[userID] = append(conns[:i], conns[i+1:]...)
			break
		}
	}
	if len(ws.activeConnections[userID]) == 0 {
		delete(ws.activeConnections, userID)
		delete(ws.usernames, userID)

		// Set user offline
		ws.sessionService.SetUserOffline(userID)
	}
}

func (ws *WebSocketService) CloseConnectionsForSession(token string) {
	if token == "" {
		return
	}

	ws.activeConnectionsMu.RLock()
	toClose := make([]struct {
		userID int
		conn   *websocket.Conn
	}, 0)
	for userID, conns := range ws.activeConnections {
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
	ws.activeConnectionsMu.RUnlock()

	for _, item := range toClose {
		_ = item.conn.Close()
		ws.RemoveConnection(item.userID, item.conn)
	}
}

func (ws *WebSocketService) SendToSingleUser(userID int, payload map[string]interface{}) {
	ws.activeConnectionsMu.RLock()
	conns := append([]*SafeConn{}, ws.activeConnections[userID]...)
	ws.activeConnectionsMu.RUnlock()

	for _, conn := range conns {
		if err := conn.WriteJSON(payload); err != nil {
			conn.Conn.Close()
			ws.RemoveConnection(userID, conn.Conn)
		}
	}
}

func (ws *WebSocketService) BroadcastToAll(payload map[string]interface{}) {
	ws.activeConnectionsMu.RLock()
	all := []*SafeConn{}
	for _, conns := range ws.activeConnections {
		all = append(all, conns...)
	}
	ws.activeConnectionsMu.RUnlock()

	for _, conn := range all {
		if err := conn.WriteJSON(payload); err != nil {
			conn.Conn.Close()
		}
	}
}

func (ws *WebSocketService) GetOnlineUsersSnapshot() map[int]bool {
	ws.activeConnectionsMu.RLock()
	defer ws.activeConnectionsMu.RUnlock()

	onlineUsers := make(map[int]bool, len(ws.activeConnections))
	for id, conns := range ws.activeConnections {
		onlineUsers[id] = len(conns) > 0
	}

	return onlineUsers
}

func (ws *WebSocketService) GetUsername(userID int) string {
	ws.activeConnectionsMu.RLock()
	defer ws.activeConnectionsMu.RUnlock()
	return ws.usernames[userID]
}
