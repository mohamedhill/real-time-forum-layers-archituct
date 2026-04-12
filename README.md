# Real-Time Forum

A full-stack forum application built with a layered architecture.

The project combines:
- a Go backend
- a vanilla JavaScript frontend
- SQLite for persistence
- cookie-based session authentication
- WebSockets for real-time chat and presence

The main goal of this codebase is not only to provide forum features, but also to show how to organize a project with clear separation of concerns across backend and frontend layers.

## Features

Users can:
- register and log in
- create posts with categories
- like, dislike, and save posts
- add and delete comments
- view liked posts
- view saved posts
- view a profile summary
- chat with other users in real time
- load message history in pages
- see user online and offline presence

## Tech Stack

Backend:
- Go `1.24`
- `net/http`
- `github.com/mattn/go-sqlite3`
- `github.com/gorilla/websocket`

Frontend:
- vanilla JavaScript
- custom SPA-style router
- modular controllers, models, and views

Database:
- SQLite

## Architecture

The backend follows this flow:

`Route -> Middleware -> Handler -> Service -> Repository -> Database`

The frontend follows this flow:

`Router -> Controller -> Model -> View`

This keeps responsibilities separated:
- routes compose the application
- middleware handles cross-cutting concerns like auth and rate limiting
- handlers translate HTTP and WebSocket requests into application actions
- services contain business rules
- repositories isolate SQL access
- frontend controllers coordinate page behavior
- frontend models handle data access and client-side state
- frontend views render UI

## Project Structure

```text
backend/
  cmd/
    main.go
  database/
    database.go
  db/
    schema.sql
  handlers/
    checksession.go
    comment_handler.go
    creatposthandler.go
    helpers.go
    login.go
    logout.go
    messagesHandler.go
    profile_handler.go
    reaction_handler.go
    register.go
    servefiles.go
  middleware/
    rate_limit.go
    session_auth.go
  models/
    models.go
  repository/
    comment_repository.go
    message_repository.go
    post_repository.go
    reaction_repository.go
    user_repository.go
  routes/
    routing.go
  service/
    action_service.go
    auth_service.go
    comment_service.go
    message_service.go
    post_service.go
    profile_service.go
    session_service.go
  validation/
    validation.go

frontend/
  index.html
  static/
    css/
    img/
    javascript/
      components/
      controllers/
      helpers/
      models/
      navigation/
      router/
      views/
    main.js
```

## Backend Layers

### Routes

File:
- [backend/routes/routing.go](/home/mhilli/gitea/real-time-forum/backend/routes/routing.go)

This is the backend composition root. It:
- creates repositories
- creates services
- creates handlers
- wires endpoints
- applies session and rate-limit middleware

### Middleware

Files:
- [backend/middleware/session_auth.go](/home/mhilli/gitea/real-time-forum/backend/middleware/session_auth.go)
- [backend/middleware/rate_limit.go](/home/mhilli/gitea/real-time-forum/backend/middleware/rate_limit.go)

Responsibilities:
- validate session cookies
- inject authenticated user info into request context
- protect private routes
- throttle requests

### Handlers

Files:
- [backend/handlers/login.go](/home/mhilli/gitea/real-time-forum/backend/handlers/login.go)
- [backend/handlers/register.go](/home/mhilli/gitea/real-time-forum/backend/handlers/register.go)
- [backend/handlers/logout.go](/home/mhilli/gitea/real-time-forum/backend/handlers/logout.go)
- [backend/handlers/checksession.go](/home/mhilli/gitea/real-time-forum/backend/handlers/checksession.go)
- [backend/handlers/creatposthandler.go](/home/mhilli/gitea/real-time-forum/backend/handlers/creatposthandler.go)
- [backend/handlers/comment_handler.go](/home/mhilli/gitea/real-time-forum/backend/handlers/comment_handler.go)
- [backend/handlers/reaction_handler.go](/home/mhilli/gitea/real-time-forum/backend/handlers/reaction_handler.go)
- [backend/handlers/profile_handler.go](/home/mhilli/gitea/real-time-forum/backend/handlers/profile_handler.go)
- [backend/handlers/messagesHandler.go](/home/mhilli/gitea/real-time-forum/backend/handlers/messagesHandler.go)

Responsibilities:
- validate request method
- decode inputs
- read authenticated user from context when needed
- call services
- write JSON or upgrade to WebSocket

### Services

