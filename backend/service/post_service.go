package service

import (
	"errors"
	"strings"

	"forum/backend/models"
	"forum/backend/repository"
)

// PostService handles post-related business logic
type PostService struct {
	postRepo *repository.PostRepository
}

func NewPostService(postRepo *repository.PostRepository) *PostService {
	return &PostService{postRepo: postRepo}
}

// CreatePost validates and creates a new post with its categories
func (s *PostService) CreatePost(input models.PostInput, userID int, nickname string) (*models.PostResponse, error) {
	if strings.TrimSpace(input.Title) == "" || strings.TrimSpace(input.Content) == "" {
		return nil, ErrEmptyFields
	}
	if len([]rune(input.Title)) > 50 || len([]rune(input.Content)) > 1000 {
		return nil, errors.New("title or content exceeds maximum length")
	}

	postID, err := s.postRepo.Create(input.Title, input.Content, userID)
	if err != nil {
		return nil, ErrInternal
	}

	for _, category := range input.Categories {
		if strings.TrimSpace(category) == "" {
			return nil, errors.New("category cannot be empty")
		}
		if err := s.postRepo.AddCategory(postID, category); err != nil {
			return nil, ErrInternal
		}
	}

	return &models.PostResponse{
		ID:         postID,
		Nickname:   nickname,
		Categories: input.Categories,
	}, nil
}

// GetAllPosts returns all posts
func (s *PostService) GetAllPosts() ([]models.Post, error) {
	posts, err := s.postRepo.GetAll()
	if err != nil {
		return nil, ErrInternal
	}
	return posts, nil
}
