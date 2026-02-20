package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"forum/backend/models"
	"forum/backend/service"
)

// PostHandler handles post creation and retrieval
type PostHandler struct {
	postService    *service.PostService
	sessionService *service.SessionService
}

func NewPostHandler(postService *service.PostService, sessionService *service.SessionService) *PostHandler {
	return &PostHandler{postService: postService, sessionService: sessionService}
}

// AddPost handles POST /addpost
func (h *PostHandler) AddPost(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	w.Header().Set("Content-Type", "application/json")

	cookie, err := r.Cookie("session")
	if err != nil || cookie.Value == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	userID, nickname, err := h.sessionService.GetUserFromSession(cookie.Value)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var input models.PostInput
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "bad request")
		return
	}

	response, err := h.postService.CreatePost(input, userID, nickname)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrEmptyFields):
			writeError(w, http.StatusBadRequest, err.Error())
		default:
			writeError(w, http.StatusInternalServerError, service.ErrInternal.Error())
		}
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// GetPosts handles GET /posts
func (h *PostHandler) GetPosts(w http.ResponseWriter, r *http.Request) {
	posts, err := h.postService.GetAllPosts()
	if err != nil {
		writeError(w, http.StatusInternalServerError, service.ErrInternal.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
}
