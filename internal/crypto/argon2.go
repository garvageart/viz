package crypto

import (
	"bytes"
	"encoding/hex"
	"errors"
	"strings"

	"golang.org/x/crypto/argon2"
)

const ArgonV2Prefix = "v2"

type Argon2Hash struct {
	// time represents the number of
	// passed over the specified memory.
	time uint32
	// cpu memory to be used.
	memory uint32
	// threads for parallelism aspect
	// of the algorithm.
	threads uint8
	// keyLen of the generate hash key.
	keyLen uint32
	// saltLen the length of the salt used.
	saltLen int
}

func (a Argon2Hash) GenerateSalt() []byte {
	return MustGenerateRandomBytes(a.saltLen)
}

func (a Argon2Hash) Hash(password, salt []byte) (hash []byte, err error) {
	if len(salt) == 0 {
		return nil, errors.New("empty salt")
	}

	hash = argon2.IDKey(password, salt, a.time, a.memory, a.threads, a.keyLen)
	return hash, nil
}

func (a Argon2Hash) Verify(hashedValue []byte, password string) bool {
	salt := hashedValue[a.saltLen+len(":") : a.saltLen+len(":")+int(a.keyLen)]
	hash, _ := a.Hash([]byte(password), salt)

	return bytes.Equal(hashedValue[a.saltLen+len(":")+int(a.keyLen):], hash)
}

func CreateArgon2Hash(time uint32, saltLen int, memory uint32, threads uint8, keyLen uint32) *Argon2Hash {
	return &Argon2Hash{
		time:    time,
		saltLen: saltLen,
		memory:  memory,
		threads: threads,
		keyLen:  keyLen,
	}
}

// Default parameters for new hashes (v2) - Fallbacks if config is invalid
const (
	DefaultArgon2KeyLen  = 32
	DefaultArgon2SaltLen = 32
)

// V1 Params
const (
	LegacyArgon2Time    = 3
	LegacyArgon2Memory  = 2
	LegacyArgon2Threads = 32
	LegacyArgon2KeyLen  = 16
	LegacyArgon2SaltLen = 32
)

type Argon2Params struct {
	MemoryMB int
	Time     int
	Threads  int
}

// DefaultArgon2Params provides secure defaults (RFC 9106)
var DefaultArgon2Params = Argon2Params{
	MemoryMB: 64,
	Time:     3,
	Threads:  4,
}

func HashPassword(password string, params *Argon2Params) (string, error) {
	if params == nil {
		params = &DefaultArgon2Params
	}

	timeCost := uint32(params.Time)
	if timeCost == 0 {
		timeCost = 3
	}

	memMB := uint32(params.MemoryMB)
	if memMB == 0 {
		memMB = 64
	}
	memory := memMB * 1024

	threads := uint8(params.Threads)
	if threads == 0 {
		threads = 4
	}

	argon := CreateArgon2Hash(timeCost, DefaultArgon2SaltLen, memory, threads, DefaultArgon2KeyLen)
	salt := argon.GenerateSalt()
	hash, err := argon.Hash([]byte(password), salt)
	if err != nil {
		return "", err
	}

	// Format: v2:hex(salt):hex(hash)
	return ArgonV2Prefix + ":" + hex.EncodeToString(salt) + ":" + hex.EncodeToString(hash), nil
}

func VerifyPassword(hashedPassword, password string, params *Argon2Params) (bool, error) {
	parts := strings.Split(hashedPassword, ":")

	var argon *Argon2Hash
	var saltHex, hashHex string

	if len(parts) == 3 && parts[0] == ArgonV2Prefix {
		if params == nil {
			params = &DefaultArgon2Params
		}

		timeCost := uint32(params.Time)
		if timeCost == 0 {
			timeCost = 3
		}

		memMB := uint32(params.MemoryMB)
		if memMB == 0 {
			memMB = 64
		}
		memory := memMB * 1024

		threads := uint8(params.Threads)
		if threads == 0 {
			threads = 4
		}

		argon = CreateArgon2Hash(timeCost, DefaultArgon2SaltLen, memory, threads, DefaultArgon2KeyLen)
		saltHex = parts[1]
		hashHex = parts[2]
	} else if len(parts) == 2 {
		// v1 hash: hex(salt):hex(hash)
		argon = CreateArgon2Hash(LegacyArgon2Time, LegacyArgon2SaltLen, LegacyArgon2Memory, LegacyArgon2Threads, LegacyArgon2KeyLen)
		saltHex = parts[0]
		hashHex = parts[1]
	} else {
		return false, errors.New("invalid password hash format")
	}

	salt, err := hex.DecodeString(saltHex)
	if err != nil {
		return false, err
	}

	storedHash, err := hex.DecodeString(hashHex)
	if err != nil {
		return false, err
	}

	inputHash, err := argon.Hash([]byte(password), salt)
	if err != nil {
		return false, err
	}

	return bytes.Equal(inputHash, storedHash), nil
}
