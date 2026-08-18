import { type ImageAsset, getAssetImagePath } from "@viz/api";
import * as Comlink from "comlink";
import { computeHistogram } from "$lib/histogram";
import type { HistogramApi } from "$lib/histogram/worker";
import HistogramWorker from "$lib/histogram/worker?worker";
import { type HistogramData } from "$lib/third-party/photo-histogram/js/histogram";

/**
 * Memoized, worker-accelerated histogram computation for an image asset.
 *
 * Results are cached by asset uid + image checksum so switching back to an
 * already-viewed image is instant, and the heavy fetch/decode/tally work runs
 * in a Comlink-backed Web Worker when available.
 */
const cache = new Map<string, Promise<HistogramData>>();

function assetKey(asset: ImageAsset): string {
    return `${asset.uid}:${asset.image_metadata?.checksum ?? ""}`;
}

function histogramSourceUrl(asset: ImageAsset): string | null {
    // Prefer preview, over original. Good middle ground. Original second, maybe slightly more time consuming
    // TODO: Ideally, maybe this is a configurable user option
    return getAssetImagePath(asset, "preview") ?? null;
}

let workerInstance: Worker | null | undefined;
let workerProxy: Comlink.Remote<HistogramApi> | null | undefined;

function getWorkerProxy(): Comlink.Remote<HistogramApi> | null {
    if (workerProxy === undefined) {
        try {
            workerInstance = new HistogramWorker();
            workerProxy = Comlink.wrap<HistogramApi>(workerInstance);
        } catch {
            workerInstance = null;
            workerProxy = null;
        }
    }
    return workerProxy;
}

// function computeInWorker(url: string): Promise<HistogramData> {
//     const proxy = getWorkerProxy();
//     if (!proxy) {
//         return Promise.reject(new Error("Histogram worker unavailable"));
//     }
//     return proxy.compute(url);
// }

// /**
//  * Main-thread fallback that reuses the existing photo-histogram core.
//  */
// async function computeFallback(url: string): Promise<HistogramData> {
//     const img = new Image();
//     img.src = url;

//     await new Promise<void>((resolve, reject) => {
//         img.onload = () => {
//             resolve();
//         };
//         img.onerror = () => {
//             reject(new Error("Failed to load image for histogram"));
//         };
//     });

//     return computeHistogram(img);
// }

/**
 * Computes (and caches) the histogram for an asset. Never throws synchronously;
 * rejections drop the cache entry so a later attempt can retry.
 */
export function computeForAsset(asset: ImageAsset): Promise<HistogramData> {
    const key = assetKey(asset);
    let pending = cache.get(key);

    if (!pending) {
        pending = new Promise<HistogramData>((resolve, reject) => {
            const url = histogramSourceUrl(asset);
            if (!url) {
                reject(new Error("Image has no histogram source"));
                return;
            }

            const img = new Image();
            img.src = url;

            img.onload = async () => {
                try {
                    const bitmap = await createImageBitmap(img);
                    const proxy = getWorkerProxy();
                    if (proxy) {
                        const data = await proxy.compute(Comlink.transfer(bitmap, [bitmap]));
                        resolve(data);
                    } else {
                        resolve(computeHistogram(img));
                    }
                } catch (err) {
                    reject(err);
                }
            };

            img.onerror = () => {
                reject(new Error("Failed to load image for histogram"));
            };
        });

        cache.set(key, pending);

        pending.catch(() => {
            if (cache.get(key) === pending) {
                cache.delete(key);
            }
        });
    }

    return pending;
}

/**
 * Clears all cached histograms and tears down the worker (e.g. on logout).
 */
export function clearHistogramCache(): void {
    cache.clear();
    workerInstance?.terminate();
    workerInstance = null;
    workerProxy = null;
}
