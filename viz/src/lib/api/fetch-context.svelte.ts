/**
 * Global fetch context for API calls
 * Stores SvelteKit's enhanced fetch when available, falls back to browser fetch
 */

let globalFetch: typeof fetch = fetch;

export function setFetch(fetchFn: typeof fetch) {
    globalFetch = fetchFn;
}

export function getFetch(): typeof fetch {
    return globalFetch;
}
