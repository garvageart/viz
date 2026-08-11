import { describe, expect, it } from "vitest";
import { detectFolderName, extractFilesFromDataTransfer } from "./files";

describe("extractFilesFromDataTransfer", () => {
    it("returns empty files and no folder for an empty DataTransfer", async () => {
        const dt = new DataTransfer();

        const result = await extractFilesFromDataTransfer(dt);

        expect(result.files).toEqual([]);
        expect(result.folderName).toBeNull();
    });

    it("extracts a single dropped file", async () => {
        const dt = new DataTransfer();
        dt.items.add(new File(["jpeg-bytes"], "photo.jpg", { type: "image/jpeg" }));

        const result = await extractFilesFromDataTransfer(dt);

        expect(result.files).toHaveLength(1);
        expect(result.files[0].name).toBe("photo.jpg");
        expect(result.files[0].type).toBe("image/jpeg");
        expect(result.folderName).toBeNull();
    });

    it("extracts multiple dropped files", async () => {
        const dt = new DataTransfer();
        dt.items.add(new File(["a"], "first_photo.png", { type: "image/jpeg" }));
        dt.items.add(new File(["b"], "another_photo.png", { type: "image/png" }));

        const result = await extractFilesFromDataTransfer(dt);

        expect(result.files.map((f) => f.name)).toEqual(["first_photo.png", "another_photo.png"]);
    });
});

describe("detectFolderName", () => {
    it("returns null when nothing is dropped", () => {
        expect(detectFolderName(new DataTransfer().items)).toBeNull();
    });

    it("returns null when only files are dropped", () => {
        const dt = new DataTransfer();
        dt.items.add(new File(["x"], "photo.jpg", { type: "image/jpeg" }));

        expect(detectFolderName(dt.items)).toBeNull();
    });

    it("returns the directory name when a folder is dropped", () => {
        const originalGetAsEntry = DataTransferItem.prototype.webkitGetAsEntry;

        const dirEntry = {
            name: "best-photos-in-the-world",
            isFile: false,
            isDirectory: true
        } as FileSystemDirectoryEntry;

        Object.defineProperty(DataTransferItem.prototype, "webkitGetAsEntry", {
            configurable: true,
            value: () => dirEntry
        });

        try {
            const dt = new DataTransfer();
            dt.items.add(new File(["x"], "placeholder.txt", { type: "text/plain" }));

            expect(detectFolderName(dt.items)).toBe("best-photos-in-the-world");
        } finally {
            Object.defineProperty(DataTransferItem.prototype, "webkitGetAsEntry", {
                configurable: true,
                value: originalGetAsEntry
            });
        }
    });
});
