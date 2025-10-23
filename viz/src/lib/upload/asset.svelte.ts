import { uploadRequest } from "$lib/utils/http";
import type { ImageUploadFileData, ImageUploadSuccess } from "./manager.svelte";

export enum UploadState {
    PENDING,
    STARTED,
    DONE,
    ERROR,
    CANCELED,
    INVALID
}

export interface UploadImageStats {
    progress: number;
    state: UploadState;
    startTime?: Date;
    endTime?: Date;
}

export class UploadImage implements UploadImageStats {
    progress: number = $state(0);
    state: UploadState = $state(UploadState.PENDING);
    startTime?: Date = $state(new Date());
    checksum?: string;
    data: ImageUploadFileData;

    constructor(data: ImageUploadFileData) {
        this.checksum = data.checksum;
        this.data = data;
    }

    reset() {
        this.progress = 0;
        this.state = UploadState.PENDING;
    }

    private updateProgress = (event: ProgressEvent<XMLHttpRequestEventTarget>) => {
        this.progress = event.loaded / event.total;
    };

    async upload(): Promise<ImageUploadSuccess | undefined> {
        try {
            this.state = UploadState.STARTED;
            const responseData = await uploadRequest<ImageUploadSuccess>({
                data: this.data,
                path: "/images",
                onUploadProgress: this.updateProgress
            });

            this.state = (responseData.status === 200) || (responseData.status === 201) ? UploadState.DONE : UploadState.INVALID;

            return responseData.data;
        } catch (error) {
            this.state = UploadState.ERROR;
            console.error(error);
            return undefined;
        }
    }
}