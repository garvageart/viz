/**
 * Configured oazapfts API client
 * Auto-generated functions with proper base URL and SvelteKit fetch integration
 */
import { defaults, servers } from "./client.gen";

// Always use the productionApi path (/api).
// In development, Vite proxies /api to the backend.
// In production, the server serves /api directly.
defaults.baseUrl = servers.productionApi;
defaults.credentials = "include";

let doneFallback = false;

export const API_BASE_URL = defaults.baseUrl;
export function warnIfLocalhostFallback() {
    if (doneFallback) {
        return;
    }

    try {
        if (typeof window !== 'undefined' && API_BASE_URL.includes('localhost')) {
            console.warn('Frontend is using a localhost fallback for API URL. Build-time config not injected or runtime config not set.');
            doneFallback = true;
        }
    } catch (e) {
        // ignore
    }
}

// Re-export everything from the generated client
export * from "./client.gen";
export * from "./init";
export * from "./functions.custom";
