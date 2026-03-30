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
	commentRepo := repository.NewCommentRepository()

	// Services (business logic layer)
	reactionService := service.NewReactionService(reactionRepo)
	authService := service.NewAuthService(userRepo)
	sessionService := service.NewSessionService(userRepo)
	postService := service.NewPostService(postRepo)
	commentService := service.NewCommentService(commentRepo)

	// Handlers (presentation layer)
	reactionHandler := handlers.NewReactionHandler(reactionService, sessionService)
	loginHandler := handlers.NewLoginHandler(authService)
	registerHandler := handlers.NewRegisterHandler(authService)
	logoutHandler := handlers.NewLogoutHandler(authService)
	checkSessionHandler := handlers.NewCheckSessionHandler(sessionService)
	postHandler := handlers.NewPostHandler(postService, sessionService)
	commentHandler := handlers.NewCommentHandler(commentService, sessionService)
	//chatHandler := handlers.NewChatHandler(sessionService)

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
	http.HandleFunc("/ws/messages", handlers.ChatWsHandler)
	http.HandleFunc("/liked-posts",postHandler.GetLikedPosts)
	http.HandleFunc("/saved-posts",postHandler.GetsavedPosts)
	http.HandleFunc("/addcomment", commentHandler.AddComment)
	http.HandleFunc("/comments", commentHandler.GetComments)
	http.HandleFunc("/comment-count", commentHandler.GetCommentCount)
	http.HandleFunc("/deletecomment", commentHandler.DeleteComment)


	log.Println("Server running at http://localhost:8081")
	log.Fatal(http.ListenAndServe(":8081", nil))
}
