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
