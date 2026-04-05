package middleware

import (
	"context"
	"net/http"

	"forum/backend/service"
)

type sessionContextKey string

const sessionUserKey sessionContextKey = "session-user"

type SessionUser struct {
	ID       int
	Nickname string
	Token    string
}

func GetSessionUser(ctx context.Context) (SessionUser, bool) {
	user, ok := ctx.Value(sessionUserKey).(SessionUser)
	return user, ok
}

func RequireSession(sessionService *service.SessionService, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("session")
		if err != nil || cookie.Value == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"error":"unauthorized"}`))
			return
		}

		valid, expired, _, err := sessionService.ValidateSession(cookie.Value)
		if err != nil || !valid {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"error":"invalid session"}`))
			return
		}
		if expired {
			http.SetCookie(w, &http.Cookie{
				Name:     "session",
				Value:    "",
				Path:     "/",
				MaxAge:   -1,
				HttpOnly: true,
			})
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"error":"session expired"}`))
			return
		}

		userID, nickname, err := sessionService.GetUserFromSession(cookie.Value)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"error":"invalid session"}`))
			return
		}

		ctx := context.WithValue(r.Context(), sessionUserKey, SessionUser{
			ID:       userID,
			Nickname: nickname,
			Token:    cookie.Value,
		})
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}
