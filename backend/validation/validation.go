package validation

import (
	"regexp"
	"strings"

	"forum/backend/models"
)

// CheckValidity validates a user registration request.
// Returns an empty string if valid, or an error message.
func CheckValidity(user models.User) string {
	user.Nickname = strings.TrimSpace(user.Nickname)
	user.Email = strings.TrimSpace(user.Email)
	user.FirstName = strings.TrimSpace(user.FirstName)
	user.LastName = strings.TrimSpace(user.LastName)

	nicknameRe := regexp.MustCompile(`^[A-Za-z][A-Za-z0-9._]{2,15}$`)
	firstNameRe := regexp.MustCompile(`^[A-Za-z]{2,30}$`)
	lastNameRe := regexp.MustCompile(`^[A-Za-z]{2,30}$`)
	emailRe := regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,63}$`)

	switch {
	case !nicknameRe.MatchString(user.Nickname):
		return "Please choose a valid nickname (3-16 characters, start with a letter)."
	case user.Age < 16 || user.Age > 100:
		return "Please enter a valid age between 16 and 100."
	case !firstNameRe.MatchString(user.FirstName):
		return "Please enter a valid first name (letters only)."
	case !lastNameRe.MatchString(user.LastName):
		return "Please enter a valid last name (letters only)."
	case len(user.Email) > 254 || !emailRe.MatchString(user.Email):
		return "Please enter a valid email address."
	case len(user.Password) < 6 || len(user.Password) > 20:
		return "Password must be 6-20 characters long."
	}
	return ""
}


func Contains(slice []string, target string) bool {
	for _, v := range slice {
		if v == target {
			return true
		}
	}
	return false
}