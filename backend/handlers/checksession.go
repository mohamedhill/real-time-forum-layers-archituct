package handlers

import (
	"net/http"
)

// CheckSessionHandler handles GET /check-session
type CheckSessionHandler struct{}

func NewCheckSessionHandler() *CheckSessionHandler {
	return &CheckSessionHandler{}
}

func (h *CheckSessionHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	userID, nickname, ok := getAuthenticatedUser(r)
	if !ok {
		writeError(w, http.StatusInternalServerError, "missing session context")
		return
	}

	ResponseJSON(w, http.StatusOK, map[string]interface{}{
		"message":  "session valid",
		"nickname": nickname,
		"userID":   userID,
	})
}
