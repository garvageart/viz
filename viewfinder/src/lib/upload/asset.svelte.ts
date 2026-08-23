import { type ImageUploadResponse, uploadImageWithProgress } from "@viz/api";
import type { ImageUploadFileData } from "./manager.svelte";

export enum UploadState {
    PENDING,
    STARTED,
    DONE,
    ERROR,
    CANCELED,
    INVALID,
    DUPLICATE
}

export interface UploadImageStats {
    progress: number;
    state: UploadState;
    startTime?: Date;
    endTime?: Date;
}

/**
 * Returns true if an upload task has reached a terminal/completed state
 * (DONE, ERROR, CANCELED, or DUPLICATE).
 */
export function isUploadCompleted(task: UploadImage | { state: UploadState }): boolean {
    return (
        task.state === UploadState.DONE ||
        task.state === UploadState.ERROR ||
        task.state === UploadState.CANCELED ||
        task.state === UploadState.DUPLICATE
    );
}

/**
 * Returns true if an upload task is currently active or in-progress
 * (STARTED or PENDING).
 */
export function isUploadActive(task: UploadImage | { state: UploadState }): boolean {
    return !isUploadCompleted(task);
}

/**
 * Returns true if an upload task is pending execution.
 */
export function isUploadPending(task: UploadImage | { state: UploadState }): boolean {
    return task.state === UploadState.PENDING;
}

/**
 * Returns true if an upload task is currently running/uploading (STARTED).
 */
export function isUploadRunning(task: UploadImage | { state: UploadState }): boolean {
    return task.state === UploadState.STARTED;
}

/**
 * Returns true if an upload succeeded (DONE or DUPLICATE with imageData).
 */
export function isUploadSuccessful(task: UploadImage | { state: UploadState; imageData?: unknown }): boolean {
    return task.state === UploadState.DONE || (task.state === UploadState.DUPLICATE && Boolean(task.imageData));
}

/**
 * Returns true if an upload task failed or was cancelled.
 */
export function isUploadFailed(task: UploadImage | { state: UploadState }): boolean {
    return task.state === UploadState.ERROR || task.state === UploadState.CANCELED;
}

export class UploadImage implements UploadImageStats {
    progress: number = $state(0);
    state: UploadState = $state(UploadState.PENDING);
    startTime?: Date = $state(new Date());
    checksum?: string;
    imageData?: ImageUploadResponse;
    data: ImageUploadFileData;
    request: XMLHttpRequest | undefined = $state(undefined);

    constructor(data: ImageUploadFileData) {
        this.checksum = data.checksum;
        this.data = data;
    }

    reset() {
        this.progress = 0;
        this.state = UploadState.PENDING;
    }

    cancelRequest() {
        this.state = UploadState.CANCELED;
        if (this.request) {
            this.request.abort();
        }
    }

    private updateProgress = (event: ProgressEvent<XMLHttpRequestEventTarget>) => {
        // Some browsers don't provide total (lengthComputable=false). Fallback to file size when possible.
        if (event.lengthComputable && event.total > 0) {
            this.progress = Math.min(100, (event.loaded / event.total) * 100);
        } else if (this.data?.data?.size) {
            const total = this.data.data.size as number;
            this.progress = Math.min(100, (event.loaded / total) * 100);
        } else {
            // As a last resort, show indeterminate progress by nudging a bit until completion
            this.progress = Math.min(95, this.progress + 1);
        }
    };

    async upload(): Promise<ImageUploadResponse> {
        if (this.state === UploadState.DUPLICATE && this.imageData) {
            this.progress = 100;
            return this.imageData;
        }

        this.state = UploadState.STARTED;
        try {
            const options = {
                data: this.data,
                onUploadProgress: this.updateProgress,
                request: this.request
            };
            const uploadPromise = uploadImageWithProgress(options);
            this.request = options.request;
            const responseData = await uploadPromise;

            if (responseData.status !== 200 && responseData.status !== 201) {
                throw new Error(`Upload failed with status ${responseData.status}`);
            }

            this.imageData = responseData.data;

            switch (this.imageData.status) {
                case "duplicate":
                    this.state = UploadState.DUPLICATE;
                    break;
                case "uploaded":
                case "processing":
                    this.state = UploadState.DONE;
                    break;
                case "failed":
                    this.state = UploadState.ERROR;
                    break;
                default:
                    this.state = UploadState.DONE;
            }

            return responseData.data;
        } catch (error) {
            // this.state can be set to cancelled in the panelerror
            if ((this.state as UploadState) !== UploadState.CANCELED) {
                this.state = UploadState.ERROR;
            }
            throw error;
        }
    }
}
