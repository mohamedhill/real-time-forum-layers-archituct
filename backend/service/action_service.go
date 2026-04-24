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

postExists, err := s.repo.PostExists(postID)
	if err != nil {
		return err
	}
	if !postExists {
		return ErrPostNotExist
	}
		
	if t == "save" {
		exists, err := s.repo.Exists(postID, userID, "save")
		if err != nil {
			return err
		}

		if exists {
			return s.repo.Remove(postID, userID, "save")
		}
		return s.repo.Add(postID, userID, "save")
	}

	

	exists, err := s.repo.Exists(postID, userID, t)
	if err != nil {
		return err
	}

	
	if exists {
		return s.repo.Remove(postID, userID, t)
	}

	
	opposite := "like"
	if t == "like" {
		opposite = "dislike"
	}

	if err := s.repo.Remove(postID, userID, opposite); err != nil {
		return err
	}


	return s.repo.Add(postID, userID, t)
}

func (s *ReactionService) GetFullState(postID, userID int) (models.ReactionState, error) {
	l, d, sCount, isL, isD, isS, err := s.repo.CountWithUser(postID, userID)
	if err != nil {
		return models.ReactionState{}, err
	}

	return models.ReactionState{
		Likes:       l,
		Dislikes:    d,
		Saves:       sCount,
		IsLiked:     isL,
		IsDisliked:  isD,
		IsSaved:     isS,
	}, nil
}