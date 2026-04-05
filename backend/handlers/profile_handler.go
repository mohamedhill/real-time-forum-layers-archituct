package handlers

import (
	"encoding/json"
	"net/http"

	"forum/backend/service"
)

type ProfileHandler struct {
	profileService *service.ProfileService
}

func NewProfileHandler(profileService *service.ProfileService) *ProfileHandler {
	return &ProfileHandler{profileService: profileService}
}

func (h *ProfileHandler) GetProfileSummary(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	userID, _, ok := getAuthenticatedUser(r)
	if !ok {
		writeError(w, http.StatusInternalServerError, "missing session context")
		return
	}

	profile, err := h.profileService.GetProfileSummary(userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, service.ErrInternal.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(profile)
}
