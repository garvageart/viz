package auth

***REMOVED***
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"

	"github.com/go-chi/render"
	"golang.org/x/oauth2"

	"imagine/common/crypto"
	libhttp "imagine/common/http"
***REMOVED***

type ImagineOAuth struct {
	config *oauth2.Config
***REMOVED***

func (oauth ImagineOAuth***REMOVED*** OAuthHandler(res http.ResponseWriter, req *http.Request, logger *slog.Logger***REMOVED*** *oauth2.Token {
	redirectState := req.FormValue("state"***REMOVED***
	cookieState, err := req.Cookie("img-state"***REMOVED***
	redirectedStateHash := crypto.CreateHash([]byte(redirectState***REMOVED******REMOVED***
	redirectStateHashString := base64.URLEncoding.EncodeToString(redirectedStateHash***REMOVED***

	if err == http.ErrNoCookie {
		jsonResponse := map[string]any{"message": "state not found"***REMOVED***
		render.JSON(res, req, jsonResponse***REMOVED***
	***REMOVED***
***REMOVED*** 

	if cookieState.Value != redirectStateHashString {
		jsonResponse := map[string]any{"message": "invalid oauth state"***REMOVED***
		logger.Info("invalid oauth state", slog.Group(
			"state",
			slog.String("state", redirectStateHashString***REMOVED***,
			slog.String("cookieState", cookieState.Value***REMOVED***,
		***REMOVED******REMOVED***

		render.JSON(res, req, jsonResponse***REMOVED***
	***REMOVED***
***REMOVED***

	// For some odd reason, after a user has already been authenticated, when they
	// reauthenticate Google returns a URL-encoded code so just incase, make sure
	// decoded first
	// https://stackoverflow.com/a/68917936
	code, _ := url.QueryUnescape(req.FormValue("code"***REMOVED******REMOVED***

	if code == "" {
		res.Write([]byte("Code not found to provide access token..\n"***REMOVED******REMOVED***
		reason := req.FormValue("error_reason"***REMOVED***
		if reason == "user_denied" {
			res.Write([]byte("User has denied Permission.."***REMOVED******REMOVED***
	***REMOVED***

	***REMOVED***
		// User has denied access..
		// http.Redirect(w, r, "/", http.StatusTemporaryRedirect***REMOVED***
***REMOVED***

	token, err := oauth.config.Exchange(req.Context(***REMOVED***, code***REMOVED***
***REMOVED***
		logger.Error("oauth exchange failed" + err.Error(***REMOVED*** + "\n"***REMOVED***
	***REMOVED***
***REMOVED***

	return token
***REMOVED***

func FetchUserDataFromProvider(res http.ResponseWriter, req *http.Request, logger *slog.Logger, apiUrl string***REMOVED*** any {
	resp, err := http.Get(apiUrl***REMOVED***
	var userResponse []byte
	var userData any

***REMOVED***
		libhttp.ServerError(res, req, err, logger, nil,
			"Failed to get user info from provider",
			"",
		***REMOVED***
	***REMOVED***
***REMOVED***

	userResponse, err = io.ReadAll(resp.Body***REMOVED***
***REMOVED***
		libhttp.ServerError(res, req, err, logger, nil,
			"Failed to read user info from body",
			"",
		***REMOVED***
	***REMOVED***
***REMOVED***

	err = json.Unmarshal(userResponse, &userData***REMOVED***

***REMOVED***
		logger.Error("Failed to decode JSON: " + err.Error(***REMOVED*** + "\n"***REMOVED***
		http.Error(res, err.Error(***REMOVED***, http.StatusInternalServerError***REMOVED***
	***REMOVED***
***REMOVED***

	resp.Body.Close(***REMOVED***
	return userData
***REMOVED***

func SetupOAuthURL(res http.ResponseWriter, req *http.Request, oauthConfig *oauth2.Config, provider string, state string***REMOVED*** (string, error***REMOVED*** {
	URL, err := url.Parse(oauthConfig.Endpoint.AuthURL***REMOVED***

***REMOVED***
		return "", errors.New("error parsing oauth url for" + provider***REMOVED***
***REMOVED***

	parameters := url.Values{***REMOVED***
	parameters.Add("client_id", oauthConfig.ClientID***REMOVED***
	parameters.Add("scope", strings.Join(oauthConfig.Scopes, " "***REMOVED******REMOVED***
	parameters.Add("redirect_uri", oauthConfig.RedirectURL***REMOVED***
	parameters.Add("response_type", "code"***REMOVED***
	parameters.Add("state", state***REMOVED***

	URL.RawQuery = parameters.Encode(***REMOVED***
	url := URL.String(***REMOVED***

	return url, nil
***REMOVED***
