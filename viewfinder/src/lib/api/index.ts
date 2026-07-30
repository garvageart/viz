// viz/src/lib/api/index.ts
import type * as Oazapfts from "@oazapfts/runtime";
// Import type for RequestOpts
import * as QS from "@oazapfts/runtime/query";
import { loadingState } from "$lib/states/loading.svelte";
import type { ImageUploadFileData } from "$lib/upload/manager.svelte";
import * as generated from "./client.gen";
import { defaults, servers } from "./client.gen";

// Initialize defaults for the underlying oazapfts runtime
defaults.baseUrl = servers.productionApi;
defaults.credentials = "include";

// Export the proxied API client as 'api'
export const api = generated;

// Re-export other non-function exports like defaults, servers, and all types separately
export * from "./client.gen"; // This re-exports all types from the generated client.
export { defaults, servers };

// Exports from the old client.ts and custom functions ---
export const API_BASE_URL = defaults.baseUrl; // Export the configured base URL

export interface UploadImageOptions {
    data: ImageUploadFileData;
    onUploadProgress?: (event: ProgressEvent<XMLHttpRequestEventTarget>) => void;
    request?: XMLHttpRequest;
}

/**
 * Upload an image with progress tracking using XMLHttpRequest.
 * This is a custom implementation because openapi-fetch doesn't support progress events.
 *
 * Note: Maps the API response `id` to `uid` for consistency with the rest of the app.
 */
export async function uploadImageWithProgress(
    options: UploadImageOptions
): Promise<{ data: generated.ImageUploadResponse; status: number }> {
    const { onUploadProgress, data } = options;

    const xhr = new XMLHttpRequest();

    // Bind XHR instance back to caller's request reference for cancellation support
    if ("request" in options) {
        options.request = xhr;
    }

    return new Promise((resolve, reject) => {
        xhr.addEventListener("error", (error) => reject(error));
        xhr.addEventListener("load", () => {
            if (xhr.readyState === 4 && xhr.status >= 200 && xhr.status < 300) {
                const response = xhr.response as generated.ImageUploadResponse;
                resolve({ data: response, status: xhr.status });
            } else {
                reject({
                    data: xhr.response as generated.ErrorResponse,
                    status: xhr.status
                });
            }
        });

        if (onUploadProgress) {
            xhr.upload.addEventListener("progress", (event) => onUploadProgress(event));
        }

        const formData = new FormData();
        for (const [key, value] of Object.entries(data)) {
            // Map filename to file_name to match API expectation
            if (key === "filename") {
                formData.append("file_name", value);
            } else {
                formData.append(key, value);
            }
        }

        const base = API_BASE_URL; // Use the exported API_BASE_URL
        xhr.open("POST", `${base}/images`);
        xhr.withCredentials = true;
        xhr.responseType = "json";
        xhr.send(formData);
    });
}

export interface DownloadRequestOptions<T = unknown> {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    url: string;
    request?: XMLHttpRequest;
    data?: T;
    signal?: AbortSignal;
    onDownloadProgress?: (event: ProgressEvent<XMLHttpRequestEventTarget>) => void;
}

export async function downloadRequestWithProgress<TBody = unknown>(
    options: DownloadRequestOptions<TBody>
): Promise<{ data: Blob; status: number }> {
    const { url, method, data: body, onDownloadProgress, signal } = options;

    const xhr = new XMLHttpRequest();

    // Bind XHR instance back to caller's request reference for cancellation support
    if ("request" in options) {
        options.request = xhr;
    }

    return new Promise((resolve, reject) => {
        xhr.addEventListener("error", (error) => {
            reject(error);
        });
        xhr.addEventListener("load", () => {
            if (xhr.readyState === 4 && xhr.status >= 200 && xhr.status < 300) {
                const response = xhr.response as Blob;
                resolve({ data: response, status: xhr.status });
            } else {
                reject({
                    data: xhr.response as generated.ErrorResponse,
                    status: xhr.status
                });
            }
        });

        if (onDownloadProgress) {
            xhr.addEventListener("progress", (event) => {
                onDownloadProgress(event);
            });
        }

        if (signal) {
            signal.addEventListener("abort", () => {
                xhr.abort();
            });
        }

        xhr.open(method || "GET", url);
        xhr.withCredentials = true;
        xhr.responseType = "blob";

        if (body) {
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.send(JSON.stringify(body));
        } else {
            xhr.send();
        }
    });
}

export function getFullImagePath(path: string): string {
    // If path is already a full URL (starts with http:// or https://), return as-is
    if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
    }
    const base = API_BASE_URL; // Use the exported API_BASE_URL
    return `${base}${path}`;
}

export type JobSnapshotResponse = {
    running_by_topic: Record<string, number>;
    queued_by_topic: Record<string, number>;
    active: generated.WorkerJob[];
};

export async function getJobsSnapshot(): Promise<{
    data: JobSnapshotResponse;
    status: number;
}> {
    const base = API_BASE_URL; // Use the exported API_BASE_URL
    // TODO: Document in OpenAPI yaml
    const res = await fetch(`${base}/jobs/snapshot`, {
        credentials: "include"
    });
    const data = await res.json().catch(() => ({}));
    return { data, status: res.status };
}

/**
 * Get the download URL for a given token and optional password
 */
