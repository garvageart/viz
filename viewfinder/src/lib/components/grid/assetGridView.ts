import type { AssetGridView } from "$lib/types/asset";

export function getEstimatedItemHeight(view: Omit<AssetGridView, "grid">, fallbackHeight: number): number {
    switch (view) {
        case "basic":
            return Math.max(fallbackHeight, 320);
        case "thumbnails":
            return Math.max(fallbackHeight, 280);
        default:
            return fallbackHeight;
    }
}
