/**
 * Configured oazapfts API client
 * Auto-generated functions with proper base URL and SvelteKit fetch integration
 */
import { MEDIA_SERVER } from "$lib/constants";
import { createServerURL } from "$lib/utils/url";
import { defaults } from "./client.gen";
import { getFetch } from "./fetch-context.svelte.js";

// Configure the base URL for the API client
defaults.baseUrl = createServerURL(MEDIA_SERVER);

// Use the global fetch context (SvelteKit's enhanced fetch when available)
// We need to wrap it in a function since defaults.fetch expects the actual function
defaults.fetch = (...args) => getFetch()(...args);

// Include credentials (cookies) with all requests for authentication
defaults.credentials = "include";

// Re-export everything from the generated client
export * from "./client.gen";
