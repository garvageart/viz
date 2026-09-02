import type { ImageAsset } from "@viz/api";
import * as Comlink from "comlink";
import {
    type HistogramData,
    type HistogramStat,
    Histogram as PHHistogram
} from "$lib/third-party/photo-histogram/js/histogram";
import * as HistogramUtils from "$lib/third-party/photo-histogram/js/util";
import { isAssetImage } from "$lib/utils/images";
import { clearHistogramCache, computeFallback, computeForAsset, getWorkerProxy } from "./asset";

export { HistogramUtils, PHHistogram as PhotoHistogram };
export type { HistogramData, HistogramStat };
export { clearHistogramCache, computeForAsset };

/**
 * Ensures an HTMLImageElement is loaded before using it as a source for drawing.
 */
export function ensureImageLoaded(img: HTMLImageElement): Promise<void> {
    if (img.complete && img.naturalWidth !== 0) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        const onLoad = () => {
            cleanup();
            resolve();
        };

        const onError = () => {
            cleanup();
            reject(new Error("Image failed to load"));
        };

        function cleanup() {
            img.removeEventListener("load", onLoad);
            img.removeEventListener("error", onError);
        }

        img.addEventListener("load", onLoad);
        img.addEventListener("error", onError);
    });
}

/**
 * Unified histogram computation supporting ImageAsset, HTMLImageElement, HTMLCanvasElement, Blob, or URL string.
 * Offloads decoding and tallying to a Web Worker whenever possible.
 */
export async function computeHistogram(
    source: ImageAsset | HTMLImageElement | HTMLCanvasElement | Blob | string
): Promise<HistogramData> {
    if (isAssetImage(source)) {
        return computeForAsset(source);
    }

    if (typeof source === "string") {
        const proxy = getWorkerProxy();
        if (proxy) {
            return proxy.compute(source);
        }
        return computeFallback(source);
    }

    if (source instanceof HTMLImageElement) {
        await ensureImageLoaded(source);
        const bitmap = await createImageBitmap(source);
        const proxy = getWorkerProxy();
        if (proxy) {
            return proxy.compute(Comlink.transfer(bitmap, [bitmap]));
        }
        const h = new PHHistogram(source);
        return h.data;
    }

    if (source instanceof HTMLCanvasElement || source instanceof Blob) {
        const bitmap = await createImageBitmap(source);
        const proxy = getWorkerProxy();
        if (proxy) {
            return proxy.compute(Comlink.transfer(bitmap, [bitmap]));
        }
        const h = new PHHistogram(source as HTMLCanvasElement);
        return h.data;
    }

    throw new Error("Unsupported histogram source");
}

/**
 * Lightweight wrapper that exposes a persistent histogram instance for callers that want to refresh/reuse.
 */
export class HistogramWrapper {
    private _hist: PHHistogram;

    constructor(source: HTMLImageElement | HTMLCanvasElement, luminanceWeights?: number[]) {
        // caller is responsible for ensuring image is loaded when necessary
        this._hist = new PHHistogram(source as HTMLImageElement | HTMLCanvasElement, luminanceWeights);
    }

    get data(): HistogramData {
        return this._hist.data;
    }

    refresh(): void {
        this._hist.refresh();
    }
}
