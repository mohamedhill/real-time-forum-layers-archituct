package repository

import (
	"database/sql"

	db "forum/backend/database"
	"forum/backend/models"
)

type MessageRepository struct{}

func NewMessageRepository() *MessageRepository {
	return &MessageRepository{}
}

func (r *MessageRepository) Create(senderID, receiverID int, text string) (int64, error) {
	result, err := db.DataBase.Exec(
		`INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)`,
		senderID, receiverID, text,
	)
	if err != nil {
		return 0, err
	}

	return result.LastInsertId()
}

func (r *MessageRepository) GetConversationMessages(currentUserID, otherUserID, limit, offset int) ([]models.ChatMessage, bool, error) {
	rows, err := db.DataBase.Query(`
		SELECT
			m.id,
			m.sender_id,
			m.receiver_id,
			m.message,
			m.created_at,
			sender.nickname,
			receiver.nickname
		FROM messages m
		JOIN users sender ON sender.id = m.sender_id
		JOIN users receiver ON receiver.id = m.receiver_id
		WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
		ORDER BY m.created_at DESC, m.id DESC
		LIMIT ? OFFSET ?
	`, currentUserID, otherUserID, otherUserID, currentUserID, limit+1, offset)
	if err != nil {
		return nil, false, err
	}
	defer rows.Close()

	messages := []models.ChatMessage{}
	for rows.Next() {
		var message models.ChatMessage
		if err := rows.Scan(
			&message.ID,
			&message.From,
			&message.To,
			&message.Text,
			&message.Timestamp,
			&message.SenderNickname,
			&message.ReceiverNickname,
		); err != nil {
			return nil, false, err
		}
		messages = append(messages, message)
	}
	if err := rows.Err(); err != nil {
		return nil, false, err
	}

	hasMore := len(messages) > limit
	if hasMore {
		messages = messages[:limit]
	}

	for left, right := 0, len(messages)-1; left < right; left, right = left+1, right-1 {
		messages[left], messages[right] = messages[right], messages[left]
	}

	return messages, hasMore, nil
}

func (r *MessageRepository) GetLastConversationMessage(currentUserID, otherUserID int) (string, string, error) {
	var text sql.NullString
	var createdAt sql.NullString

	err := db.DataBase.QueryRow(`
		SELECT message, created_at
		FROM messages
		WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
		ORDER BY created_at DESC, id DESC
		LIMIT 1
	`, currentUserID, otherUserID, otherUserID, currentUserID).Scan(&text, &createdAt)
	if err == sql.ErrNoRows {
		return "", "", nil
	}
	if err != nil {
		return "", "", err
	}

	return text.String, createdAt.String, nil
}

func (r *MessageRepository) GetUsersForChat(currentUserID int) ([]models.ChatUser, error) {
	rows, err := db.DataBase.Query(
		`SELECT id, nickname FROM users WHERE id != ? ORDER BY nickname ASC`,
		currentUserID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := []models.ChatUser{}
	for rows.Next() {
		var user models.ChatUser
		if err := rows.Scan(&user.ID, &user.Nickname); err != nil {
			return nil, err
		}
		users = append(users, user)
	}

	return users, rows.Err()
}
