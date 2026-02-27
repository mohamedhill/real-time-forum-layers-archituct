package routes

import (
	"log"
	"net/http"

	"forum/backend/handlers"
	"forum/backend/repository"
	"forum/backend/service"
)


func Routing() {
	// Repositories (data layer)
    reactionRepo := repository.NewReactionRepository()
	userRepo := repository.NewUserRepository()
	postRepo := repository.NewPostRepository()

	// Services (business logic layer)
    reactionService := service.NewReactionService(reactionRepo)
	authService := service.NewAuthService(userRepo)
	sessionService := service.NewSessionService(userRepo)
	postService := service.NewPostService(postRepo)

	// Handlers (presentation layer)
    reactionHandler := handlers.NewReactionHandler(reactionService, sessionService)
	loginHandler := handlers.NewLoginHandler(authService)
	registerHandler := handlers.NewRegisterHandler(authService)
	logoutHandler := handlers.NewLogoutHandler(authService)
	checkSessionHandler := handlers.NewCheckSessionHandler(sessionService)
	postHandler := handlers.NewPostHandler(postService, sessionService)

	// Routes
	http.HandleFunc("/react", reactionHandler.React)
    http.HandleFunc("/reaction-counts", reactionHandler.GetCounts)
	http.Handle("/static/", handlers.StaticHandler())
	http.Handle("/registerAuth", registerHandler)
	http.Handle("/loginAuth", loginHandler)
	http.Handle("/check-session", checkSessionHandler)
	http.Handle("/logout", logoutHandler)
	http.HandleFunc("/", handlers.Showhome)
	http.HandleFunc("/addpost", postHandler.AddPost)
	http.HandleFunc("/posts", postHandler.GetPosts)
	http.HandleFunc("/liked-posts",postHandler.GetLikedPosts)
	http.HandleFunc("/saved-posts",postHandler.GetsavedPosts)


	log.Println("Server running at http://localhost:8081")
	log.Fatal(http.ListenAndServe(":8081", nil))
}
