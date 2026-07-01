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
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    // Delay to ensure browser has successfully initiated the download
    if (revokeDelayMs) {
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, revokeDelayMs);
    }
}

/**
 * Detect the first directory name from a DataTransferItemList.
 * Must be called synchronously during the drag/drop event.
 */
export function detectFolderName(items: DataTransferItemList | null | undefined): string {
    if (!items) return "";
    for (const item of Array.from(items)) {
        if (item.kind === "file") {
            const entry = item.webkitGetAsEntry?.();
            if (entry && entry.isDirectory) {
                return entry.name;
            }
        }
    }
    return "";
}
