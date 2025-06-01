package auth

***REMOVED***
***REMOVED***
	"errors"
	"log/slog"
	"net/http"
***REMOVED***

	githubapi "github.com/google/go-github/github"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/github"
***REMOVED***

var (
	GithubOAuthConfig = &oauth2.Config{
		ClientID:     os.Getenv("GITHUB_OAUTH2_CLIENT_ID"***REMOVED***,
		ClientSecret: os.Getenv("GITHUB_OAUTH2_CLIENT_SECRET"***REMOVED***,
		RedirectURL:  "http://localhost:7777/signin/oauth?provider=GitHub",
		Scopes: []string{
			"read:user",
			"user:email",
***REMOVED***
		Endpoint: github.Endpoint,
***REMOVED***

	GithubOAuth = ImagineOAuth{
		config: GithubOAuthConfig,
***REMOVED***
***REMOVED***

type GitHubUserData struct {
	Login                   string `json:"login"`
	Id                      int    `json:"id"`
	NodeId                  string `json:"node_id"`
	AvatarUrl               string `json:"avatar_url"`
	GravatarUrl             string `json:"gravatar_id"`
	URL                     string `json:"url"`
	HtmlUrl                 string `json:"html_url"`
	FollowersUrl            string `json:"followers_url"`
	FollowingUrl            string `json:"following_url"`
	GistsUrl                string `json:"gists_url"`
	StarredUrl              string `json:"starred_url"`
	SubscriptionsUrl        string `json:"subscriptions_url"`
	OrganizationsUrl        string `json:"organizations_url"`
	ReposUrl                string `json:"repos_url"`
	EventsUrl               string `json:"events_url"`
	ReceivedEventsUrl       string `json:"received_events_url"`
	Type                    string `json:"type"`
	SiteAdmin               bool   `json:"site_admin"`
	Name                    string `json:"name"`
	Company                 string `json:"company"`
	Blog                    string `json:"blog"`
	Location                string `json:"location"`
	Email                   string `json:"email"`
	Hireable                bool   `json:"hireable"`
	Bio                     string `json:"bio"`
	TwitterUsername         string `json:"twitter_username"`
	PublicRepos             int    `json:"public_repos"`
	PublicGists             int    `json:"public_gists"`
	Followers               int    `json:"followers"`
	Following               int    `json:"following"`
	CreatedAt               string `json:"created_at"`
	UpdatedAt               string `json:"updated_at"`
	PrivateGists            int    `json:"private_gists"`
	TotalPrivateRepos       int    `json:"total_private_repos"`
	OwnedPrivateRepos       int    `json:"owned_private_repos"`
	DiskUsage               int    `json:"disk_usage"`
	Collaborators           int    `json:"collaborators"`
	TwoFactorAuthentication bool   `json:"two_factor_authentication"`
	Plan                    struct {
		Name          string `json:"name"`
		Space         int    `json:"space"`
		PrivateRepos  int    `json:"private_repos"`
		Collaborators int    `json:"collaborators"`
***REMOVED*** `json:"plan"`
***REMOVED***

func GithubClient(token *oauth2.Token***REMOVED*** *githubapi.Client {
	ctx := context.Background(***REMOVED***
	ts := oauth2.StaticTokenSource(token***REMOVED***
	tc := oauth2.NewClient(ctx, ts***REMOVED***
	client := githubapi.NewClient(tc***REMOVED***

	return client
***REMOVED***

func (oauth ImagineOAuth***REMOVED*** GithubOAuthHandler(res http.ResponseWriter, req *http.Request, logger *slog.Logger***REMOVED*** (*githubapi.User, error***REMOVED*** {
	token := GithubOAuth.OAuthHandler(res, req, logger***REMOVED***
	user, _, err := GithubClient(token***REMOVED***.Users.Get(context.Background(***REMOVED***, ""***REMOVED***

***REMOVED***
		errMsg := "error getting user data from GitHub"
		logger.Error(errMsg***REMOVED***
	***REMOVED***, errors.New(errMsg***REMOVED***
***REMOVED***

	return user, nil
***REMOVED***
