package crypto

***REMOVED***
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
***REMOVED***

***REMOVED***
***REMOVED***

var (
	HMACSecret = func(***REMOVED*** []byte {
		secret := os.Getenv("HMAC_SIGNITURE"***REMOVED***
		secretBytes, _ := hex.DecodeString(secret***REMOVED***
		return secretBytes
***REMOVED***(***REMOVED***
***REMOVED***

func CreateHash(data []byte***REMOVED*** []byte {
	hmac := hmac.New(sha256.New, HMACSecret***REMOVED***
	hmac.Write(data***REMOVED***
	dataHmac := hmac.Sum(nil***REMOVED***

	return dataHmac
***REMOVED***

func VerifyHash(data []byte, signitureData []byte***REMOVED*** bool {
	dataHmac := CreateHash(data***REMOVED***
	return hmac.Equal(dataHmac, signitureData***REMOVED***
***REMOVED***