Files:
- [backend/service/auth_service.go](/home/mhilli/gitea/real-time-forum/backend/service/auth_service.go)
- [backend/service/session_service.go](/home/mhilli/gitea/real-time-forum/backend/service/session_service.go)
- [backend/service/post_service.go](/home/mhilli/gitea/real-time-forum/backend/service/post_service.go)
- [backend/service/comment_service.go](/home/mhilli/gitea/real-time-forum/backend/service/comment_service.go)
- [backend/service/action_service.go](/home/mhilli/gitea/real-time-forum/backend/service/action_service.go)
- [backend/service/profile_service.go](/home/mhilli/gitea/real-time-forum/backend/service/profile_service.go)
- [backend/service/message_service.go](/home/mhilli/gitea/real-time-forum/backend/service/message_service.go)

Responsibilities:
- validate and create users
- validate sessions
- create posts and enforce content rules
- toggle reactions with business rules
- create and delete comments
- assemble profile summaries
- build chat user snapshots, history payloads, and outgoing message payloads

### Repositories

Files:
- [backend/repository/user_repository.go](/home/mhilli/gitea/real-time-forum/backend/repository/user_repository.go)
- [backend/repository/post_repository.go](/home/mhilli/gitea/real-time-forum/backend/repository/post_repository.go)
- [backend/repository/comment_repository.go](/home/mhilli/gitea/real-time-forum/backend/repository/comment_repository.go)
- [backend/repository/reaction_repository.go](/home/mhilli/gitea/real-time-forum/backend/repository/reaction_repository.go)
- [backend/repository/message_repository.go](/home/mhilli/gitea/real-time-forum/backend/repository/message_repository.go)

Responsibilities:
- run SQL queries
- return plain model data
- hide schema details from handlers

### Models

File:
- [backend/models/models.go](/home/mhilli/gitea/real-time-forum/backend/models/models.go)

Contains shared backend data such as:
- `User`
- `Post`
- `Comment`
- `ReactionState`
- `ProfileSummary`
- `ChatMessage`
- `ChatUser`

## Frontend Layers

### Router

Files:
- [frontend/static/main.js](/home/mhilli/gitea/real-time-forum/frontend/static/main.js)
- [frontend/static/javascript/router/router.js](/home/mhilli/gitea/real-time-forum/frontend/static/javascript/router/router.js)

Responsibilities:
- listen for route changes
- map paths to controller functions
- guard private pages through `AuthController.guardRoute(...)`

### Controllers

Files:
- [frontend/static/javascript/controllers/AuthController.js](/home/mhilli/gitea/real-time-forum/frontend/static/javascript/controllers/AuthController.js)
- [frontend/static/javascript/controllers/HomeController.js](/home/mhilli/gitea/real-time-forum/frontend/static/javascript/controllers/HomeController.js)
- [frontend/static/javascript/controllers/PostController.js](/home/mhilli/gitea/real-time-forum/frontend/static/javascript/controllers/PostController.js)
- [frontend/static/javascript/controllers/CommentController.js](/home/mhilli/gitea/real-time-forum/frontend/static/javascript/controllers/CommentController.js)
- [frontend/static/javascript/controllers/ReactionController.js](/home/mhilli/gitea/real-time-forum/frontend/static/javascript/controllers/ReactionController.js)
- [frontend/static/javascript/controllers/LikedController.js](/home/mhilli/gitea/real-time-forum/frontend/static/javascript/controllers/LikedController.js)
- [frontend/static/javascript/controllers/SavedController.js](/home/mhilli/gitea/real-time-forum/frontend/static/javascript/controllers/SavedController.js)
- [frontend/static/javascript/controllers/ProfileController.js](/home/mhilli/gitea/real-time-forum/frontend/static/javascript/controllers/ProfileController.js)
- [frontend/static/javascript/controllers/MessagesController.js](/home/mhilli/gitea/real-time-forum/frontend/static/javascript/controllers/MessagesController.js)

Responsibilities:
- respond to user actions
- coordinate page behavior
- call frontend models
- trigger view rendering
- manage UI state transitions

### Models

Files:
- [frontend/static/javascript/models/AuthModel.js](/home/mhilli/gitea/real-time-forum/frontend/static/javascript/models/AuthModel.js)
- [frontend/static/javascript/models/PostModel.js](/home/mhilli/gitea/real-time-forum/frontend/static/javascript/models/PostModel.js)
- [frontend/static/javascript/models/CommentModel.js](/home/mhilli/gitea/real-time-forum/frontend/static/javascript/models/CommentModel.js)
- [frontend/static/javascript/models/ReactionModel.js](/home/mhilli/gitea/real-time-forum/frontend/static/javascript/models/ReactionModel.js)
- [frontend/static/javascript/models/ProfileModel.js](/home/mhilli/gitea/real-time-forum/frontend/static/javascript/models/ProfileModel.js)
- [frontend/static/javascript/models/MessageModel.js](/home/mhilli/gitea/real-time-forum/frontend/static/javascript/models/MessageModel.js)

