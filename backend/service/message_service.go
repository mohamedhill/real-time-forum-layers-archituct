package service

import (
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"forum/backend/models"
	"forum/backend/repository"
)

const maxMessageLength = 500

type MessageService struct {
	messageRepo *repository.MessageRepository
}

func NewMessageService(messageRepo *repository.MessageRepository) *MessageService {
	return &MessageService{messageRepo: messageRepo}
}

func (s *MessageService) GetUsersSnapshot(currentUserID int, onlineUsers map[int]bool) ([]map[string]interface{}, error) {
	users, err := s.messageRepo.GetUsersForChat(currentUserID)
	if err != nil {
		return nil, ErrInternal
	}

	payload := make([]map[string]interface{}, 0, len(users))
	for _, user := range users {
		lastMessage, lastMessageTime, err := s.messageRepo.GetLastConversationMessage(currentUserID, user.ID)
		if err != nil {
			return nil, ErrInternal
		}

		payload = append(payload, map[string]interface{}{
			"id":              user.ID,
			"nickname":        user.Nickname,
			"online":          onlineUsers[user.ID],
			"lastMessageText": lastMessage,
			"lastMessageTime": lastMessageTime,
		})
	}

	return payload, nil
}

func (s *MessageService) GetConversationHistory(currentUserID, otherUserID, limit, lastIndex int) ([]models.ChatMessage, bool, error) {
	if currentUserID <= 0 || otherUserID <= 0 {
		return nil, false, errors.New("invalid user id")
	}
	if limit <= 0 {
		limit = 10
	}
	if lastIndex < 0 {
		lastIndex = 0
	}

	return s.messageRepo.GetConversationMessages(currentUserID, otherUserID, limit, lastIndex)
}

func (s *MessageService) CreateMessage(senderID, receiverID int, text, senderNickname, receiverNickname string) (map[string]interface{}, error) {
	if senderID <= 0 || receiverID <= 0 {
		return nil, errors.New("invalid user id")
	}
	if senderID == receiverID {
		return nil, errors.New("you cannot send a message to yourself")
	}

	text = strings.TrimSpace(text)
	if text == "" {
		return nil, errors.New("message cannot be empty")
	}
	if utf8.RuneCountInString(text) > maxMessageLength {
		return nil, errors.New("message cannot be more than 500 characters")
	}

	messageID, err := s.messageRepo.Create(senderID, receiverID, text)
	if err != nil {
		return nil, ErrInternal
	}

	return map[string]interface{}{
		"type":             "message",
		"id":               int(messageID),
		"from":             senderID,
		"to":               receiverID,
		"text":             text,
		"senderNickname":   senderNickname,
		"receiverNickname": receiverNickname,
		"time":             time.Now(),
	}, nil
}

func (s *MessageService) BuildMessagePayloads(messages []models.ChatMessage) []map[string]interface{} {
	payloads := make([]map[string]interface{}, 0, len(messages))
	for _, message := range messages {
		payloads = append(payloads, map[string]interface{}{
			"id":               message.ID,
			"from":             message.From,
			"to":               message.To,
			"text":             message.Text,
			"time":             message.Timestamp,
			"senderNickname":   message.SenderNickname,
			"receiverNickname": message.ReceiverNickname,
		})
	}
	return payloads
}
