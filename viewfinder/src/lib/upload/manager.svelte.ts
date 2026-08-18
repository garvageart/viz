import { ImageUploadStatus, checkDuplicates } from "@viz/api";
import { download, upload } from "$lib/states/index.svelte";
import type { DirectoryInputElement } from "$lib/types/dom";
import type { SupportedImageTypes, SupportedRAWFiles } from "$lib/types/images";
import { calculateSHA1 } from "$lib/utils/crypto";
import { DownloadFile, DownloadState, UploadImage, UploadState } from "./asset.svelte";

export interface ImageUploadFileData {
    file_name: string;
    data: File;
    checksum?: string;
}

export interface ImageUploadSuccess {
    uid: string;
    status: ImageUploadStatus;
    metadata?: Record<string, unknown>;
}

// Module-level state to be shared across all UploadManager instances
let activeCount = $state(0);

/**
 * Waits for a list of upload tasks to complete (success, error, cancel, or duplicate).
 */
export function waitForUploadCompletion(tasks: UploadImage[]): Promise<void> {
    return new Promise((resolve) => {
        const check = () => {
            const allDone = tasks.every(
                (t) =>
                    t.state === UploadState.DONE ||
                    t.state === UploadState.ERROR ||
                    t.state === UploadState.CANCELED ||
                    t.state === UploadState.DUPLICATE
            );

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
 * dynamic queue processor that respects global concurrency.
 * Can be called repeatedly to fill available slots.
 */
export function processGlobalQueue() {
    if (activeCount >= upload.concurrency) {
        return;
    }

    const pendingTasks = upload.files.filter((t) => t.state === UploadState.PENDING);

    if (pendingTasks.length === 0) {
        return;
    }

    const slotsAvailable = upload.concurrency - activeCount;
    const tasksToStart = pendingTasks.slice(0, slotsAvailable);

    for (const task of tasksToStart) {
        activeCount++;

        task.upload()
            .catch((error) => {
                console.error(`[UploadManager] Upload failed for file: ${task.data.file_name}`, error);
            })
            .finally(() => {
                activeCount--;
                processGlobalQueue();
            });
    }
}

// Module-level state for download queue management
let activeDownloadCount = $state(0);

/**
 * Waits for a list of download tasks to complete (success, error, or cancel).
 */
export function waitForDownloadCompletion(tasks: DownloadFile[]): Promise<void> {
    return new Promise((resolve) => {
        const check = () => {
            const allDone = tasks.every(
                (t) =>
                    t.state === DownloadState.DOWNLOADED ||
                    t.state === DownloadState.PROCESSING ||
                    t.state === DownloadState.ERROR ||
                    t.state === DownloadState.CANCELED
            );

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
 * Dynamic queue processor for downloads that respects global concurrency.
 */
export function processDownloadQueue() {
    if (activeDownloadCount >= download.concurrency) {
        return;
    }

    const pendingTasks = download.files.filter((t) => t.state === DownloadState.PENDING);

    if (pendingTasks.length === 0) {
        return;
    }

    const slotsAvailable = download.concurrency - activeDownloadCount;
    const tasksToStart = pendingTasks.slice(0, slotsAvailable);

    for (const task of tasksToStart) {
        activeDownloadCount++;

        task.download()
            .catch((error) => {
                console.error(`[DownloadManager] Download failed for URL: ${task.url}`, error);
            })
            .finally(() => {
                activeDownloadCount--;
                processDownloadQueue();
            });
    }
}

/**
 * Complete rewrite: Clean upload manager for drag-and-drop and file picker.
 * Files are immediately added to global upload state so the panel shows right away.
 */
export default class UploadManager {
    allowedTypes: string[];

    constructor(allowedTypes: (SupportedImageTypes | SupportedRAWFiles)[]) {
        this.allowedTypes = allowedTypes;
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
                file_name: file.name,
                data: file
            });

            tasks.push(task);
        }

        // Immediately add to global state (panel shows when upload.files.length > 0)
        if (tasks.length > 0) {
            upload.files.push(...tasks);
            upload.stats.total += tasks.length;
        }

        return tasks;
    }

    /**
     * Pre-calculates SHA-1 checksums for files and checks them against the database in bulk.
     * Any files that already exist are marked as duplicates.
     */
    async precheckDuplicates(tasks: UploadImage[]): Promise<void> {
        if (typeof crypto === "undefined" || !crypto.subtle) {
            console.warn(
                "[Upload] Web Crypto API (crypto.subtle) is not available (requires HTTPS or localhost). Bypassing bulk duplicate pre-check."
            );
            return;
        }
        // Calculate checksum for all tasks that don't have it yet
        await Promise.all(
            tasks.map(async (task) => {
                if (!task.checksum) {
                    try {
                        const checksum = await calculateSHA1(task.data.data);
                        task.checksum = checksum;
                        task.data.checksum = checksum;
                    } catch (e) {
                        console.error(`Failed to calculate checksum for ${task.data.file_name}:`, e);
                    }
                }
            })
        );

        // Filter tasks that have checksums and are still pending
        const validTasks = tasks.filter((t) => t.checksum && t.state === UploadState.PENDING);
        if (validTasks.length === 0) {
            return;
        }

        const checksums = validTasks.map((t) => t.checksum as string);

        try {
            // Call bulk duplicate check API
            const response = await checkDuplicates({ checksums });

            if (response.status === 200 && response.data.duplicates && response.data.duplicates.length > 0) {
                const dupMap = new Map<string, string>(); // checksum -> uid
                for (const dup of response.data.duplicates) {
                    dupMap.set(dup.checksum, dup.uid);
                }

                for (const task of validTasks) {
                    if (task.checksum && dupMap.has(task.checksum)) {
                        task.state = UploadState.DUPLICATE;
                        task.progress = 100;
                        task.imageData = {
                            uid: dupMap.get(task.checksum)!,
                            status: ImageUploadStatus.Duplicate
                        };
                    }
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
        const tasksToCheck = tasks || upload.files.filter((t) => t.state === UploadState.PENDING);
        if (tasksToCheck.length > 0) {
            await this.precheckDuplicates(tasksToCheck);
        }
        processGlobalQueue();
    }

    /**
     * dynamic queue processor that respects global concurrency.
     * Can be called repeatedly to fill available slots.
     */
    processQueue() {
        processGlobalQueue();
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
     * Open picker, add files, and start upload in one call.
     * Convenience method for backward compatibility.
     * Waits for all selected files to be uploaded (or failed) before returning.
     */
    async openPickerAndUpload(): Promise<ImageUploadSuccess[]> {
        const files = await this.openPicker();
        if (files.length === 0) {
            return [];
        }

        const tasks = this.addFiles(files);
        await this.start();

        await waitForUploadCompletion(tasks);

        const success = tasks
            .filter((t) => (t.state === UploadState.DONE || t.state === UploadState.DUPLICATE) && t.imageData)
            .map((t) => ({
                uid: t.imageData!.uid,
                status: t.imageData!.status,
                metadata: t.imageData
            }));
        return success;
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
        if (files.length === 0) {
            return [];
        }

        const tasks = this.addFiles(files);
        await this.start();

        await waitForUploadCompletion(tasks);

        const success = tasks
            .filter((t) => (t.state === UploadState.DONE || t.state === UploadState.DUPLICATE) && t.imageData)
            .map((t) => ({
                uid: t.imageData!.uid,
                status: t.imageData!.status,
                metadata: t.imageData
            }));
        return success;
    }
}
