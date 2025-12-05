package auth

import (
	"strings"

	"github.com/samber/lo"
)

type Scope string
type ScopeItem struct {
	Value Scope  `json:"value"`
	Label string `json:"label"`
}

const (
	// AllScope grants all permissions.
	AllScope Scope = "*"

	// AdminReadScope grants read access to admin resources.
	AdminReadScope Scope = "admin:read"
	// AdminWriteScope grants write access to admin resources.
	AdminWriteScope Scope = "admin:write"

	// APIKeysCreateScope grants permission to read API keys.
	APIKeysCreateScope Scope = "api-keys:create"
	// APIKeysReadScope grants permission to read API keys.
	APIKeysListScope Scope = "api-keys:list"
	// APIKeysReadScope grants permission to read API keys.
	APIKeysReadScope Scope = "api-keys:read"
	// APIKeysRevokeScope grants permission to read API keys.
	APIKeysRevokeScope Scope = "api-keys:revoke"
	// APIKeysRotateScope grants permission to read API keys.
	APIKeysRotateScope Scope = "api-keys:rotate"
	// APIKeysDeleteScope grants permission to read API keys.
	APIKeysDeleteScope Scope = "api-keys:delete"

	// AuthRefreshScope grants permission to refresh authentication tokens.
	AuthRefreshScope Scope = "auth:refresh"
	// AuthRevokeScope grants permission to revoke authentication tokens.
	AuthRevokeScope Scope = "auth:revoke"

	// CollectionsCreateScope grants permission to create collections.
	CollectionsCreateScope Scope = "collections:create"
	// CollectionsReadScope grants permission to read collections.
	CollectionsReadScope Scope = "collections:read"
	// CollectionsUpdateScope grants permission to update collections.
	CollectionsUpdateScope Scope = "collections:update"
	// CollectionsDeleteScope grants permission to delete collections.
	CollectionsDeleteScope Scope = "collections:delete"
	// CollectionsShareScope grants permission to share collections.
	CollectionsShareScope Scope = "collections:share"

	// ImagesReadScope grants permission to read images.
	ImagesReadScope Scope = "images:read"
	// ImagesUploadScope grants permission to upload images.
	ImagesUploadScope Scope = "images:upload"
	// ImagesUpdateScope grants permission to update images.
	ImagesUpdateScope Scope = "images:update"
	// ImagesDeleteScope grants permission to delete images.
	ImagesDeleteScope Scope = "images:delete"
	// ImagesDownloadScope grants permission to download images.
	ImagesDownloadScope Scope = "images:download"

	// JobsReadScope grants permission to read jobs.
	JobsReadScope Scope = "jobs:read"
	// JobsCreateScope grants permission to create jobs.
	JobsCreateScope Scope = "jobs:create"
	// JobsUpdateScope grants permission to update jobs.
	JobsUpdateScope Scope = "jobs:update"
	// JobsDeleteScope grants permission to delete jobs.
	JobsDeleteScope Scope = "jobs:delete"

	// UsersCreateScope grants permission to create users.
	UsersCreateScope Scope = "users:create"
	// UsersReadScope grants permission to read users.
	UsersReadScope Scope = "users:read"
	// UsersUpdateScope grants permission to update users.
	UsersUpdateScope Scope = "users:update"
	// UsersDeleteScope grants permission to delete users.
	UsersDeleteScope Scope = "users:delete"

	// UserSettingsReadScope grants permission to read user settings.
	UserSettingsReadScope Scope = "user-settings:read"
	// UserSettingsUpdateScope grants permission to update user settings.
	UserSettingsUpdateScope Scope = "user-settings:update"

	// DownloadsCreateScope grants permission to create downloads.
	DownloadsCreateScope Scope = "downloads:create"

	// EventsReadScope grants permission to read events.
	EventsReadScope Scope = "events:read"
)

