package main

import (
	"log"

	db "forum/backend/database"
	routing "forum/backend/routes"
)

func main() {
	if err := db.InitDataBase(); err != nil {
		log.Fatal("Database init failed:", err)
	}
	defer db.CloseDataBase()

	routing.Routing()
}
