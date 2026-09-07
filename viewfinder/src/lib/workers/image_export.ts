import * as Comlink from "comlink";
import type { TransformInput, TransformResult } from "$lib/images/vips/vips";

export async function transformSingleImage(
    input: TransformInput,
    onProgress?: (percent: number) => void
): Promise<{ result?: TransformResult; error?: string }> {
    const { generateTransform } = await import("$lib/images/vips/vips");

    try {
        const result = await generateTransform(input, onProgress);
        return { result };
    } catch (error) {
        console.error("[Worker] Image transform failed:", error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        return { error: errorMsg };
    }
}

export async function exportImagesParallel(
    images: TransformInput[],
    sharedCounter?: Int32Array | null,
    staticIndex?: number,
    onProgress?: (index: number, percent: number) => void
) {
    // Dynamically import vips here to avoid top-level await blocking Comlink initialization
    const { generateTransform } = await import("$lib/images/vips/vips");

    const results: { result?: TransformResult; error?: string; index: number }[] = [];

    // If we have a shared counter, use Atomics for parallel coordination
    if (sharedCounter) {
        const total = images.length;
        while (true) {
            const index = Atomics.add(sharedCounter, 0, 1);
            if (index >= total) {
                break;
            }

            try {
                const result = await generateTransform(images[index], (percent) => {
                    onProgress?.(index, percent);
                });
                results.push({ result, index });
            } catch (error) {
                console.error("[Worker] Image transform failed at index", index, ":", error);
                const errorMsg = error instanceof Error ? error.message : String(error);
                results.push({ error: errorMsg, index });
            }
        }
    } else if (staticIndex !== undefined && staticIndex < images.length) {
        // Fallback: process the single image specified by staticIndex
        try {
            const result = await generateTransform(images[staticIndex], (percent) => {
                onProgress?.(staticIndex, percent);
            });
            results.push({ result, index: staticIndex });
        } catch (error) {
            console.error("[Worker] Image transform failed at static index", staticIndex, ":", error);
            const errorMsg = error instanceof Error ? error.message : String(error);
            results.push({ error: errorMsg, index: staticIndex });
        }
    }

    return results;
}

const workerApi = {
    exportImagesParallel,
    transformSingleImage
};

export type ImageExportWorkerApi = typeof workerApi;

Comlink.expose(workerApi);
