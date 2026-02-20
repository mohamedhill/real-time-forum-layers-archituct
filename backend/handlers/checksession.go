package handlers

import (
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

	exists, expired, err := h.sessionService.ValidateSession(cookie.Value)
	if err != nil || !exists {
		writeError(w, http.StatusUnauthorized, "invalid session")
		return
	}
	if expired {
		writeError(w, http.StatusUnauthorized, "session expired")
		return
	}

	writeJSON(w, http.StatusOK, `{"message":"session valid"}`)
}
