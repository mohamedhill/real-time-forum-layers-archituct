package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"text/template"
)

// Showhome serves the frontend index.html
func Showhome(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	t, err := template.ParseFiles("frontend/index.html")
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
	fileServer := http.StripPrefix("/static/", http.FileServer(http.Dir("frontend/static")))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		staticPath := strings.TrimPrefix(r.URL.Path, "/static/")
		staticPath = strings.TrimPrefix(staticPath, "/")

		if staticPath == "" {
			writeStyledErrorPage(
				w,
				http.StatusForbidden,
				"403",
				"Access forbidden",
				"You are not allowed to open the static folder directly.",
				"ri-forbid-2-line",
			)
			return
		}

		fullPath := filepath.Join("frontend/static", filepath.Clean(staticPath))
		info, err := os.Stat(fullPath)
		if err == nil && info.IsDir() {
			writeStyledErrorPage(
				w,
				http.StatusForbidden,
				"403",
				"Access forbidden",
				"You are not allowed to open the static folder directly.",
				"ri-forbid-2-line",
			)
			return
		}

		fileServer.ServeHTTP(w, r)
	})
}

func writeStyledErrorPage(w http.ResponseWriter, status int, code string, title string, message string, icon string) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(status)
	fmt.Fprintf(w, `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/remixicon/4.2.0/remixicon.css">
  <link rel="stylesheet" href="/static/css/error.css">
  <title>%s</title>
</head>
<body>
  <div class="error-container">
    <div class="error-content">
      <h1 class="error-code">%s</h1>
      <div class="error-icon">
        <i class="%s"></i>
      </div>
      <h2>%s</h2>
      <p>%s</p>
      <a href="/" class="back-home-btn">
        <i class="ri-home-5-line"></i> Back to Home
      </a>
    </div>
  </div>
</body>
</html>`, title, code, icon, title, message)
}