// AllScopes is a list of all available scopes.
var AllScopes = []ScopeItem{
	{Value: AllScope, Label: "Full Access"},
	{Value: AdminReadScope, Label: "Admin Read"},
	{Value: AdminWriteScope, Label: "Admin Write"},
	{Value: APIKeysCreateScope, Label: "Create API Keys"},
	{Value: APIKeysListScope, Label: "List API Keys"},
	{Value: APIKeysReadScope, Label: "Read API Key"},
	{Value: APIKeysRevokeScope, Label: "Revoke API Keys"},
	{Value: APIKeysRotateScope, Label: "Rotate API Keys"},
	{Value: APIKeysDeleteScope, Label: "Delete API Keys"},
	{Value: AuthRefreshScope, Label: "Refresh Auth"},
	{Value: AuthRevokeScope, Label: "Revoke Auth"},
	{Value: CollectionsCreateScope, Label: "Create Collections"},
	{Value: CollectionsReadScope, Label: "Read Collections"},
	{Value: CollectionsUpdateScope, Label: "Update Collections"},
	{Value: CollectionsDeleteScope, Label: "Delete Collections"},
	{Value: CollectionsShareScope, Label: "Share Collections"},
	{Value: ImagesReadScope, Label: "Read Images"},
	{Value: ImagesUploadScope, Label: "Upload Images"},
	{Value: ImagesUpdateScope, Label: "Update Images"},
	{Value: ImagesDeleteScope, Label: "Delete Images"},
	{Value: ImagesDownloadScope, Label: "Download Images"},
	{Value: JobsReadScope, Label: "Read Jobs"},
	{Value: JobsCreateScope, Label: "Create Jobs"},
	{Value: JobsUpdateScope, Label: "Update Jobs"},
	{Value: JobsDeleteScope, Label: "Delete Jobs"},
	{Value: UsersCreateScope, Label: "Create Users"},
	{Value: UsersReadScope, Label: "Read Users"},
	{Value: UsersUpdateScope, Label: "Update Users"},
	{Value: UsersDeleteScope, Label: "Delete Users"},
	{Value: UserSettingsReadScope, Label: "Read User Settings"},
	{Value: UserSettingsUpdateScope, Label: "Update User Settings"},
	{Value: DownloadsCreateScope, Label: "Create Downloads"},
	{Value: EventsReadScope, Label: "Read Events"},
}

// HasScope checks if a given set of scopes grants access to a required scope.
// The check is hierarchical. For example, if the required scope is "images:read",
// a user with "images" or "*" scope will be granted access.
func HasScope(userScopes []string, requiredScope Scope) bool {
	// Superuser/Superadmin has access to everything.
	if lo.Contains(userScopes, string(AllScope)) {
		return true
	}

	// Check for exact scope match.
	if lo.Contains(userScopes, string(requiredScope)) {
		return true
	}

	// Check for hierarchical scope match.
	// e.g. user has "images", required is "images:read"
	// e.g. user has "images:*", required is "images:read"
	requiredParts := strings.Split(string(requiredScope), ":")
	for _, userScope := range userScopes {
		userParts := strings.Split(userScope, ":")

		// Check if userScope is a prefix of requiredScope (e.g., "images" grants "images:read")
		if len(userParts) <= len(requiredParts) && strings.Join(requiredParts[:len(userParts)], ":") == userScope {
			return true
		}

		// Check for wildcard match (e.g., "images:*" grants "images:read")
		if len(userParts) == 2 && userParts[1] == "*" && userParts[0] == requiredParts[0] {
			return true
		}
	}

	return false
}

// HasAllScopes checks if a given set of scopes grants access to all required scopes.
func HasAllScopes(userScopes []string, requiredScopes []Scope) bool {
	if len(requiredScopes) == 0 {
		return true
	}

	for _, requiredScope := range requiredScopes {
		if !HasScope(userScopes, requiredScope) {
			return false
		}
	}

	return true
}
