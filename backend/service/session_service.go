package service

import (
	"time"

	"forum/backend/repository"
)

// SessionService handles session validation
type SessionService struct {
	userRepo *repository.UserRepository
}

func NewSessionService(userRepo *repository.UserRepository) *SessionService {
	return &SessionService{userRepo: userRepo}
}

// ValidateSession checks if a session token is valid and not expired.
// Returns (valid bool, expired bool, err error).
func (s *SessionService) ValidateSession(token string) (bool, bool, string, error) {
	if token == "" {
		return false, false, "", nil
	}

	exists, err := s.userRepo.SessionExists(token)
	if err != nil || !exists {
		return false, false, "", err
	}

	expiry, err := s.userRepo.GetSessionExpiry(token)
	if err != nil {
		return false, false, "", err
	}

	if expiry.Before(time.Now()) {
		_ = s.userRepo.ClearSession(token)
		return true, true, "", nil
	}

	nickname, err := s.userRepo.GetNicknameBySession(token)
	if err != nil {
		return false, false, "", err
	}

	return true, false, nickname, nil
}

// GetUserFromSession returns user ID and nickname for a valid session token
func (s *SessionService) GetUserFromSession(token string) (int, string, error) {
	return s.userRepo.GetBySession(token)
}
