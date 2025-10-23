import { upload } from "$lib/states/index.svelte";
import type { SupportedImageTypes, SupportedRAWFiles } from "$lib/types/images";
import { UploadImage } from "./asset.svelte";

export interface ImageUploadFileData {
    filename: string;
    data: File;
    checksum?: string;
}

export interface ImageUploadSuccess {
    url: string;
    id: string;
    metadata: any;
}

export default class UploadManager {
    allowedTypes: string[];
    fileHolder: HTMLInputElement;

    constructor(allowedTypes: SupportedImageTypes[] | SupportedRAWFiles[]) {
        this.allowedTypes = allowedTypes;
        this.fileHolder = document.createElement("input");

        this.createFileHolder();
    }

    private async readFile(fileList: FileList) {
        const allFiles = [...fileList];

        const allFileData = allFiles.map(async (file) => {
            const rawData = await new Promise<string | ArrayBuffer>((resolve) => {
                const reader = new FileReader();

                reader.onloadend = (e) => {
                    if (e.target && e.target.result) {
                        resolve(e.target.result);
                    }
                };

                reader.readAsDataURL(file);
            });

            return {
                file,
                rawData
            };
        });

        return Promise.all(allFileData);
    }

    private createFileHolder() {
        const allowedMimeTypesString = this.allowedTypes.map((mimeType) => "image/" + mimeType).join(", ");

        this.fileHolder.setAttribute("type", "file");
        this.fileHolder.setAttribute("accept", allowedMimeTypesString);
    }

    openFileHolder() {
        this.fileHolder.click();
    }

    async uploadImage() {
        this.fileHolder.addEventListener("change", async () => {
            if (!this.fileHolder.files) {
                return;
            }

            const allFileData = await this.readFile(this.fileHolder.files);
            this.fileHolder.remove();

            for (const fileData of allFileData) {
                if (!this.allowedTypes.includes(fileData.file.type.split("/")[1])) {
                    return;
                }

                const fileInformation: ImageUploadFileData = {
                    filename: fileData.file.name,
                    data: fileData.file
                };

                // Checking for duplicates should be optional maybe but just do it now anyways
                if (crypto?.subtle?.digest) {
                    const hashBuffer = await crypto.subtle.digest("SHA-1", await fileData.file.arrayBuffer());
                    const hashArray = Array.from(new Uint8Array(hashBuffer));
                    fileInformation.checksum = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
                }

                upload.files.push(new UploadImage(fileInformation));
                upload.stats.total = upload.files.length;
            }
        });
    }

}