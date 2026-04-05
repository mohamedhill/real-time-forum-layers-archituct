package models

import "github.com/gofrs/uuid/v5"

// User represents a registered user
type User struct {
	ID        int       `json:"id"`
	Nickname  string    `json:"nickname"`
	Age       int       `json:"age"`
	Gender    string    `json:"gender"`
	FirstName string    `json:"firstName"`
	LastName  string    `json:"lastName"`
	Email     string    `json:"email"`
	Password  string    `json:"password"`
	UUID      uuid.UUID `json:"uuid"`
}

// LoginInput holds login form data
type LoginInput struct {
	Identifier string `json:"identifier"`
	Password   string `json:"password"`
}

// PostInput holds new post form data
type PostInput struct {
	Title      string   `json:"title"`
	Content    string   `json:"content"`
	Categories []string `json:"categories"`
}

// Post represents a forum post
type Post struct {
	ID         int      `json:"id"`
	Title      string   `json:"title"`
	Content    string   `json:"content"`
	Time       string   `json:"time"`
	Nickname   string   `json:"nickname"`
	UserID     int      `json:"userID"`
	Categories []string `json:"categories"`
}

// PostResponse is returned after creating a post
type PostResponse struct {
	ID         int64    `json:"id"`
	Nickname   string   `json:"nickname"`
	Time       string   `json:"time"`
	Categories []string `json:"categories"`
}

// Session holds session data
type Session struct {
	UserID    int
	Nickname  string
	ExpiresAt string
}

type ReactionInput struct {
	PostID string `json:"postId"`
	Type   string `json:"type"`
}

type ReactionState struct {
	Likes      int  `json:"likes"`
	Dislikes   int  `json:"dislikes"`
	Saves      int  `json:"saves"`
	IsLiked    bool `json:"isliked"`
	IsDisliked bool `json:"isdisliked"`
	IsSaved    bool `json:"issaved"`
}

// Comment represents a comment on a post
type Comment struct {
	ID       int    `json:"id"`
	PostID   int    `json:"postID"`
	UserID   int    `json:"userID"`
	Nickname string `json:"nickname"`
	Content  string `json:"content"`
	Time     string `json:"time"`
}

// CommentInput holds new comment form data
type CommentInput struct {
	PostID  int    `json:"postID"`
	Content string `json:"content"`
}

type ProfileSummary struct {
	Nickname   string `json:"nickname"`
	Email      string `json:"email"`
	PostCount  int    `json:"postCount"`
	LikedCount int    `json:"likedCount"`
	SavedCount int    `json:"savedCount"`
	Posts      []Post `json:"posts"`
}
