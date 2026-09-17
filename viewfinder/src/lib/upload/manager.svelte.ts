import { ImageUploadStatus, checkDuplicates } from "@viz/api";
import { upload } from "$lib/states/index.svelte";
import type { DirectoryInputElement } from "$lib/types/dom";
import {
    SUPPORTED_IMAGE_TYPES,
    SUPPORTED_RAW_FILES,
    type SupportedImageTypes,
    type SupportedRAWFiles
} from "$lib/types/images";
import { calculateSHA1 } from "$lib/utils/crypto";
import { UploadImage, UploadState, isUploadCompleted, isUploadPending, isUploadSuccessful } from "./asset.svelte";

export interface ImageUploadFileMetadata {
    fileName: string;
    fileData: File;
    checksum?: string;
}

export interface ImageUploadSuccess {
    uid: string;
    status: ImageUploadStatus;
    metadata?: Record<string, unknown>;
}

/**
 * Waits for a list of upload tasks to complete (success, error, cancel, or duplicate).
 */
export function waitForUploadCompletion(tasks: UploadImage[]): Promise<void> {
    return new Promise((resolve) => {
        const check = () => {
            const allDone = tasks.every(isUploadCompleted);

            if (allDone) {
                resolve();
            } else {
                setTimeout(check, 200);
            }
        };
        check();
    });
}

/**
 * Complete rewrite: Clean upload manager for drag-and-drop and file picker.
 * Files are immediately added to global upload state so the panel shows right away.
 */
export default class UploadManager {
    allowedTypes: string[];

    constructor(allowedTypes: (SupportedImageTypes | SupportedRAWFiles)[]) {
        this.allowedTypes = allowedTypes;

        $effect.root(() => {
            $effect(() => {
                void upload.files;
                void upload.concurrency;

                this.processGlobalQueue();
            });
        });
    }

    /**
     * Add files programmatically (e.g., from drag-and-drop).
     * Files are immediately added to the global upload.files array so the panel appears.
     * Returns array of created UploadImage tasks.
     */
    addFiles(files: File[]): UploadImage[] {
        const tasks: UploadImage[] = [];

        for (const file of files) {
            // Validate file type
            const mimeExt = file.type ? file.type.split("/")[1] : "";
            const nameExt = file.name.split(".").pop()?.toLowerCase() || "";
            if (!this.allowedTypes.includes(mimeExt) && !this.allowedTypes.includes(nameExt)) {
                console.warn(`Skipping unsupported file type: ${file.name} (${file.type})`);
                continue;
            }

            // Create upload task
            const task = new UploadImage({
                fileName: file.name,
                fileData: file
            });

            tasks.push(task);
        }

        // Immediately add to global state (panel shows when upload.files.length > 0)
        if (tasks.length > 0) {
            upload.files.push(...tasks);
        }

        return tasks;
    }

    /**
     * Pre-calculates SHA-1 checksums for files and checks them against the database in bulk.
     * Any files that already exist are marked as duplicates.
     */
    async precheckDuplicates(tasks: UploadImage[]): Promise<void> {
        if (typeof crypto === "undefined" || !crypto.subtle) {
            return;
        }

        try {
            const checksums = await Promise.all(
                tasks.map(async (task) => {
                    const checksum = await calculateSHA1(task.metadata.fileData);
                    task.metadata.checksum = checksum;

                    return checksum;
                })
            );

            const response = await checkDuplicates({ checksums });

            if (response.status === 200 && response.data.duplicates && response.data.duplicates.length > 0) {
                for (const d of response.data.duplicates) {
                    const task = tasks.find((t) => t.metadata.checksum === d.checksum);
                    if (!task) {
                        continue;
                    }

                    task.state = UploadState.DUPLICATE;
                    task.progress = 100;
                    task.uploadResponse = {
                        uid: d.uid,
                        status: ImageUploadStatus.Duplicate
                    };
                }
            }
        } catch (err) {
            console.error("Duplicate precheck API request failed:", err);
        }
    }

    /**
     * Start uploading tasks with concurrency control.
     * If no tasks provided, uploads all pending tasks in the global store.
     */
    async start(tasks?: UploadImage[]): Promise<void> {
        if (tasks?.length) {
            await this.precheckDuplicates(tasks);
        }

        this.processGlobalQueue();
    }

    /**
     * dynamic queue processor that respects global concurrency.
     * Can be called repeatedly to fill available slots.
     */
    processGlobalQueue(): void {
        if (upload.activeCount >= upload.concurrency) {
            return;
        }

        const pendingTasks = upload.files.filter(isUploadPending);

        if (pendingTasks.length === 0) {
            return;
        }

        const slotsAvailable = upload.concurrency - upload.activeCount;
        const tasksToStart = pendingTasks.slice(0, slotsAvailable);

        for (const task of tasksToStart) {
            upload.activeCount++;

            task.upload()
                .catch((error) => {
                    console.error(`[UploadManager] Upload failed for file: ${task.metadata.fileName}`, error);
                })
                .finally(() => {
                    upload.activeCount--;
                    this.processGlobalQueue();
                });
        }
    }
    /**
     * Open file picker dialog.
     * Creates a hidden input, triggers click, and returns selected files.
     */
    openPicker(): Promise<File[]> {
        return new Promise((resolve) => {
            const input = document.createElement("input");
            input.type = "file";
            input.multiple = true;
            input.accept = this.allowedTypes.map((t) => `image/${t}`).join(",");

            input.onchange = () => {
                const files = Array.from(input.files || []);
                input.remove();
                resolve(files);
            };

            input.click();
        });
    }

    /**
     * Add files, start upload, and return completed/duplicate image results.
     */
    async addFilesAndUpload(files: File[]): Promise<ImageUploadSuccess[]> {
        if (files.length === 0) {
            return [];
        }

        const tasks = this.addFiles(files);
        await this.start(tasks);

        await waitForUploadCompletion(tasks);

        const success = tasks.filter(isUploadSuccessful).map((t) => ({
            uid: t.uploadResponse!.uid,
            status: t.uploadResponse!.status,
            metadata: t.uploadResponse
        }));
        return success;
    }

    /**
     * Open picker, add files, and start upload in one call.
     * Convenience method for backward compatibility.
     * Waits for all selected files to be uploaded (or failed) before returning.
     */
    async openPickerAndUpload(): Promise<ImageUploadSuccess[]> {
        const files = await this.openPicker();
        return this.addFilesAndUpload(files);
    }

    /**
     * Open directory/folder picker dialog.
     * Creates a hidden input with webkitdirectory attribute, triggers click, and returns selected files.
     */
    openFolderPicker(): Promise<File[]> {
        return new Promise((resolve) => {
            const input = document.createElement("input") as DirectoryInputElement;
            input.type = "file";
            input.multiple = true;
            input.webkitdirectory = true;
            input.directory = true;

            input.onchange = () => {
                const files = Array.from(input.files || []);
                input.remove();
                resolve(files);
            };

            input.click();
        });
    }

    /**
     * Open folder picker, add files, and start upload in one call.
     */
    async openFolderPickerAndUpload(): Promise<ImageUploadSuccess[]> {
        const files = await this.openFolderPicker();
        return this.addFilesAndUpload(files);
    }
}

// allowed image types will come from the config but for now just hardcode
export const uploadManager = new UploadManager([
    ...SUPPORTED_RAW_FILES,
    ...SUPPORTED_IMAGE_TYPES
] as SupportedImageTypes[]);
