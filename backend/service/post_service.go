package service

import (
	"errors"
	"strings"
	"time"

	"forum/backend/models"
	"forum/backend/repository"
	"forum/backend/validation"

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
	
	categories := []string{"Technology","Lifestyle","Gaming","Sports","Music","Movies","Food","Travel","Other"}
	

	for _, category := range input.Categories {
		if !validation.Contains(categories,category){
			return nil , errors.New("category not valid")
		}
		if strings.TrimSpace(category) == "" {
			return nil, errors.New("category cannot be empty")
		}
		if err := s.postRepo.AddCategory(postID, category); err != nil {
			return nil, ErrInternal
		}
	}
	currentTime := time.Now().Format("2006-01-02 15:04:05")

	return &models.PostResponse{
		ID:         postID,
		Nickname:   nickname,
		Categories: input.Categories,
		Time:       currentTime,
	}, nil
}

// GetAllPosts returns posts ordered by newest first.
func (s *PostService) GetAllPosts(limit int) ([]models.Post, error) {
	if limit <= 0 {
		limit = 10
	}

	posts, err := s.postRepo.GetAll(limit)
	if err != nil {
		return nil, ErrInternal
	}
	return posts, nil
}

// GetLikedPosts returns posts liked by the given user
func (s *PostService) GetLikedPosts(userID int) ([]models.Post, error) {
	if userID <= 0 {
		return nil, errors.New("invalid user id")
	}

	posts, err := s.postRepo.GetLikedPosts(userID)
	if err != nil {
		return nil, ErrInternal
	}

	return posts, nil
}

// GetsavedPosts returns posts saved by the given user
func (s *PostService) GetsavedPosts(userID int) ([]models.Post, error) {
	if userID <= 0 {
		return nil, errors.New("invalid user id")
	}

	posts, err := s.postRepo.GetSavededPosts(userID)
	if err != nil {
		return nil, ErrInternal
	}

	return posts, nil
}
