package repository

import (
	"database/sql"
	"strings"

	db "forum/backend/database"
	"forum/backend/models"
)

// PostRepository handles all post-related DB operations
type PostRepository struct{}

func NewPostRepository() *PostRepository {
	return &PostRepository{}
}

// Create inserts a new post and returns its ID
func (r *PostRepository) Create(title, content string, userID int) (int64, error) {
	result, err := db.DataBase.Exec(
		`INSERT INTO posts (title, description, userID) VALUES (?, ?, ?)`,
		title, content, userID,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

// AddCategory inserts a category (or ignores if exists) and links it to a post
func (r *PostRepository) AddCategory(postID int64, name string) error {
	_, err := db.DataBase.Exec(
		`INSERT OR IGNORE INTO Category (Name_Category) VALUES (?)`, name,
	)
	if err != nil {
		return err
	}
	_, err = db.DataBase.Exec(
		`INSERT INTO PostCategory (ID_Post, ID_Category) SELECT ?, ID FROM Category WHERE Name_Category = ?`,
		postID, name,
	)
	return err
}

// GetAll returns posts ordered by newest first with pagination
func (r *PostRepository) GetAll(limit int, offset int) ([]models.Post, error) {
	rows, err := db.DataBase.Query(`
        SELECT 
            posts.id, 
            posts.title, 
            posts.description, 
            posts.time, 
            users.nickname,
            GROUP_CONCAT(Category.Name_Category, ',') as categories
        FROM posts
        JOIN users ON posts.userID = users.id
        LEFT JOIN PostCategory ON posts.id = PostCategory.ID_Post
        LEFT JOIN Category ON PostCategory.ID_Category = Category.ID
        GROUP BY posts.id
        ORDER BY posts.time DESC
        LIMIT ? OFFSET ?
    `, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []models.Post
	for rows.Next() {
		var p models.Post
		var categories sql.NullString
		if err := rows.Scan(&p.ID, &p.Title, &p.Content, &p.Time, &p.Nickname, &categories); err != nil {
			continue
		}

		if categories.Valid {
			p.Categories = strings.Split(categories.String, ",")
		} else {
			p.Categories = []string{}
		}

		posts = append(posts, p)
	}
	return posts, nil
}

func (r *PostRepository) GetLikedPosts(userID int) ([]models.Post, error) {
	rows, err := db.DataBase.Query(`
        SELECT 
            posts.id, 
            posts.title, 
            posts.description, 
            posts.time, 
            users.nickname,
            GROUP_CONCAT(Category.Name_Category, ',') as categories
        FROM posts
        JOIN users ON posts.userID = users.id
        JOIN reactions ON posts.id = reactions.postID
        LEFT JOIN PostCategory ON posts.id = PostCategory.ID_Post
        LEFT JOIN Category ON PostCategory.ID_Category = Category.ID
        WHERE reactions.userID = ?
        AND reactions.type = 'like'
        GROUP BY posts.id
        ORDER BY reactions.created_at DESC
    `, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []models.Post

	for rows.Next() {
		var p models.Post
		var categories sql.NullString

		err := rows.Scan(
			&p.ID,
			&p.Title,
			&p.Content,
			&p.Time,
			&p.Nickname,
			&categories,
		)
		if err != nil {
			continue
		}

		if categories.Valid {
			p.Categories = strings.Split(categories.String, ",")
		} else {
			p.Categories = []string{}
		}

		posts = append(posts, p)
	}

	return posts, nil
}

func (r *PostRepository) GetSavededPosts(userID int) ([]models.Post, error) {
	rows, err := db.DataBase.Query(`
        SELECT 
            posts.id, 
            posts.title, 
            posts.description, 
            posts.time, 
            users.nickname,
            GROUP_CONCAT(Category.Name_Category, ',') as categories
        FROM posts
        JOIN users ON posts.userID = users.id
        JOIN reactions ON posts.id = reactions.postID
        LEFT JOIN PostCategory ON posts.id = PostCategory.ID_Post
        LEFT JOIN Category ON PostCategory.ID_Category = Category.ID
        WHERE reactions.userID = ?
        AND reactions.type = 'save'
        GROUP BY posts.id
        ORDER BY reactions.created_at DESC
    `, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []models.Post

	for rows.Next() {
		var p models.Post
		var categories sql.NullString

		err := rows.Scan(
			&p.ID,
			&p.Title,
			&p.Content,
			&p.Time,
			&p.Nickname,
			&categories,
		)
		if err != nil {
			continue
		}

		if categories.Valid {
			p.Categories = strings.Split(categories.String, ",")
		} else {
			p.Categories = []string{}
		}

		posts = append(posts, p)
	}

	return posts, nil
}
