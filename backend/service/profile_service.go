package service

import (
	"errors"

	"forum/backend/models"
	"forum/backend/repository"
)

type ProfileService struct {
	userRepo *repository.UserRepository
	postRepo *repository.PostRepository
}

func NewProfileService(userRepo *repository.UserRepository, postRepo *repository.PostRepository) *ProfileService {
	return &ProfileService{
		userRepo: userRepo,
		postRepo: postRepo,
	}
}

func (s *ProfileService) GetProfileSummary(userID int) (models.ProfileSummary, error) {
	if userID <= 0 {
		return models.ProfileSummary{}, errors.New("invalid user id")
	}

	profile, err := s.userRepo.GetProfileSummary(userID)
	if err != nil {
		return models.ProfileSummary{}, ErrInternal
	}

	posts, err := s.postRepo.GetByUserID(userID)
	if err != nil {
		return models.ProfileSummary{}, ErrInternal
	}

	profile.Posts = posts

	return profile, nil
}
