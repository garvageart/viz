/**
 * API client initialization for SvelteKit
 * Sets up the fetch function for API calls
 */
import { defaults } from "./client.gen";

/**
 * Initialize the API client with SvelteKit's fetch function.
 * This should be called once in the root layout load function.
 * 
 * @param fetch - SvelteKit's enhanced fetch from the load context
 */
export function initApi(fetch: typeof globalThis.fetch) {
    defaults.fetch = fetch;
}
