package handlers

import (
	"encoding/json"
	"net/http"

	"forum/backend/service"
)

// CheckSessionHandler handles GET /check-session
type CheckSessionHandler struct {
	sessionService *service.SessionService
}

func NewCheckSessionHandler(sessionService *service.SessionService) *CheckSessionHandler {
	return &CheckSessionHandler{sessionService: sessionService}
}

func (h *CheckSessionHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	cookie, err := r.Cookie("session")
	if err != nil || cookie.Value == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	exists, expired, nickname, err := h.sessionService.ValidateSession(cookie.Value)
	if err != nil || !exists {
		writeError(w, http.StatusUnauthorized, "invalid session")
		return
	}
	if expired {
		writeError(w, http.StatusUnauthorized, "session expired")
		return
	}

	userID, _, err := h.sessionService.GetUserFromSession(cookie.Value)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid session")
		return
	}

	nicknameJSON, _ := json.Marshal(nickname)
	userIDJSON, _ := json.Marshal(userID)

	body := `{"message":"session valid","nickname":` + string(nicknameJSON) + `,"userID":` + string(userIDJSON) + `}`
	writeJSON(w, http.StatusOK, body)
}
