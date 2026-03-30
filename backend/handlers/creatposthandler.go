package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

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
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	limit := 10
	offset := 0

	if raw := r.URL.Query().Get("limit"); raw != "" {
		value, err := strconv.Atoi(raw)
		if err != nil || value <= 0 {
			writeError(w, http.StatusBadRequest, "invalid limit")
			return
		}
		limit = value
	}

	if raw := r.URL.Query().Get("offset"); raw != "" {
		value, err := strconv.Atoi(raw)
		if err != nil || value < 0 {
			writeError(w, http.StatusBadRequest, "invalid offset")
			return
		}
		offset = value
	}

	posts, err := h.postService.GetAllPosts(limit, offset)
	if err != nil {
		writeError(w, http.StatusInternalServerError, service.ErrInternal.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
}

// GetLikedPosts handles GET /liked-posts
func (h *PostHandler) GetLikedPosts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	w.Header().Set("Content-Type", "application/json")

	cookie, err := r.Cookie("session")
	if err != nil || cookie.Value == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	userID, _, err := h.sessionService.GetUserFromSession(cookie.Value)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	posts, err := h.postService.GetLikedPosts(userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, service.ErrInternal.Error())
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(posts)
}

func (h *PostHandler) GetsavedPosts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	w.Header().Set("Content-Type", "application/json")

	cookie, err := r.Cookie("session")
	if err != nil || cookie.Value == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	userID, _, err := h.sessionService.GetUserFromSession(cookie.Value)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	posts, err := h.postService.GetsavedPosts(userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, service.ErrInternal.Error())
		return
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(posts)
}
