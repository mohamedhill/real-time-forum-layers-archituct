package handlers

import (
	"net/http"

	"forum/backend/service"
)

// LogoutHandler handles POST /logout
type LogoutHandler struct {
	authService *service.AuthService
}

func NewLogoutHandler(authService *service.AuthService) *LogoutHandler {
	return &LogoutHandler{authService: authService}
}

func (h *LogoutHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	if cookie, err := r.Cookie("session"); err == nil {
		_ = h.authService.Logout(cookie.Value)
		CloseConnectionsForSession(cookie.Value)
	}

	clearSessionCookie(w)
	writeJSON(w, http.StatusOK, `{"message":"logout success"}`)
}
