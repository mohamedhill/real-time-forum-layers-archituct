package db

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"

	_ "github.com/mattn/go-sqlite3"
)

var DataBase *sql.DB

func InitDataBase() error {
	var err error

	_, filename, _, _ := runtime.Caller(0)
	dir := filepath.Dir(filename)
	dbPath := filepath.Join(dir, "../db/forum.db")

	DataBase, err = sql.Open("sqlite3", dbPath)
	if err != nil {
		log.Fatal("can't open/create forum.db ", err)
	}

	schemaPath := filepath.Join(dir, "../db/schema.sql")
	schema, err := os.ReadFile(schemaPath)
	if err != nil {
		log.Fatal("can't read schema:", err)
	}

	_, err = DataBase.Exec(string(schema))
	if err != nil {
		return fmt.Errorf("exec schema: %w", err)
	}

	_, err = DataBase.Exec("PRAGMA foreign_keys = ON")
	if err != nil {
		return fmt.Errorf("enable foreign keys: %w", err)
	}

	return nil
}

func CloseDataBase() error {
	if DataBase != nil {
		return DataBase.Close()
	}
	return nil
}
