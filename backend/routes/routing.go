package routes

import (
	"log"
	"net/http"
	"time"

	"forum/backend/handlers"
	"forum/backend/middleware"
	"forum/backend/repository"
	"forum/backend/service"
)

func Routing() {
	// Repositories (data layer)
	reactionRepo := repository.NewReactionRepository()
	userRepo := repository.NewUserRepository()
	postRepo := repository.NewPostRepository()
	commentRepo := repository.NewCommentRepository()
	messageRepo := repository.NewMessageRepository()

	// Services (business logic layer)
	reactionService := service.NewReactionService(reactionRepo)
	authService := service.NewAuthService(userRepo)
	sessionService := service.NewSessionService(userRepo)
	postService := service.NewPostService(postRepo)
	commentService := service.NewCommentService(commentRepo)
	profileService := service.NewProfileService(userRepo, postRepo)
	messageService := service.NewMessageService(messageRepo)
	webSocketService := service.NewWebSocketService(sessionService)

	// Handlers (presentation layer)
	reactionHandler := handlers.NewReactionHandler(reactionService)
	loginHandler := handlers.NewLoginHandler(authService)
	registerHandler := handlers.NewRegisterHandler(authService)
	logoutHandler := handlers.NewLogoutHandler(authService, webSocketService)
	checkSessionHandler := handlers.NewCheckSessionHandler()
	postHandler := handlers.NewPostHandler(postService)
	commentHandler := handlers.NewCommentHandler(commentService)
	profileHandler := handlers.NewProfileHandler(profileService)
	messageHandler := handlers.NewMessageHandler(messageService, webSocketService)

	apiRateLimiter := middleware.NewRateLimiterManager(500, time.Minute)

	// Routes
	http.HandleFunc("/react", middleware.RateLimitMiddleware(apiRateLimiter, middleware.RequireSession(sessionService, reactionHandler.React)))
	http.HandleFunc("/reaction-counts", middleware.RateLimitMiddleware(apiRateLimiter, middleware.RequireSession(sessionService, reactionHandler.GetCounts)))
	http.Handle("/static/", handlers.StaticHandler())
	http.Handle("/registerAuth", middleware.RateLimitMiddleware(apiRateLimiter, registerHandler.ServeHTTP))
	http.Handle("/loginAuth", middleware.RateLimitMiddleware(apiRateLimiter, loginHandler.ServeHTTP))
	http.Handle("/check-session", middleware.RateLimitMiddleware(apiRateLimiter, middleware.RequireSession(sessionService, checkSessionHandler.ServeHTTP)))
	http.Handle("/logout", middleware.RateLimitMiddleware(apiRateLimiter, logoutHandler.ServeHTTP))
	http.HandleFunc("/", handlers.Showhome)
	http.HandleFunc("/addpost", middleware.RateLimitMiddleware(apiRateLimiter, middleware.RequireSession(sessionService, postHandler.AddPost)))
	http.HandleFunc("/posts", middleware.RateLimitMiddleware(apiRateLimiter, postHandler.GetPosts))
	http.HandleFunc("/ws/messages", middleware.RequireSession(sessionService, messageHandler.ChatWsHandler))
	http.HandleFunc("/liked-posts", middleware.RateLimitMiddleware(apiRateLimiter, middleware.RequireSession(sessionService, postHandler.GetLikedPosts)))
	http.HandleFunc("/saved-posts", middleware.RateLimitMiddleware(apiRateLimiter, middleware.RequireSession(sessionService, postHandler.GetsavedPosts)))
	http.HandleFunc("/profile-data", middleware.RateLimitMiddleware(apiRateLimiter, middleware.RequireSession(sessionService, profileHandler.GetProfileSummary)))
	http.HandleFunc("/addcomment", middleware.RateLimitMiddleware(apiRateLimiter, middleware.RequireSession(sessionService, commentHandler.AddComment)))
	http.HandleFunc("/comments", middleware.RateLimitMiddleware(apiRateLimiter, commentHandler.GetComments))
	http.HandleFunc("/comment-count", middleware.RateLimitMiddleware(apiRateLimiter, commentHandler.GetCommentCount))
	http.HandleFunc("/deletecomment", middleware.RateLimitMiddleware(apiRateLimiter, middleware.RequireSession(sessionService, commentHandler.DeleteComment)))

	log.Println("Server running at http://localhost:8081")
	log.Fatal(http.ListenAndServe(":8081", nil))
}
