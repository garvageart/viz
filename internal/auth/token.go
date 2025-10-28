package auth

import (
	"encoding/hex"
	"imagine/internal/utils"
	"net/http"
	"time"
)

func GenerateAuthToken() string {
	tokenBytes := utils.GenerateRandomBytes(48)
	return hex.EncodeToString(tokenBytes)
}

func CreateAuthTokenCookie(expireTime time.Time, token string) *http.Cookie {
	return &http.Cookie{
		Name:     utils.AuthTokenCookie,
		Value:    token,
		Expires:  expireTime,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
	}
}
