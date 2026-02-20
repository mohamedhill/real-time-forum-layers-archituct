package handlers

import (
	"net/http"
	"text/template"
)

// Showhome serves the frontend index.html
func Showhome(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	t, err := template.ParseFiles("../../frontend/index.html")
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	if err = t.Execute(w, nil); err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
}

// StaticHandler serves static frontend files
func StaticHandler() http.Handler {
	return http.StripPrefix("/static/", http.FileServer(http.Dir("../../frontend/static")))
}
