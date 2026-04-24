package service

import (
	"database/sql"
	"errors"
	"strings"

	"forum/backend/models"
	"forum/backend/repository"
	"forum/backend/validation"

	"golang.org/x/crypto/bcrypt"
)

// Sentinel errors for the auth service
var (
	ErrPostNotExist = errors.New("post does not exist")
	ErrMethodNotAllowed   = errors.New("method not allowed")
	ErrEmptyFields        = errors.New("some fields are empty")
	ErrInvalidCredentials = errors.New("incorrect credentials, please try again")
	ErrNicknameExists     = errors.New("this nickname is already taken. Please choose another one")
	ErrEmailExists        = errors.New("this email is already registered. Please use a different one")
	ErrInternal           = errors.New("something went wrong. Please try again later")
)

// AuthService handles authentication business logic
type AuthService struct {
	userRepo *repository.UserRepository
}

func NewAuthService(userRepo *repository.UserRepository) *AuthService {
	return &AuthService{userRepo: userRepo}
}

// Login validates credentials and returns a session token
func (s *AuthService) Login(input models.LoginInput) (string, error) {
	identifier := strings.TrimSpace(input.Identifier)
	password := strings.TrimSpace(input.Password)

	if identifier == "" || password == "" {
		return "", ErrEmptyFields
	}

	hashPass, err := s.userRepo.GetPasswordByIdentifier(identifier)
	if err == sql.ErrNoRows {
		return "", ErrInvalidCredentials
	} else if err != nil {
		return "", ErrInternal
	}

	if bcrypt.CompareHashAndPassword([]byte(hashPass), []byte(password)) != nil {
		return "", ErrInvalidCredentials
	}

	token, err := s.userRepo.SetSession(identifier)
	if err != nil {
		return "", ErrInternal
	}
	return token, nil
}

// Register validates and creates a new user, returns session token
func (s *AuthService) Register(user models.User) (string, error) {
	if validationErr := validation.CheckValidity(user); validationErr != "" {
		return "", errors.New(validationErr)
	}

	nicknameExists, err := s.userRepo.NicknameExists(user.Nickname)
	if err != nil {
		return "", ErrInternal
	}
	if nicknameExists {
		return "", ErrNicknameExists
	}

	emailExists, err := s.userRepo.EmailExists(user.Email)
	if err != nil {
		return "", ErrInternal
	}
	if emailExists {
		return "", ErrEmailExists
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		return "", ErrInternal
	}

	if err := s.userRepo.Create(user, string(hashedPassword)); err != nil {
		return "", ErrInternal
	}

	token, err := s.userRepo.SetSession(user.Nickname)
	if err != nil {
		return "", ErrInternal
	}
	return token, nil
}

// Logout clears the user's session
func (s *AuthService) Logout(token string) error {
	if token == "" {
		return nil
	}
	return s.userRepo.ClearSession(token)
}
