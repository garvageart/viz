import { orderBy } from "lodash-es";
import type { Collection, ImageAsset } from "$lib/api";
import type { MenuItem } from "$lib/context-menu/types";
import type { SortState } from "$lib/states/sort.svelte";
import type { AssetSort, AssetSortBy } from "$lib/types/asset";
import { getTakenAt } from "$lib/utils/images";

function getCollectionDate(collection: Collection): Date {
    return new Date(collection.updated_at || collection.created_at);
}

function getMostRecentImageDate(img: ImageAsset): number {
    // For most recent: prioritize when it was added/uploaded to the system
    // created_at = when uploaded, updated_at = when modified, file_created_at = original file date
    return new Date(img.updated_at || img.created_at).getTime();
}

export function sortCollectionImages(assets: ImageAsset[], sort: AssetSort) {
    const order = sort.order.toLowerCase() as "asc" | "desc";
    switch (sort.by) {
        case "name":
            return orderBy(assets, "name", order);
        case "recently_added":
            return orderBy(assets, (img) => new Date(img.created_at).getTime(), order);
        case "updated_at":
            return orderBy(assets, (img) => new Date(img.updated_at).getTime(), order);
        case "taken_at":
            return orderBy(assets, (img) => getTakenAt(img).getTime(), order);
        default:
            return assets;
    }
}

export function sortCollections(collections: Collection[], sort: AssetSort) {
    const order = sort.order.toLowerCase() as "asc" | "desc";
    switch (sort.by) {
        case "name":
            return orderBy(collections, "name", order);
        case "recently_added":
            return orderBy(collections, (col) => new Date(col.created_at).getTime(), order);
        case "updated_at":
            return orderBy(collections, (col) => new Date(col.updated_at).getTime(), order);
        case "taken_at":
            // For collections, taken_at maps to the same date logic as before (updated_at || created_at)
            return orderBy(collections, (col) => getCollectionDate(col).getTime(), order);
        default:
            return collections;
    }
}

// Sorting (MenuItem[] for Dropdown)
export const sortOptions: MenuItem[] = [
    { id: "sort-name", label: "Name" },
    { id: "sort-recently_added", label: "Recently Added" },
    { id: "sort-updated_at", label: "Updated At" },
    { id: "sort-taken_at", label: "Taken At" }
];

const sortIdByKey: Record<AssetSortBy, string> = {
    name: "sort-name",
    recently_added: "sort-recently_added",
    updated_at: "sort-updated_at",
    taken_at: "sort-taken_at"
};

export function sortIdFromKey(key: AssetSortBy): string {
    return sortIdByKey[key];
}

export function currentSortId(state: SortState): string {
    return sortIdByKey[state.value.by];
}

export function sortByFromId(itemId: string): AssetSortBy | undefined {
    for (const [by, id] of Object.entries(sortIdByKey) as [AssetSortBy, string][]) {
        if (id === itemId) {
            return by;
        }
    }
    return undefined;
}

export function applySortSelection(state: SortState, itemId: string): AssetSortBy | undefined {
    const by = sortByFromId(itemId);
    if (by) {
        state.value.by = by;
    }
    return by;
}

export function toggleSortOrder(state: SortState) {
    state.value.order = state.value.order === "ASC" ? "DESC" : "ASC";
}
