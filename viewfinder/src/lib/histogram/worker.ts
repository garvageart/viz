import { expose } from "comlink";
import type { HistogramData } from "$lib/third-party/photo-histogram/js/histogram";
import { tallyImageData } from "./tally";

export interface HistogramApi {
    /**
     * Accepts an ImageBitmap or Blob, tallies the histogram on an OffscreenCanvas.
     */
    compute(source: ImageBitmap | Blob): Promise<HistogramData>;
}

export const api: HistogramApi = {
    async compute(source) {
        const bitmap = source instanceof ImageBitmap ? source : await createImageBitmap(source);
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
