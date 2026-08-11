import { sleep } from "$lib/utils/misc";

/**
 * Recursively traverse file system entries to collect all files,
 * including those in nested folders.
 */
export async function traverseFileTree(item: FileSystemEntry): Promise<File[]> {
    const files: File[] = [];

    if (item.isFile) {
        const fileEntry = item as FileSystemFileEntry;
        const file = await new Promise<File>((resolve, reject) => {
            fileEntry.file(resolve, reject);
        });
        files.push(file);
    } else if (item.isDirectory) {
        const dirEntry = item as FileSystemDirectoryEntry;
        const reader = dirEntry.createReader();

        const readBatch = async (): Promise<FileSystemEntry[]> => {
            return new Promise((resolve, reject) => {
                reader.readEntries(resolve, reject);
            });
        };

        let entries = await readBatch();
        while (entries.length > 0) {
            for (const entry of entries) {
                const nestedFiles = await traverseFileTree(entry);
                files.push(...nestedFiles);
            }
            entries = await readBatch();
        }
    }

    return files;
}

export async function downloadToFilesystem(filename: string, data: Blob, revokeDelayMs?: number) {
    const url = URL.createObjectURL(data);

    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", filename);
    a.download = filename;
    a.target = "_blank";
    a.style.display = "none";
    document.body.appendChild(a);

    a.click();
    a.remove();

    // Default 1s delay ensures mobile browsers finish initiating the download
    // before the blob URL is revoked. Pass 0 to revoke immediately.
    await sleep(revokeDelayMs ?? 1000);
    URL.revokeObjectURL(url);
}

/**
 * Detect the first directory name from a DataTransferItemList.
 * Must be called synchronously during the drag/drop event.
 */
export function detectFolderName(items: DataTransferItemList | null | undefined) {
    if (!items) {
        return null;
    }

    for (const item of Array.from(items)) {
        if (item.kind !== "file") {
            continue;
        }

        const entry = item.webkitGetAsEntry?.();
        if (entry && entry.isDirectory) {
            return entry.name;
        }
    }

    return null;
}

/**
 * Extract all files from a DataTransfer, including files inside dropped folders.
 * Returns the flat file list plus the name of the first detected folder.
 * Must be called during the drag/drop event while the DataTransfer is still valid.
 */
export async function extractFilesFromDataTransfer(
    dt: DataTransfer
): Promise<{ files: File[]; folderName: string | null }> {
    const folderName = detectFolderName(dt.items);
    const allFiles: File[] = [];

    // Use DataTransferItemList for folder support
    if (dt.items) {
        const items = Array.from(dt.items);

        // Note: Extract all entries synchronously FIRST before any async operations
        // DataTransferItem entries become invalid after the first async operation
        const entries: FileSystemEntry[] = [];
        for (const item of items) {
            if (item.kind !== "file") {
                continue;
            }

            const entry = item.webkitGetAsEntry?.();
            if (entry) {
                entries.push(entry);
                continue;
            }

            // Fallback for browsers that don't support webkitGetAsEntry
            const file = item.getAsFile();
            if (file) {
                allFiles.push(file);
            }
        }

        // Now process all entries asynchronously
        for (const entry of entries) {
            const files = await traverseFileTree(entry);
            allFiles.push(...files);
        }
    } else {
        // Fallback to files list (doesn't support folders)
        const files = Array.from(dt.files);
        allFiles.push(...files);
    }

    return { files: allFiles, folderName };
}