Responsibilities:
- call backend APIs
- parse response data
- hold message-specific client state
- normalize chat users and messages

### Views and UI Helpers

Files:
- [frontend/static/javascript/views/AuthView.js](/home/mhilli/gitea/real-time-forum/frontend/static/javascript/views/AuthView.js)
- [frontend/static/javascript/views/HomeView.js](/home/mhilli/gitea/real-time-forum/frontend/static/javascript/views/HomeView.js)
- [frontend/static/javascript/components/componnets.js](/home/mhilli/gitea/real-time-forum/frontend/static/javascript/components/componnets.js)
- [frontend/static/javascript/navigation/Navigation.js](/home/mhilli/gitea/real-time-forum/frontend/static/javascript/navigation/Navigation.js)
- [frontend/static/javascript/helpers/api.js](/home/mhilli/gitea/real-time-forum/frontend/static/javascript/helpers/api.js)

Responsibilities:
- build markup
- update DOM sections
- render home, auth, posts, comments, and chat UI
- provide shared UI helpers

## Main Application Flows

### Authentication

Flow:
1. The user submits login or registration data.
2. The frontend calls an auth model method.
3. The backend handler forwards the input to `AuthService`.
4. The service validates the request and delegates persistence to `UserRepository`.
5. A session token is stored and returned in a cookie.
6. Protected routes are later validated by session middleware.

Important detail:
- the frontend also checks session state with `/check-session` to guard private routes in the SPA

### Posts

Flow:
1. The user opens the post form and submits title, content, and categories.
2. `PostController` calls `PostModel.createPost(...)`.
3. `PostHandler` passes the request to `PostService`.
4. `PostService` validates required fields, limits, and categories.
5. `PostRepository` inserts the post and category relations.
6. The frontend updates the post list.

### Reactions

Supported reactions:
- `like`
- `dislike`
- `save`

Rules:
- `like` and `dislike` are mutually exclusive
- `save` is independent
- clicking the same reaction again toggles it off

### Comments

Comment features:
- create comment
- list comments for a post
- fetch comment counts
- delete owned comments

The comment service validates comment content and the repository handles the actual SQL.

### Profile

The profile page returns:
- nickname
- email
- post count
- liked count
- saved count
- the authenticated user’s own posts

That data is assembled in `ProfileService` and rendered on the frontend profile page.

### Real-Time Messaging

The chat system uses WebSockets at `/ws/messages`.

It supports:
- authenticated WebSocket connections
- active in-memory connection tracking
- online and offline presence broadcast
- direct message delivery
- storing messages in SQLite
- paginated conversation history
- unread message tracking in the frontend

Current message layering:
- `MessageHandler` manages WebSocket request and connection flow
- `MessageService` contains chat business logic and payload building
- `MessageRepository` performs message and chat-related SQL queries
- `MessageModel.js` manages message state on the frontend
- `MessagesController.js` coordinates socket events and chat UI behavior

## Routes

Main HTTP routes:
- `POST /registerAuth`
- `POST /loginAuth`
- `POST /logout`
- `GET /check-session`
- `POST /addpost`
- `GET /posts`
- `POST /react`
- `GET /reaction-counts`
- `POST /addcomment`
- `GET /comments`
- `GET /comment-count`
- `DELETE /deletecomment`
- `GET /liked-posts`
- `GET /saved-posts`
- `GET /profile-data`
- `GET /static/*`

WebSocket route:
- `GET /ws/messages`

## Database

Schema file:
- [backend/db/schema.sql](/home/mhilli/gitea/real-time-forum/backend/db/schema.sql)

Main tables:
- `users`
- `posts`
- `Category`
- `PostCategory`
- `reactions`
- `comments`
- `messages`

Relationships:
- one user can create many posts
- one post can have many comments
- one user can react to many posts
- one user can exchange messages with many other users

## Running the Project

From the project root:

```bash
go run ./backend/cmd
```

The server starts on:

```text
http://localhost:8081
```

What happens on startup:
- the SQLite database connection is initialized
- the schema is created if needed
- the HTTP server is started

## Why This Project Uses Layers

The project is intentionally organized to avoid:
- putting SQL inside handlers
- mixing business rules with transport logic
- mixing DOM rendering with API calls
- turning one controller or one handler into the whole application

That separation makes the code easier to:
- read
- extend
- debug
- test
- refactor

## Summary

This project is a layered real-time forum application with:
- authentication and session-based access control
- posts, comments, reactions, liked posts, and saved posts
- profile summaries
- real-time direct messaging
- clear separation between transport, business logic, persistence, and UI layers

It is both a working application and a practical example of layered full-stack project organization.
