package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
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

func GetUserFromSession(r *http.Request, db *sql.DB) (int, error) {
	cookie, err := r.Cookie("session")
	if err != nil {
		return 0, err
	}

	sessionToken := cookie.Value

	var userID int

	err = db.QueryRow(`
        SELECT id
        FROM users
        WHERE session = ?
        AND dateexpired > CURRENT_TIMESTAMP
    `, sessionToken).Scan(&userID)
	if err != nil {
		return 0, err
	}

	return userID, nil
}
