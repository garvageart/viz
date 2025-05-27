package gcp

***REMOVED***
***REMOVED***
	"encoding/json"
***REMOVED***
***REMOVED***
	"path"

	"cloud.google.com/go/storage"
	"google.golang.org/api/option"

	liberrors "imagine/common/errors"
	libos "imagine/common/os"
***REMOVED***

var (
	CredentialsPath  = constructCredentialsPath(***REMOVED***
	CredentialsBytes = func(***REMOVED*** []byte {
		credsBytes, err := ReadCredentials(CredentialsPath***REMOVED***
	***REMOVED***
			panic(fmt.Sprint("Error reading credentials file", err***REMOVED******REMOVED***
	***REMOVED***

		return credsBytes
***REMOVED***(***REMOVED***
***REMOVED***

func constructCredentialsPath(***REMOVED*** string {
	wd, err := os.Getwd(***REMOVED***

***REMOVED***
		panic(fmt.Sprint("Error getting working directory", err***REMOVED******REMOVED***
***REMOVED***

	pathConcat := path.Join(wd, os.Getenv("AUTH_PATH"***REMOVED***, os.Getenv("GCP_AUTH_FILE"***REMOVED******REMOVED***
	finalPath := libos.StandardisePaths(pathConcat***REMOVED***

	return finalPath
***REMOVED***

func ReadCredentials(path string***REMOVED*** ([]byte, error***REMOVED*** {
	credentials, err := os.ReadFile(path***REMOVED***

***REMOVED***
	***REMOVED***, err
***REMOVED***

	return credentials, nil
***REMOVED***

func CredentialsJSON(***REMOVED*** (CredentialsFile, error***REMOVED*** {
	var credentialsJSON CredentialsFile
	credsJsonMarBytes, err := json.RawMessage.MarshalJSON(CredentialsBytes***REMOVED***

***REMOVED***
		return CredentialsFile{***REMOVED***, liberrors.NewErrorf("Failed to marshal raw JSON message: %w", err***REMOVED***
***REMOVED***

	err = json.Unmarshal(credsJsonMarBytes, &credentialsJSON***REMOVED***

***REMOVED***
		return CredentialsFile{***REMOVED***, liberrors.NewErrorf("Failed to unmarshal raw JSON message: %w", err***REMOVED***
***REMOVED***

	return credentialsJSON, nil
***REMOVED***

func SetupClient(***REMOVED*** (*storage.Client, error***REMOVED*** {
	storageClientCtx := context.Background(***REMOVED***
	storageClient, err := storage.NewClient(storageClientCtx, option.WithCredentialsJSON(CredentialsBytes***REMOVED******REMOVED***

***REMOVED***
	***REMOVED***, err
***REMOVED***

	return storageClient, nil
***REMOVED***
