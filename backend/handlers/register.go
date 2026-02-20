package handlers

import (
	"errors"
	"net/http"

	"forum/backend/models"
	"forum/backend/service"
)

// RegisterHandler handles POST /registerAuth
type RegisterHandler struct {
	authService *service.AuthService
}

func NewRegisterHandler(authService *service.AuthService) *RegisterHandler {
	return &RegisterHandler{authService: authService}
}

func (h *RegisterHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var user models.User
	if err := decodeJSON(r, &user); err != nil {
		writeError(w, http.StatusBadRequest, "bad request")
		return
	}

	token, err := h.authService.Register(user)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrNicknameExists):
			writeError(w, http.StatusConflict, err.Error())
		case errors.Is(err, service.ErrEmailExists):
			writeError(w, http.StatusConflict, err.Error())
		case errors.Is(err, service.ErrInternal):
			writeError(w, http.StatusInternalServerError, err.Error())
		default:
			// validation errors
			writeError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	setSessionCookie(w, token)
	writeJSON(w, http.StatusCreated, `{"message":"register success"}`)
}
