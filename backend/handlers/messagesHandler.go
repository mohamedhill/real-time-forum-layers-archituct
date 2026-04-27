package handlers

import (
	"encoding/json"
	"net/http"

	"forum/backend/middleware"
	"forum/backend/service"

	"github.com/gorilla/websocket"
)

var wsUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type MessageHandler struct {
	messageService   *service.MessageService
	webSocketService *service.WebSocketService
}

func NewMessageHandler(messageService *service.MessageService, webSocketService *service.WebSocketService) *MessageHandler {
	return &MessageHandler{
		messageService:   messageService,
		webSocketService: webSocketService,
	}
}

func (h *MessageHandler) handleUserMessages(userID int, conn *websocket.Conn, safeConn *service.SafeConn) {
	defer func() {
		h.webSocketService.RemoveConnection(userID, conn)
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

			senderName := h.webSocketService.GetUsername(userID)
			receiverName := h.webSocketService.GetUsername(receiverID)

			out, err := h.messageService.CreateMessage(userID, receiverID, text, senderName, receiverName)
			if err != nil {
				h.webSocketService.SendToSingleUser(userID, map[string]interface{}{
					"type": "error",
					"data": map[string]interface{}{
						"message": err.Error(),
					},
				})
				continue
			}

			h.webSocketService.SendToSingleUser(receiverID, out)
			h.webSocketService.SendToSingleUser(userID, out)

		case "typing", "stopTyping":
			receiverID, ok := parseInt(msg["receiver"])
			if !ok {
				continue
			}

			h.webSocketService.SendToSingleUser(receiverID, map[string]interface{}{
				"type":           msg["type"],
				"senderId":       userID,
				"senderNickname": h.webSocketService.GetUsername(userID),
			})
		}
	}
}

func (h *MessageHandler) sendUsersSnapshot(conn *service.SafeConn, userID int) error {
	users, err := h.messageService.GetUsersSnapshot(userID, h.webSocketService.GetOnlineUsersSnapshot())
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

	safeConn := h.webSocketService.AddConnection(sessionUser, conn)

	userID := sessionUser.ID
	nickname := sessionUser.Nickname

	go h.webSocketService.BroadcastToAll(map[string]interface{}{
		"type":     "online",
		"id":       userID,
		"nickname": nickname,
	})

	_ = h.sendUsersSnapshot(safeConn, userID)

	h.handleUserMessages(userID, conn, safeConn)
}
