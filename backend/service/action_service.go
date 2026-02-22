package service

import (
	"errors"

	"forum/backend/models"
	"forum/backend/repository"
)

var ErrInvalidReaction = errors.New("invalid reaction type")

type ReactionService struct {
	repo *repository.ReactionRepository
}

func NewReactionService(r *repository.ReactionRepository) *ReactionService {
	return &ReactionService{repo: r}
}

func (s *ReactionService) ToggleReaction(postID, userID int, t string) error {
	if t != "like" && t != "dislike" && t != "save" {
		return ErrInvalidReaction
	}

	exists, err := s.repo.Exists(postID, userID, t)
	if err != nil {
		return err
	}

	if exists {
		return s.repo.Remove(postID, userID, t)
	}

	if t == "like" {
		s.repo.Remove(postID, userID, "dislike")
	}
	if t == "dislike" {
		s.repo.Remove(postID, userID, "like")
	}

	return s.repo.Add(postID, userID, t)
}

func (s *ReactionService) GetCounts(postID int) (models.ReactionCounts, error) {
	l, d, saves, err := s.repo.Count(postID)
	if err != nil {
		return models.ReactionCounts{}, err
	}

	return models.ReactionCounts{
		Likes:    l,
		Dislikes: d,
		Saves:    saves,
	}, nil
}