export function getDownloadUrl(token: string, password?: string): string {
    const baseUrl = defaults.baseUrl || "";
    const queryParams = QS.query(QS.explode({ token, password }));
    return `${baseUrl}/download${queryParams}`;
}

/**
 * Download images as a ZIP blob using a token
 * This is a custom implementation because oazapfts doesn't properly handle binary responses
 */
export async function downloadImagesZipBlob(
    token: string,
    downloadRequest: generated.DownloadRequest,
    password?: string,
    opts?: Oazapfts.RequestOpts
): Promise<
    | { status: 200; data: Blob }
    | { status: 400; data: generated.ErrorResponse }
    | { status: 401; data: generated.ErrorResponse }
    | { status: 403; data: generated.ErrorResponse }
    | { status: 500; data: generated.ErrorResponse }
> {
    const baseUrl = defaults.baseUrl || "";
    const queryParams = QS.query(QS.explode({ token, password }));
    const url = `${baseUrl}/download${queryParams}`;
    const fetchToUse = opts?.fetch ?? fetch;

    try {
        const defaultHeaders = defaults.headers;
        const customHeaders = opts?.headers || {};
        const headers: Record<string, any> = {};
        for (const [key, value] of Object.entries(defaultHeaders)) {
            headers[key] = value;
        }

        for (const [key, value] of Object.entries(customHeaders)) {
            headers[key] = value;
        }

        const response = await fetchToUse(url, {
            cache: opts?.cache || defaults.cache,
            credentials: opts?.credentials || defaults.credentials,
            keepalive: opts?.keepalive || defaults.keepalive,
            integrity: opts?.integrity || defaults.integrity,
            method: opts?.method || defaults.method || "POST",
            redirect: opts?.redirect || defaults.redirect,
            referrer: opts?.referrer || defaults.referrer,
            referrerPolicy: opts?.referrerPolicy || defaults.referrerPolicy,
            mode: opts?.mode || defaults.mode,
            signal: opts?.signal || defaults.signal,
            priority: opts?.priority || defaults.priority,
            headers: {
                "Content-Type": "application/json",
                ...headers
            },
            body: JSON.stringify(downloadRequest)
        });

        if (response.ok) {
            const blob = await response.blob();
            return { status: 200, data: blob };
        }

        // Try to parse error response as JSON
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            const errorData = await response.json();
            return {
                status: response.status as 400 | 401 | 403 | 500,
                data: errorData
            };
        }

        // Fallback error
        return {
            status: response.status as 400 | 401 | 403 | 500,
            data: { error: `Request failed with status ${response.status}` }
        };
    } catch (error) {
        return {
            status: 500,
            data: {
                error: error instanceof Error ? error.message : "Network error"
            }
        };
    }
}

/**
 * Custom API function to fetch an image file as a Blob.
 * This is a custom implementation because oazapfts.fetchJson does not correctly handle binary responses.
 */
export async function getImageFileBlob(
    uid: string,
    params: {
        format?: "webp" | "png" | "jpg" | "jpeg" | "avif" | "heif";
        width?: number;
        height?: number;
        quality?: number;
        download?: "1";
        token?: string;
        password?: string;
    } = {},
    opts?: Oazapfts.RequestOpts
): Promise<
    | { status: 200; data: Blob }
    | { status: 304 }
    | { status: 400; data: generated.ErrorResponse }
    | { status: 401; data: generated.ErrorResponse }
    | { status: 403; data: generated.ErrorResponse }
    | { status: 500; data: generated.ErrorResponse }
> {
    const baseUrl = API_BASE_URL;
    const queryParams = QS.query(QS.explode(params));
    const url = `${baseUrl}/images/${encodeURIComponent(uid)}/file${queryParams}`;
    const fetchToUse = opts?.fetch ?? fetch;

    try {
        const defaultHeaders = defaults.headers;
        const customHeaders = opts?.headers || {};
        const headers: Record<string, any> = {};
        for (const [key, value] of Object.entries(defaultHeaders)) {
            headers[key] = value;
        }

        for (const [key, value] of Object.entries(customHeaders)) {
            headers[key] = value;
        }

        const response = await fetchToUse(url, {
            cache: opts?.cache || defaults.cache,
            credentials: opts?.credentials || defaults.credentials,
            keepalive: opts?.keepalive || defaults.keepalive,
            integrity: opts?.integrity || defaults.integrity,
            method: opts?.method || defaults.method,
            redirect: opts?.redirect || defaults.redirect,
            referrer: opts?.referrer || defaults.referrer,
            referrerPolicy: opts?.referrerPolicy || defaults.referrerPolicy,
            mode: opts?.mode || defaults.mode,
            signal: opts?.signal || defaults.signal,
            priority: opts?.priority || defaults.priority,
            headers
        });

        // Ideally we never get here
        if (response.status === 304) {
            return { status: 304 }; // Return 304 for Not Modified
        }

        if (response.ok) {
            const blob = await response.blob();
            return { status: response.status as 200, data: blob };
        }

        // Try to parse error response as JSON
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            const errorData = await response.json();
            return {
                status: response.status as 400 | 401 | 403 | 500,
                data: errorData
            };
        }

        // Fallback error
        return {
            status: response.status as 400 | 401 | 403 | 500,
            data: { error: `Request failed with status ${response.status}` }
        };
    } catch (error) {
        return {
            status: 500,
            data: {
                error: error instanceof Error ? error.message : "Network error"
            }
        };
    }
}
