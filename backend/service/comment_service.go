package service

import (
	"errors"
	"strings"
	"time"

	"forum/backend/models"
	"forum/backend/repository"
)

// CommentService handles comment-related business logic
type CommentService struct {
	commentRepo *repository.CommentRepository
}

func NewCommentService(commentRepo *repository.CommentRepository) *CommentService {
	return &CommentService{commentRepo: commentRepo}
}

// CreateComment validates and creates a new comment
func (s *CommentService) CreateComment(input models.CommentInput, userID int, nickname string) (*models.Comment, error) {
	if strings.TrimSpace(input.Content) == "" {
		return nil, errors.New("comment cannot be empty")
	}
	if len([]rune(input.Content)) > 1000 {
		return nil, errors.New("comment exceeds maximum length")
	}

	commentID, err := s.commentRepo.Create(input.PostID, userID, input.Content)
	if err != nil {
		return nil, ErrInternal
	}

	currentTime := time.Now().Format("2006-01-02 15:04:05")

	return &models.Comment{
		ID:       int(commentID),
		PostID:   input.PostID,
		UserID:   userID,
		Nickname: nickname,
		Content:  input.Content,
		Time:     currentTime,
	}, nil
}

// GetCommentsByPostID retrieves all comments for a post
func (s *CommentService) GetCommentsByPostID(postID int) ([]models.Comment, error) {
	return s.commentRepo.GetByPostID(postID)
}

// GetCommentCount returns the number of comments for a post
func (s *CommentService) GetCommentCount(postID int) (int, error) {
	return s.commentRepo.GetCommentCount(postID)
}

// DeleteComment removes a comment if the user owns it
func (s *CommentService) DeleteComment(commentID, userID int) error {
	return s.commentRepo.Delete(commentID, userID)
}
