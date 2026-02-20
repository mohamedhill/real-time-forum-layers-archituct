package handlers

import (
	"errors"
	"net/http"

	"forum/backend/models"
	"forum/backend/service"
)

// LoginHandler handles POST /loginAuth
type LoginHandler struct {
	authService *service.AuthService
}

func NewLoginHandler(authService *service.AuthService) *LoginHandler {
	return &LoginHandler{authService: authService}
}

func (h *LoginHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var input models.LoginInput
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "incorrect credentials, please try again")
		return
	}

	token, err := h.authService.Login(input)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrEmptyFields):
			writeError(w, http.StatusBadRequest, err.Error())
		case errors.Is(err, service.ErrInvalidCredentials):
			writeError(w, http.StatusUnauthorized, err.Error())
		default:
			writeError(w, http.StatusInternalServerError, service.ErrInternal.Error())
		}
		return
	}

	setSessionCookie(w, token)
	writeJSON(w, http.StatusOK, `{"message":"login success"}`)
}
