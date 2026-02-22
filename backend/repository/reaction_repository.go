package repository

import (
	db "forum/backend/database"
)

type ReactionRepository struct{}

func NewReactionRepository() *ReactionRepository {
	return &ReactionRepository{}
}

func (r *ReactionRepository) Add(postID, userID int, t string) error {
	_, err := db.DataBase.Exec(`
        INSERT INTO reactions(postID,userID,type)
        VALUES(?,?,?)`, postID, userID, t)
	return err
}

func (r *ReactionRepository) Remove(postID, userID int, t string) error {
	_, err := db.DataBase.Exec(`
        DELETE FROM reactions
        WHERE postID=? AND userID=? AND type=?`,
		postID, userID, t)
	return err
}

func (r *ReactionRepository) Exists(postID, userID int, t string) (bool, error) {
	var count int
	err := db.DataBase.QueryRow(`
        SELECT COUNT(1)
        FROM reactions
        WHERE postID=? AND userID=? AND type=?`,
		postID, userID, t).Scan(&count)

	return count > 0, err
}

func (r *ReactionRepository) Count(postID int) (int, int, int, error) {
	var like, dislike, save int
	err := db.DataBase.QueryRow(`
        SELECT
            IFNULL(SUM(type='like'),0),
            IFNULL(SUM(type='dislike'),0),
            IFNULL(SUM(type='save'),0)
        FROM reactions
        WHERE postID=?`,
		postID).Scan(&like, &dislike, &save)
	return like, dislike, save, err
}
