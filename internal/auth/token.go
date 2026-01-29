package auth

import (
	"encoding/hex"
	"viz/internal/crypto"
)

func GenerateAuthToken() string {
	tokenBytes := crypto.MustGenerateRandomBytes(48)
	return hex.EncodeToString(tokenBytes)
}
