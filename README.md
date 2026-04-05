# Real-Time Forum Layers Architecture

This project is a small forum application built to show a layered architecture from end to end.

It combines:
- a Go backend
- a vanilla JavaScript frontend
- SQLite for persistence
- cookie-based session authentication
- WebSockets for real-time messaging and online presence

The main idea is to keep responsibilities separated:
- the frontend handles rendering, navigation, and user interactions
- handlers translate HTTP requests into application actions
- services contain business logic
- repositories talk to the database

## Project Idea

The application lets users:
- register and log in
- create posts
- react to posts with like, dislike, and save
- add and delete comments
- view liked and saved posts
- view a profile summary and their own posts
- chat with other users in real time

It is not just a forum UI. The codebase is also meant to represent how features can be organized in layers instead of placing everything inside handlers or frontend event files.

## Architecture

The backend follows a layered flow:

`Route -> Middleware -> Handler -> Service -> Repository -> Database`

Each layer has a different role.

### 1. Routes

Files:
- [backend/routes/routing.go](real-time-forum-layers-archituct/backend/routes/routing.go)

The routing layer:
- creates repositories
- creates services
- creates handlers
- wires routes to handlers
- applies middleware such as rate limiting and session protection

This file is the composition root of the backend.

### 2. Middleware

Files:
- [backend/middleware/session_auth.go](real-time-forum-layers-archituct/backend/middleware/session_auth.go)
- [backend/middleware/rate_limit.go](real-time-forum-layers-archituct/backend/middleware/rate_limit.go)

Middleware runs before handlers.

Important logic:
- `RequireSession(...)` validates the session cookie
- if the session is valid, it stores the authenticated user in request context
- protected handlers do not need to validate the session again

That means session checking is centralized in middleware.

### 3. Handlers

Files:
- [backend/handlers/login.go](real-time-forum-layers-archituct/backend/handlers/login.go)
- [backend/handlers/register.go](real-time-forum-layers-archituct/backend/handlers/register.go)
- [backend/handlers/creatposthandler.go](real-time-forum-layers-archituct/backend/handlers/creatposthandler.go)
- [backend/handlers/comment_handler.go](real-time-forum-layers-archituct/backend/handlers/comment_handler.go)
- [backend/handlers/reaction_handler.go](real-time-forum-layers-archituct/backend/handlers/reaction_handler.go)
- [backend/handlers/profile_handler.go](real-time-forum-layers-archituct/backend/handlers/profile_handler.go)
- [backend/handlers/messagesHandler.go](real-time-forum-layers-archituct/backend/handlers/messagesHandler.go)

Handlers are responsible for:
- checking HTTP method
- decoding request data
- reading authenticated user from middleware context when needed
- calling the right service
- returning JSON responses and status codes

Handlers should not contain database queries directly.

### 4. Services

Files:
- [backend/service/auth_service.go](real-time-forum-layers-archituct/backend/service/auth_service.go)
- [backend/service/session_service.go](real-time-forum-layers-archituct/backend/service/session_service.go)
- [backend/service/post_service.go](real-time-forum-layers-archituct/backend/service/post_service.go)
- [backend/service/comment_service.go](real-time-forum-layers-archituct/backend/service/comment_service.go)
- [backend/service/action_service.go](real-time-forum-layers-archituct/backend/service/action_service.go)
- [backend/service/profile_service.go](real-time-forum-layers-archituct/backend/service/profile_service.go)

Services contain application logic such as:
- validating login and registration behavior
- toggling reactions correctly
- creating posts with category rules
- assembling a profile summary with user posts

This layer is where the business rules live.

### 5. Repositories

Files:
- [backend/repository/user_repository.go](real-time-forum-layers-archituct/backend/repository/user_repository.go)
- [backend/repository/post_repository.go](real-time-forum-layers-archituct/backend/repository/post_repository.go)
- [backend/repository/comment_repository.go](real-time-forum-layers-archituct/backend/repository/comment_repository.go)
- [backend/repository/reaction_repository.go](real-time-forum-layers-archituct/backend/repository/reaction_repository.go)

Repositories isolate SQL access.

They are responsible for:
- querying and updating SQLite
- returning plain model data
- hiding table details from handlers and most service code

