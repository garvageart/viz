import { MEDIA_SERVER } from "$lib/constants";
import type { ImageUploadFileData } from "$lib/upload/manager.svelte";
import { createServerURL } from "./url";

export async function sendAPIRequest<T>(path: string, options?: RequestInit, form: boolean = false) {
    if (path.startsWith("/")) {
        path = path.substring(1);
    }

    if (form) {
        return fetch(`${createServerURL(MEDIA_SERVER)}/${path}`, options);
    }

    return fetch(`${createServerURL(MEDIA_SERVER)}/${path}`, options).then(res => res.json() as Promise<T>);
}

// From https://github.com/immich-app/immich/main/web/src/lib/utils.ts#L55
export interface UploadRequestOptions {
    path?: string;
    data: ImageUploadFileData;
    method?: "POST" | "PUT";
    onUploadProgress?: (event: ProgressEvent<XMLHttpRequestEventTarget>) => void;
}

export const uploadRequest = async <T>(options: UploadRequestOptions): Promise<{ data: T; status: number; }> => {
    const { onUploadProgress, data, path = "/images" } = options;

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.addEventListener('error', (error) => reject(error));
        xhr.addEventListener('load', () => {
            if (xhr.readyState === 4 && xhr.status >= 200 && xhr.status < 300) {
                resolve({ data: xhr.response as T, status: xhr.status });
            } else {
                reject({ data: xhr.response, status: xhr.status });
            }
        });

        if (onUploadProgress) {
            xhr.upload.addEventListener('progress', (event) => onUploadProgress(event));
        }

        const formData = new FormData();
        for (const [key, value] of Object.entries(data)) {
            formData.append(key, value);
        }

        xhr.open(options.method || 'POST', `${createServerURL(MEDIA_SERVER)}${path}`);
        xhr.responseType = 'json';
        xhr.send(formData);
    });
};