package routes

import (
	"log"
	"net/http"

	"forum/backend/handlers"
	"forum/backend/repository"
	"forum/backend/service"
)

// Routing wires up all dependencies and registers HTTP routes
func Routing() {
	// Repositories (data layer)
	userRepo := repository.NewUserRepository()
	postRepo := repository.NewPostRepository()

	// Services (business logic layer)
	authService := service.NewAuthService(userRepo)
	sessionService := service.NewSessionService(userRepo)
	postService := service.NewPostService(postRepo)

	// Handlers (presentation layer)
	loginHandler := handlers.NewLoginHandler(authService)
	registerHandler := handlers.NewRegisterHandler(authService)
	logoutHandler := handlers.NewLogoutHandler(authService)
	checkSessionHandler := handlers.NewCheckSessionHandler(sessionService)
	postHandler := handlers.NewPostHandler(postService, sessionService)

	// Routes
	http.Handle("/static/", handlers.StaticHandler())
	http.Handle("/registerAuth", registerHandler)
	http.Handle("/loginAuth", loginHandler)
	http.Handle("/check-session", checkSessionHandler)
	http.Handle("/logout", logoutHandler)
	http.HandleFunc("/", handlers.Showhome)
	http.HandleFunc("/addpost", postHandler.AddPost)
	http.HandleFunc("/posts", postHandler.GetPosts)

	log.Println("Server running at http://localhost:8081")
	log.Fatal(http.ListenAndServe(":8081", nil))
}
