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
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            throw new Error("OffscreenCanvas 2D context unavailable");
        }

        ctx.drawImage(bitmap, 0, 0);
        const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
        bitmap.close();

        return tallyImageData(imageData);
    }
};

expose(api);
