package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"forum/backend/middleware"
)

// writeJSON writes a raw JSON string with a status code
func writeJSON(w http.ResponseWriter, status int, body string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write([]byte(body))
}

// writeError writes a JSON error response
func writeError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write([]byte(fmt.Sprintf(`{"error":%q}`, message)))
}

// ResponseJSON writes an arbitrary object as JSON with the given status code
func ResponseJSON(w http.ResponseWriter, status int, body interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

// decodeJSON decodes request body into target struct
func decodeJSON(r *http.Request, target interface{}) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(target)
}

// setSessionCookie sets the session cookie on the response
func setSessionCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		MaxAge:   3600,
		SameSite: http.SameSiteLaxMode,
	})
}

// clearSessionCookie removes the session cookie
func clearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
	})
}

func getAuthenticatedUser(r *http.Request) (int, string, bool) {
	user, ok := middleware.GetSessionUser(r.Context())
	if !ok {
		return 0, "", false
	}
	return user.ID, user.Nickname, true
}

// parseInt parses an interface{} value to int, handling JSON unmarshaling types
func parseInt(v interface{}) (int, bool) {
	switch val := v.(type) {
	case float64:
		return int(val), true
	case int:
		return val, true
	default:
		return 0, false
	}
}

// parseOptionalInt parses an optional interface{} value to int
func parseOptionalInt(v interface{}) (int, bool) {
	if v == nil {
		return 0, false
	}
	return parseInt(v)
}
