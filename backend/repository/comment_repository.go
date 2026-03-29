package repository

import (
	

	db "forum/backend/database"
	"forum/backend/models"
)


type CommentRepository struct{}

func NewCommentRepository() *CommentRepository {
	return &CommentRepository{}
}

// Create inserts a new comment and returns its ID
func (r *CommentRepository) Create(postID, userID int, content string) (int64, error) {
	result, err := db.DataBase.Exec(
		`INSERT INTO comments (postID, userID, content) VALUES (?, ?, ?)`,
		postID, userID, content,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

// GetByPostID returns all comments for a specific post
func (r *CommentRepository) GetByPostID(postID int) ([]models.Comment, error) {
	rows, err := db.DataBase.Query(`
        SELECT 
            comments.id, 
            comments.postID, 
            comments.userID, 
            comments.content, 
            comments.created_at,
            users.nickname
        FROM comments
        JOIN users ON comments.userID = users.id
        WHERE comments.postID = ?
        ORDER BY comments.created_at DESC
    `, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []models.Comment
	for rows.Next() {
		var c models.Comment
		if err := rows.Scan(&c.ID, &c.PostID, &c.UserID, &c.Content, &c.Time, &c.Nickname); err != nil {
			continue
		}
		comments = append(comments, c)
	}
	return comments, nil
}

// GetCommentCount returns the number of comments for a post
func (r *CommentRepository) GetCommentCount(postID int) (int, error) {
	var count int
	err := db.DataBase.QueryRow(
		`SELECT COUNT(*) FROM comments WHERE postID = ?`,
		postID,
	).Scan(&count)
	return count, err
}

//removes a comment 
func (r *CommentRepository) Delete(commentID, userID int) error {
	_, err := db.DataBase.Exec(
		`DELETE FROM comments WHERE id = ? AND userID = ?`,
		commentID, userID,
	)
	return err
}
