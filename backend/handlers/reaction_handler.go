package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"forum/backend/models"
	"forum/backend/service"
)

type ReactionHandler struct {
	reactionService *service.ReactionService
	sessionService  *service.SessionService
}

func NewReactionHandler(rs *service.ReactionService, ss *service.SessionService) *ReactionHandler {
	return &ReactionHandler{rs, ss}
}

func (h *ReactionHandler) React(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, 405, "method not allowed")
		return
	}

	cookie, err := r.Cookie("session")
	if err != nil {
		writeError(w, 401, "unauthorized")
		return
	}

	userID, _, err := h.sessionService.GetUserFromSession(cookie.Value)
	if err != nil {
		writeError(w, 401, "unauthorized")
		return
	}
	var input models.ReactionInput
	if err := decodeJSON(r, &input); err != nil {

		writeError(w, 400, "bad request")
		return
	}
	postID, err := strconv.Atoi(input.PostID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid postId")
		return
	}

	err = h.reactionService.ToggleReaction(postID, userID, input.Type)
	if err != nil {

		switch {
		case errors.Is(err, service.ErrInvalidReaction):
			writeError(w, 400, err.Error())
		default:
			writeError(w, 500, service.ErrInternal.Error())
		}
		return
	}
	w.WriteHeader(200)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func (h *ReactionHandler) GetCounts(w http.ResponseWriter, r *http.Request) {
	postID, _ := strconv.Atoi(r.URL.Query().Get("postId"))

	counts, err := h.reactionService.GetCounts(postID)
	if err != nil {

		writeError(w, 500, service.ErrInternal.Error())
		return
	}

	json.NewEncoder(w).Encode(counts)
}
