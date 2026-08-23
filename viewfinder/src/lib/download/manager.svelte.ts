import { download } from "$lib/states/index.svelte";
import { DownloadFile, isDownloadCompleted, isDownloadPending } from "./asset.svelte";

/**
 * Waits for a list of download tasks to complete (success, error, or cancel).
 */
export function waitForDownloadCompletion(tasks: DownloadFile[]): Promise<void> {
    return new Promise((resolve) => {
        const check = () => {
            const allDone = tasks.every(isDownloadCompleted);

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
    if (download.activeCount >= download.concurrency) {
        return;
    }

    const pendingTasks = download.files.filter(isDownloadPending);

    if (pendingTasks.length === 0) {
        return;
    }

    const slotsAvailable = download.concurrency - download.activeCount;
    const tasksToStart = pendingTasks.slice(0, slotsAvailable);

    for (const task of tasksToStart) {
        download.activeCount++;

        task.download()
            .catch((error) => {
                console.error(`[DownloadManager] Download failed for URL: ${task.url}`, error);
            })
            .finally(() => {
                download.activeCount--;
                processDownloadQueue();
            });
    }
}