### 6. Models

Files:
- [backend/models/models.go](real-time-forum-layers-archituct/backend/models/models.go)

Models define shared data structures such as:
- `User`
- `Post`
- `Comment`
- `ReactionState`
- `ProfileSummary`

## Frontend Structure

The frontend follows a similar separation, but for UI concerns:

`Router -> Controller -> Model -> View`

### Router

Files:
- [frontend/static/main.js](real-time-forum-layers-archituct/frontend/static/main.js)
- [frontend/static/javascript/router/router.js](real-time-forum-layers-archituct/frontend/static/javascript/router/router.js)

The router:
- listens to navigation events
- matches paths
- calls the correct controller
- protects routes with `AuthController.guardRoute(...)`

### Controllers

Files:
- [frontend/static/javascript/controllers/AuthController.js](real-time-forum-layers-archituct/frontend/static/javascript/controllers/AuthController.js)
- [frontend/static/javascript/controllers/HomeController.js](real-time-forum-layers-archituct/frontend/static/javascript/controllers/HomeController.js)
- [frontend/static/javascript/controllers/PostController.js](real-time-forum-layers-archituct/frontend/static/javascript/controllers/PostController.js)
- [frontend/static/javascript/controllers/CommentController.js](real-time-forum-layers-archituct/frontend/static/javascript/controllers/CommentController.js)
- [frontend/static/javascript/controllers/ReactionController.js](real-time-forum-layers-archituct/frontend/static/javascript/controllers/ReactionController.js)
- [frontend/static/javascript/controllers/ProfileController.js](real-time-forum-layers-archituct/frontend/static/javascript/controllers/ProfileController.js)
- [frontend/static/javascript/controllers/MessagesController.js](real-time-forum-layers-archituct/frontend/static/javascript/controllers/MessagesController.js)

Controllers:
- react to UI events
- call models for API data
- tell views what to render
- coordinate page-level behavior

### Models

Files:
- [frontend/static/javascript/models/AuthModel.js](real-time-forum-layers-archituct/frontend/static/javascript/models/AuthModel.js)
- [frontend/static/javascript/models/PostModel.js](real-time-forum-layers-archituct/frontend/static/javascript/models/PostModel.js)
- [frontend/static/javascript/models/CommentModel.js](real-time-forum-layers-archituct/frontend/static/javascript/models/CommentModel.js)
- [frontend/static/javascript/models/ReactionModel.js](real-time-forum-layers-archituct/frontend/static/javascript/models/ReactionModel.js)
- [frontend/static/javascript/models/ProfileModel.js](real-time-forum-layers-archituct/frontend/static/javascript/models/ProfileModel.js)

Frontend models are thin API clients.

They:
- send `fetch` requests
- normalize API responses
- avoid touching the DOM

### Views

Files:
- [frontend/static/javascript/views/AuthView.js](real-time-forum-layers-archituct/frontend/static/javascript/views/AuthView.js)
- [frontend/static/javascript/views/HomeView.js](real-time-forum-layers-archituct/frontend/static/javascript/views/HomeView.js)
- [frontend/static/javascript/components/componnets.js](real-time-forum-layers-archituct/frontend/static/javascript/components/componnets.js)

Views are responsible for:
- building DOM structures
- rendering posts, comments, and profile UI
- keeping layout and markup concerns out of API code

## Core Logic

### Authentication and Session Logic

Flow:
1. The user submits login or registration data.
2. The backend validates credentials or user data.
3. On success, the backend creates a session token and stores it in the `users` table.
4. The backend sends the token in an HTTP-only cookie.
5. Protected routes use middleware to validate the session cookie.
6. Middleware injects the authenticated user into request context.
7. Handlers read the authenticated user from context.

Important design choice:
- session validation is centralized in middleware, not repeated in every handler

Frontend route protection:
- [AuthController.js](real-time-forum-layers-archituct/frontend/static/javascript/controllers/AuthController.js) uses `guardRoute(...)`
- `guardRoute(...)` calls `/check-session`
- if the session is valid, it stores `window.currentUser` and `window.currentUserId`
- if not valid, protected pages redirect to `/login`

### Post Logic

