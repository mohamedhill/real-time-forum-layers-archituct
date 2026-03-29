package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"forum/backend/models"
	"forum/backend/service"
)

// CommentHandler handles comment creation and retrieval
type CommentHandler struct {
	commentService *service.CommentService
	sessionService *service.SessionService
}

func NewCommentHandler(commentService *service.CommentService, sessionService *service.SessionService) *CommentHandler {
	return &CommentHandler{commentService: commentService, sessionService: sessionService}
}

// AddComment handles POST /addcomment
func (h *CommentHandler) AddComment(w http.ResponseWriter, r *http.Request) {
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

	var input models.CommentInput
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "bad request: "+err.Error())
		return
	}

	if input.PostID == 0 || input.Content == "" {
		writeError(w, http.StatusBadRequest, "postID and content are required")
		return
	}

	comment, err := h.commentService.CreateComment(input, userID, nickname)
	if err != nil {
		writeError(w, http.StatusInternalServerError, service.ErrInternal.Error())
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(comment)
}

// GetComments handles GET /comments?postId=x
func (h *CommentHandler) GetComments(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	w.Header().Set("Content-Type", "application/json")

	postIDStr := r.URL.Query().Get("postId")
	if postIDStr == "" {
		writeError(w, http.StatusBadRequest, "postId is required")
		return
	}

	postID, err := strconv.Atoi(postIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid postId")
		return
	}

	comments, err := h.commentService.GetCommentsByPostID(postID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, service.ErrInternal.Error())
		return
	}

	// Return empty array instead of null if no comments
	if comments == nil {
		comments = []models.Comment{}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(comments)
}

// GetCommentCount handles GET /comment-count?postId=x
func (h *CommentHandler) GetCommentCount(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	w.Header().Set("Content-Type", "application/json")

	postIDStr := r.URL.Query().Get("postId")
	if postIDStr == "" {
		writeError(w, http.StatusBadRequest, "postId is required")
		return
	}

	postID, err := strconv.Atoi(postIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid postId")
		return
	}

	count, err := h.commentService.GetCommentCount(postID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, service.ErrInternal.Error())
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]int{"count": count})
}

// DeleteComment handles DELETE /deletecomment?commentId=x
func (h *CommentHandler) DeleteComment(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
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

	commentIDStr := r.URL.Query().Get("commentId")
	if commentIDStr == "" {
		writeError(w, http.StatusBadRequest, "commentId is required")
		return
	}

	commentID, err := strconv.Atoi(commentIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid commentId")
		return
	}

	err = h.commentService.DeleteComment(commentID, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, service.ErrInternal.Error())
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "comment deleted"})
}
