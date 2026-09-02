import { type ImageAsset, getAssetImagePath } from "@viz/api";
import * as Comlink from "comlink";
import type { HistogramApi } from "$lib/histogram/worker";
import HistogramWorker from "$lib/histogram/worker?worker";
import { type HistogramData, Histogram as PHHistogram } from "$lib/third-party/photo-histogram/js/histogram";

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
    // Use original, smoother lines and the computation issue is fixed
    // TODO: Ideally, maybe this is a configurable user option
    return getAssetImagePath(asset, "original") ?? null;
}

let workerInstance: Worker | null | undefined;
let workerProxy: Comlink.Remote<HistogramApi> | null | undefined;

export function getWorkerProxy(): Comlink.Remote<HistogramApi> | null {
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

export async function computeFallback(url: string): Promise<HistogramData> {
    const img = new Image();
    img.src = url;

    await new Promise<void>((resolve, reject) => {
        img.onload = () => {
            resolve();
        };
        img.onerror = () => {
            reject(new Error("Failed to load image for histogram"));
        };
    });

    const h = new PHHistogram(img);
    return h.data;
}

/**
 * Computes (and caches) the histogram for an asset. Never throws synchronously;
 * rejections drop the cache entry so a later attempt can retry.
 */
export function computeForAsset(asset: ImageAsset): Promise<HistogramData> {
    const key = assetKey(asset);
    let pending = cache.get(key);

    if (!pending) {
        pending = (async () => {
            const url = histogramSourceUrl(asset);
            if (!url) {
                throw new Error("Image has no histogram source");
            }

            const proxy = getWorkerProxy();
            if (proxy) {
                return proxy.compute(url);
            }

            return computeFallback(url);
        })();

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