Flow:
1. The user creates a post in the modal.
2. The frontend sends `title`, `content`, and selected categories.
3. The backend service validates the post.
4. The post is inserted into `posts`.
5. Categories are linked through `Category` and `PostCategory`.
6. The frontend inserts the new post card into the page immediately after success.

Home feed logic:
- the main feed supports pagination with limit and offset
- liked posts and saved posts are separate filtered views

### Reaction Logic

Supported reactions:
- `like`
- `dislike`
- `save`

Rules:
- `like` and `dislike` are mutually exclusive
- `save` is independent

The reaction service handles the rule set:
- if a user likes a post they already liked, it removes the like
- if they dislike after liking, the old opposite reaction is removed first
- save acts as a simple toggle

### Comment Logic

Comment features:
- create comment
- list comments by post
- fetch comment count
- delete comment

The delete logic uses the authenticated user so only the correct owner can remove a comment.

### Profile Logic

The profile page combines:
- nickname
- email
- counts for posts, liked posts, and saved posts
- the authenticated user’s own posts

This logic is assembled in the backend profile service, then rendered in the frontend profile page using the same post card UI used by the main feed.

### Real-Time Messaging Logic

The chat system uses WebSockets:
- clients connect to `/ws/messages`
- middleware ensures only authenticated users can connect
- active connections are stored in memory
- user online/offline state is broadcast
- direct messages are stored in the database and pushed in real time
- history can be requested in pages

This gives the app:
- online user presence
- direct user-to-user messages
- conversation history loading

## Database Design

Schema file:
- [backend/db/schema.sql](real-time-forum-layers-archituct/backend/db/schema.sql)

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
- one post can have many categories
- one post can have many comments
- one user can react to many posts
- messages connect one sender and one receiver

## Request Flow Example

### Example: Add Comment

1. The user submits a comment from the frontend.
2. `CommentController` calls `CommentModel.createComment(...)`.
3. The browser sends `POST /addcomment`.
4. The route passes through session middleware.
5. Middleware validates the session and adds user data to request context.
6. `CommentHandler.AddComment(...)` reads the authenticated user from context.
7. `CommentService.CreateComment(...)` validates the input.
8. `CommentRepository` inserts the record.
9. The handler returns JSON.
10. The frontend updates the comment list and count.

This pattern is repeated across most features.

## Why This Project Is Called "Layers Architecture"

Because the important architectural idea is separation of concerns.

Instead of:
- putting SQL inside handlers
- putting business rules inside routes
- mixing rendering with API calls

the project tries to separate:
- HTTP concerns
- business rules
- database concerns
- UI rendering
- API communication

That separation makes the code easier to:
- extend
- debug
- test
- refactor

## Running the Project

From the project root:

```bash
go run ./backend/cmd
```

The server:
- initializes the SQLite database
- loads the schema if needed
- starts the HTTP server on `http://localhost:8081`

## Main Folders

```text
backend/
  cmd/            application entry point
  database/       DB initialization and connection
  db/             schema.sql
  handlers/       HTTP and WebSocket handlers
  middleware/     auth and rate limiting
  models/         shared backend data structures
  repository/     SQL access
  routes/         route wiring
  service/        business logic
  validation/     registration validation

frontend/
  static/
    css/          styles
    img/          images
    javascript/
      components/ reusable markup generators
      controllers/page and feature logic
      helpers/    small shared frontend utilities
      models/     API calls
      navigation/ navigation helpers
      router/     SPA router
      views/      DOM rendering
    main.js       frontend entry point
```

## Current Strengths

- clear backend layering
- session auth centralized in middleware
- frontend route guard centralized in auth controller
- reusable post rendering
- real-time messaging integrated with the same auth system

## Current Tradeoffs

- some files are still large, especially the messages controller
- naming is not fully consistent in all files
- some modules mix multiple responsibilities more than ideal
- the README describes the intended structure, but there is still room for cleanup in implementation details

## Summary

This project is a layered real-time forum application.

Its main logic is:
- authenticate users with cookie sessions
- protect routes with middleware
- manage features through services
- persist data with repositories
- render pages through frontend controllers, models, and views
- support real-time user chat with WebSockets

The architecture matters as much as the features: the project is a practical example of how to organize a full-stack app into layers.
