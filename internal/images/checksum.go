package images

import (
	"crypto/sha1"
	"encoding/hex"
	"io"
)

func CalculateImageChecksum(data []byte) (string, error) {
	hasher := sha1.New()
	_, err := hasher.Write(data)
	if err != nil {
		return "", err
	}

	return hex.EncodeToString(hasher.Sum(nil)), nil
}

func CalculateImageChecksumFromReader(reader io.Reader) (string, error) {
	hasher := sha1.New()
	_, err := io.Copy(hasher, reader)
	if err != nil {
		return "", err
	}

	return hex.EncodeToString(hasher.Sum(nil)), nil
}
