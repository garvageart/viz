<script lang="ts">
	import { sendOAuthParams ***REMOVED*** from "$lib/auth/auth_methods";

	const provider: string | null = new URL(location.href***REMOVED***.searchParams.get("provider"***REMOVED***;
	sendOAuthParams(provider***REMOVED***;
</script>

{#if !provider***REMOVED***
	OAuth provider not specified, redirecting back home page...
{/if***REMOVED***

<p>Signing in to {provider***REMOVED***...</p>
