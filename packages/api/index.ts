import * as generated from "./client.gen";
import { defaults, servers } from "./client.gen";

defaults.baseUrl = servers.productionApi;

export const API_BASE_URL = defaults.baseUrl;

export interface InitApiOptions {
    baseUrl?: string;
    credentials?: RequestCredentials;
    headers?: Record<string, string>;
}

/**
 * Initialize global API client defaults (base URL, credentials, auth headers).
 */
export function initApi(options: InitApiOptions = {}): void {
    defaults.baseUrl = options.baseUrl ?? servers.productionApi;
    defaults.credentials = options.credentials ?? "include";

    if (options.headers) {
        defaults.headers = { ...defaults.headers, ...options.headers };
    }
}

export const api = generated;

export * from "./client.gen";
export * from "./functions.custom";
export * from "./websocket";
export { defaults, servers };
