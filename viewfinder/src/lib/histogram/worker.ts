import { expose } from "comlink";
import type { HistogramData } from "$lib/third-party/photo-histogram/js/histogram";
import { tallyImageData } from "./tally";

export interface HistogramApi {
    /**
     * Fetches, decodes, and tallies an image. The URL must be same-origin or
     * CORS-enabled so the OffscreenCanvas is not tainted.
     */
    compute(url: string): Promise<HistogramData>;
}

export const api: HistogramApi = {
    async compute(url) {
        const blob = await fetch(url).then((r) => {
            if (!r.ok) {
                throw new Error(`Failed to fetch image (${r.status})`);
            }
            return r.blob();
        });

        const bitmap = await createImageBitmap(blob);
        const MAX_DIM = 2048;
        let width = bitmap.width;
        let height = bitmap.height;

        if (width > MAX_DIM || height > MAX_DIM) {
            const scale = Math.min(MAX_DIM / width, MAX_DIM / height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
        }

        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            throw new Error("OffscreenCanvas 2D context unavailable");
        }

        ctx.drawImage(bitmap, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        bitmap.close();

        return tallyImageData(imageData);
    }
};

expose(api);
