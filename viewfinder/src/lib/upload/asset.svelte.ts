import { type ImageUploadResponse, downloadRequestWithProgress, uploadImageWithProgress } from "$lib/api";
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

export enum DownloadState {
    PENDING,
    DOWNLOADING,
    DOWNLOADED,
    ERROR,
    CANCELED
}

export interface DownloadFileStats {
    progress: number;
    state: DownloadState;
    startTime?: Date;
    endTime?: Date;
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

export class DownloadFile implements DownloadFileStats {
    progress: number = $state(0);
    state: DownloadState = $state(DownloadState.PENDING);
    startTime?: Date = $state(new Date());
    endTime?: Date = $state(undefined);
    url: string;
    filename: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    bodyData?: any;
    data?: Blob = $state(undefined);
    request: XMLHttpRequest | undefined = $state(undefined);

    constructor(url: string, filename: string = "", method: "GET" | "POST" | "PUT" | "DELETE" = "GET", bodyData?: any) {
        this.url = url;
        this.filename = filename;
        this.method = method;
        this.bodyData = bodyData;
    }

    reset() {
        this.progress = 0;
        this.state = DownloadState.PENDING;
    }

    cancelRequest() {
        this.state = DownloadState.CANCELED;
        if (this.request) {
            this.request.abort();
        }
    }

    private updateProgress = (event: ProgressEvent<XMLHttpRequestEventTarget>) => {
        // Some browsers don't provide total (lengthComputable=false). Fallback to file size when possible.
        if (event.lengthComputable && event.total > 0) {
            this.progress = Math.min(100, (event.loaded / event.total) * 100);
        } else if (this.data?.size) {
            const total = this.data.size as number;
            this.progress = Math.min(100, (event.loaded / total) * 100);
        } else {
            // As a last resort, show indeterminate progress by nudging a bit until completion
            this.progress = Math.min(95, this.progress + 1);
        }
    };

    async download(): Promise<Blob> {
        this.state = DownloadState.DOWNLOADING;
        try {
            const options = {
                url: this.url,
                method: this.method,
                data: this.bodyData,
                onDownloadProgress: this.updateProgress,
                request: this.request
            };
            const downloadPromise = downloadRequestWithProgress(options);
            this.request = options.request;
            const responseData = await downloadPromise;

            if (responseData.status !== 200 && responseData.status !== 201) {
                throw new Error(`Download failed with status ${responseData.status}`);
            }

            this.data = responseData.data;
            this.state = DownloadState.DOWNLOADED;
            this.endTime = new Date();

            return responseData.data;
        } catch (error) {
            // this.state can be set to cancelled in the panel
            if ((this.state as DownloadState) !== DownloadState.CANCELED) {
                this.state = DownloadState.ERROR;
            }

            throw error;
        }
    }
}
