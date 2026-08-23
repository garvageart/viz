import { downloadRequestWithProgress } from "@viz/api";

export enum DownloadState {
    PENDING,
    DOWNLOADING,
    DOWNLOADED,
    PROCESSING,
    ERROR,
    CANCELED
}

export interface DownloadFileStats {
    progress: number;
    state: DownloadState;
    startTime?: Date;
    endTime?: Date;
}

/**
 * Returns true if a download task has reached a terminal/completed state
 * (DOWNLOADED, ERROR, or CANCELED).
 */
export function isDownloadCompleted(task: DownloadFile | { state: DownloadState }): boolean {
    return (
        task.state === DownloadState.DOWNLOADED ||
        task.state === DownloadState.ERROR ||
        task.state === DownloadState.CANCELED
    );
}

/**
 * Returns true if a download task is currently active or in-progress
 * (DOWNLOADING, PROCESSING, or PENDING).
 */
export function isDownloadActive(task: DownloadFile | { state: DownloadState }): boolean {
    return !isDownloadCompleted(task);
}

/**
 * Returns true if a download task is pending execution.
 */
export function isDownloadPending(task: DownloadFile | { state: DownloadState }): boolean {
    return task.state === DownloadState.PENDING;
}

/**
 * Returns true if a download task is currently running/downloading or processing.
 */
export function isDownloadRunning(task: DownloadFile | { state: DownloadState }): boolean {
    return task.state === DownloadState.DOWNLOADING || task.state === DownloadState.PROCESSING;
}

/**
 * Returns true if a download succeeded (DOWNLOADED).
 */
export function isDownloadSuccessful(task: DownloadFile | { state: DownloadState }): boolean {
    return task.state === DownloadState.DOWNLOADED;
}

/**
 * Returns true if a download task failed or was cancelled.
 */
export function isDownloadFailed(task: DownloadFile | { state: DownloadState }): boolean {
    return task.state === DownloadState.ERROR || task.state === DownloadState.CANCELED;
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
