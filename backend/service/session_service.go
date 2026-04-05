package service

import (
	"database/sql"
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

	userID, nickname, expiry, err := s.userRepo.GetSessionInfo(token)
	if err == sql.ErrNoRows {
		return false, false, "", nil
	}
	if err != nil {
		return false, false, "", err
	}
	if userID <= 0 || !expiry.Valid {
		_ = s.userRepo.ClearSession(token)
		return false, true, "", nil
	}

	if expiry.Time.Before(time.Now()) {
		_ = s.userRepo.ClearSession(token)
		return true, true, "", nil
	}

	return true, false, nickname, nil
}

// GetUserFromSession returns user ID and nickname for a valid session token
func (s *SessionService) GetUserFromSession(token string) (int, string, error) {
	return s.userRepo.GetBySession(token)
}
