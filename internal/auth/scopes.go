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
