package middleware

import (
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"
)

type RateLimit struct {
	Count        int
	BlockedUntil time.Time
	FirstTime    time.Time
	UserIP       string
}

type RateLimiterManager struct {
	limits map[string]*RateLimit
	mu     sync.Mutex
	Limit  int
	Window time.Duration
}

func NewRateLimiterManager(limit int, window time.Duration) *RateLimiterManager {
	return &RateLimiterManager{
		limits: make(map[string]*RateLimit),
		Limit:  limit,
		Window: window,
	}
}

// Check checks if the given IP address has exceeded the rate limit.
func (m *RateLimiterManager) Check(ip string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now()
	rl, exists := m.limits[ip]

	if !exists {
		m.limits[ip] = &RateLimit{
			Count:        1,
			FirstTime:    now,
			BlockedUntil: time.Time{},
			UserIP:       ip,
		}
		return true
	}

	if now.Before(rl.BlockedUntil) {
		return false
	}

	if !rl.FirstTime.IsZero() && now.Sub(rl.FirstTime) >= m.Window {
		rl.Count = 0
		rl.FirstTime = now
		rl.BlockedUntil = time.Time{}
	}

	if now.After(rl.BlockedUntil) && rl.Count > m.Limit {
		rl.Count = 0
		rl.FirstTime = now
		rl.BlockedUntil = time.Time{}
	}

	rl.Count++

	if rl.Count > m.Limit {
		rl.BlockedUntil = now.Add(m.Window)
		return false
	}

	return true
}

func GetUserIP(r *http.Request) string {
	ipPort := r.RemoteAddr
	ip := strings.Split(ipPort, ":")[0]
	return ip
}

// RateLimitMiddleware is a middleware that limits the number of requests from a single IP address within a specified time window.
func RateLimitMiddleware(manager *RateLimiterManager, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ip := GetUserIP(r)

		if !manager.Check(ip) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			w.Write([]byte(fmt.Sprintf(`{"error":%q}`, "Too many requests slow down")))
			return
		}

		next.ServeHTTP(w, r)
	}
}
