import type { ApiResponse, DataType } from "@oazapfts/runtime";
import { error } from "@sveltejs/kit";
import {
    API_BASE_URL,
    type ErrorResponse,
    type ImageAsset,
    downloadImagesZipBlob,
    getImageFileBlob,
    signDownload
} from "@viz/api";
import { debugMode } from "#lib/states/index.svelte.js";
import type { ImageUploadFileMetadata } from "#lib/upload/manager.svelte.js";

// typescript is funny as hell
type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type ErrorStatusPattern = `${4 | 5}${Digit}${Digit}`;

type IsErrorStatus<S extends number> = number extends S ? false : `${S}` extends ErrorStatusPattern ? true : false;

type NonErrorCodes<R extends ApiResponse> = R extends { status: infer S extends number }
    ? IsErrorStatus<S> extends true
        ? never
        : S
    : never;

type DataBearingResponses<R extends ApiResponse> = Extract<R, { data: any }>;
type BodylessNonErrorResponses<R extends ApiResponse> =
    Extract<R, { status: NonErrorCodes<R> }> extends infer T ? (T extends { data: any } ? never : T) : never;

/** Includes data from 2XX responses, plus `undefined` for bodyless 2XX/3XX responses. */
type ExtractSuccessData<R extends ApiResponse> =
    | DataType<DataBearingResponses<R>, NonErrorCodes<R>>
    | ([BodylessNonErrorResponses<R>] extends [never] ? never : undefined);

function isErrorStatus(status: number): boolean {
    return status >= 400 && status < 600;
}

/**
 * Awaits an oazapfts API request and unwraps its response payload.
 *
 * Any status outside 400-599 is treated as non-error: 2XX data is returned, and
 * bodyless 2XX/3XX responses resolve to `undefined`. The return type is the union
 * of data from every non-error response in `R`.
 *
 * A 4XX/5XX response throws SvelteKit's `error()`, using `ErrorResponse.error` as
 * the message. SvelteKit turns this into an expected error response passed to
 * `handleError`; it must not be caught if SvelteKit is to handle it.
 *
 * @template R The generated API response union, including oazapfts' `headers` property.
 * @param promise The pending generated API request.
 * @returns The data from a non-error response, or `undefined` if it has no body.
 * @throws {import("@sveltejs/kit").HttpError} If the response status is in the 400-599 range.
 */
export async function sendVizAPIRequest<R extends ApiResponse>(promise: Promise<R>): Promise<ExtractSuccessData<R>> {
    const res = await promise;

    if (!isErrorStatus(res.status)) {
        return ("data" in res ? res.data : undefined) as ExtractSuccessData<R>;
    }

    const errorData = ("data" in res ? res.data : undefined) as ErrorResponse | undefined;

    error(res.status, errorData?.error);
}

// From https://github.com/immich-app/immich/main/web/src/lib/utils.ts#L55
export interface UploadRequestOptions {
    path?: string;
    data: ImageUploadFileMetadata;
    method?: "POST" | "PUT";
    onUploadProgress?: (event: ProgressEvent<XMLHttpRequestEventTarget>) => void;
}

export const uploadRequest = async <T>(options: UploadRequestOptions): Promise<{ data: T; status: number }> => {
    const { onUploadProgress, data, path = "/images" } = options;

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.addEventListener("error", (error) => reject(error));
        xhr.addEventListener("load", () => {
            if (xhr.readyState === 4 && xhr.status >= 200 && xhr.status < 300) {
                resolve({ data: xhr.response as T, status: xhr.status });
            } else {
                reject({ data: xhr.response, status: xhr.status });
            }
        });

        if (onUploadProgress) {
            xhr.upload.addEventListener("progress", (event) => onUploadProgress(event));
        }

        const formData = new FormData();
        for (const [key, value] of Object.entries(data)) {
            formData.append(key, value);
        }

        const base = API_BASE_URL;
        xhr.open(options.method || "POST", `${base}${path}`);
        xhr.responseType = "json";
        xhr.send(formData);
    });
};

export async function downloadOriginalImageFile(img: ImageAsset) {
    const uid = img.uid;
    const fileRes = await fetchOriginalImageFile(img);

    if (fileRes.status === 304) {
        if (debugMode) {
            console.log(`Image ${uid} not modified, using cached version for download`);
        }
        return;
    } else if (fileRes.status !== 200) {
        throw new Error(`Failed to download image: ${fileRes.data.error}`);
    }

    // this should never happen man but hey
    const filename = img.name.trim() !== "" ? img.name : `image-${uid}-${Date.now()}`;
    const blob = fileRes.data;
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
}

export async function fetchOriginalImageFile(img: ImageAsset) {
    const uid = img.uid;
    const fileRes = await getImageFileBlob(uid, {}, { cache: "no-cache" });

    return fileRes;
}

// Helper to perform token-based bulk download given a list of UIDs.
// The server will create a download token and use it for authentication.
export async function performImageDownloads(images: ImageAsset[] | string[]) {
    if (!images || images.length === 0) {
        throw new Error("No image UIDs provided for download");
    }

    const isStringArray = typeof images[0] === "string";
    let uids = isStringArray ? (images as string[]) : (images as ImageAsset[]).map((i) => i.uid);

    if (uids.length === 1) {
        const uid = uids[0];
        if (isStringArray) {
            const fileRes = await getImageFileBlob(uid, {}, { cache: "no-cache" });

            if (fileRes.status === 304) {
                if (debugMode) {
                    console.log(`Image ${uid} not modified, using cached version for download`);
                }
                return;
            } else if (fileRes.status !== 200) {
                throw new Error(`Failed to download image: ${fileRes.data.error}`);
            }

            const filename = `image-${uid}-${Date.now()}`;
            const blob = fileRes.data;
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();

            URL.revokeObjectURL(url);
            return;
        }

        const img = (images as ImageAsset[]).find((i) => i.uid === uid)!;
        return downloadOriginalImageFile(img);
    }

    const signRes = await signDownload({
        uids,
        expires_in: 300,
        allow_download: true,
        allow_embed: false,
        show_metadata: true
    });

    if (signRes.status !== 200) {
        throw new Error(signRes.data?.error ?? "Failed to sign download request");
    }

    const token = signRes.data.uid; // The token is stored in the uid field
    const dlRes = await downloadImagesZipBlob(token, { uids });

    if (dlRes.status !== 200) {
        throw new Error(dlRes.data?.error ?? "Failed to download archive");
    }

    // Extract filename from Content-Disposition header if available
    // Note: The custom function returns the blob directly, so we need to handle filename separately
    const filename = `images-${Date.now()}.zip`;

    const blob = dlRes.data;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
