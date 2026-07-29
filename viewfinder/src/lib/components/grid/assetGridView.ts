import type { AssetGridView } from "$lib/types/asset";

export function getEstimatedItemHeight(view: Omit<AssetGridView, "grid">, fallbackHeight: number): number {
    switch (view) {
        case "custom":
            return Math.max(fallbackHeight, 320);
        default:
            return fallbackHeight;
    }
}
