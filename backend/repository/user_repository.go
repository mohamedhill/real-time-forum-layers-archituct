package repository

import (
	"time"

	db "forum/backend/database"
	"forum/backend/models"

	"github.com/gofrs/uuid/v5"
)

// UserRepository handles all user-related DB operations
type UserRepository struct{}

func NewUserRepository() *UserRepository {
	return &UserRepository{}
}

// GetPasswordByIdentifier returns the hashed password for a nickname or email
func (r *UserRepository) GetPasswordByIdentifier(identifier string) (string, error) {
	var hashPass string
	err := db.DataBase.QueryRow(
		`SELECT password FROM users WHERE nickname = ? OR email = ?`,
		identifier, identifier,
	).Scan(&hashPass)
	return hashPass, err
}

// NicknameExists returns true if the nickname is already taken
func (r *UserRepository) NicknameExists(nickname string) (bool, error) {
	var exists bool
	err := db.DataBase.QueryRow(
		`SELECT EXISTS(SELECT 1 FROM users WHERE nickname = ?)`, nickname,
	).Scan(&exists)
	return exists, err
}

// EmailExists returns true if the email is already registered
func (r *UserRepository) EmailExists(email string) (bool, error) {
	var exists bool
	err := db.DataBase.QueryRow(
		`SELECT EXISTS(SELECT 1 FROM users WHERE email = ?)`, email,
	).Scan(&exists)
	return exists, err
}

// Create inserts a new user into the database
func (r *UserRepository) Create(user models.User, hashedPassword string) error {
	_, err := db.DataBase.Exec(
		`INSERT INTO users (nickname, email, password, age, firstname, lastname, gender) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		user.Nickname, user.Email, hashedPassword, user.Age, user.FirstName, user.LastName, user.Gender,
	)
	return err
}

// SetSession creates or updates a session for the user
func (r *UserRepository) SetSession(identifier string) (string, error) {
	sessionID, err := uuid.NewV4()
	if err != nil {
		return "", err
	}
	token := sessionID.String()
	expireTime := time.Now().Add(1 * time.Hour)

	_, err = db.DataBase.Exec(
		`UPDATE users SET dateexpired = ?, session = ? WHERE nickname = ? OR email = ?`,
		expireTime, token, identifier, identifier,
	)
	if err != nil {
		return "", err
	}
	return token, nil
}

// ClearSession removes session token from a user
func (r *UserRepository) ClearSession(token string) error {
	_, err := db.DataBase.Exec(
		`UPDATE users SET session = NULL, dateexpired = NULL WHERE session = ?`, token,
	)
	return err
}

// GetSessionInfo returns user ID, nickname, and expiry for a session token
func (r *UserRepository) GetSessionInfo(token string) (id int, nickname string, expiry time.Time, err error) {
	err = db.DataBase.QueryRow(
		`SELECT id, nickname, dateexpired FROM users WHERE session = ?`, token,
	).Scan(&id, &nickname, &expiry)
	return
}

// SessionExists checks if the session token exists
func (r *UserRepository) SessionExists(token string) (bool, error) {
	var exists bool
	err := db.DataBase.QueryRow(
		`SELECT EXISTS(SELECT 1 FROM users WHERE session = ?)`, token,
	).Scan(&exists)
	return exists, err
}

// GetBySession returns user data from session token (used by middleware)
func (r *UserRepository) GetBySession(token string) (int, string, error) {
	var id int
	var nickname string
	err := db.DataBase.QueryRow(
		`SELECT id, nickname FROM users WHERE session = ?`, token,
	).Scan(&id, &nickname)
	if err != nil {
		return 0, "", err
	}
	return id, nickname, nil
}

// GetSessionExpiry returns session expiry time
func (r *UserRepository) GetSessionExpiry(token string) (time.Time, error) {
	var expiry time.Time
	err := db.DataBase.QueryRow(
		`SELECT dateexpired FROM users WHERE session = ?`, token,
	).Scan(&expiry)
	return expiry, err
}


func (r *UserRepository) GetNicknameBySession(token string) (string, error) {
	var nickname string
	err := db.DataBase.QueryRow(
		`SELECT nickname FROM users WHERE session = ?`, token,
	).Scan(&nickname)

	if err != nil {
		return "", err
	}

	return nickname, nil
}