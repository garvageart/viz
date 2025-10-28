package auth

import (
	"encoding/hex"
	"imagine/internal/utils"
)

func GenerateAuthToken() string {
	tokenBytes := utils.GenerateRandomBytes(48)
	return hex.EncodeToString(tokenBytes)
}
