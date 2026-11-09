import { settings } from "#lib/settings/client/settings.svelte.js";
import type { EntitySort } from "#lib/types/asset.js";

export type SortSection = "photos" | "collections" | "collectionDetail";

export const SORT_DEFAULTS: EntitySort = {
    display: "cover",
    group: {
        by: "year",
        order: "ASC"
    },
    by: "taken_at",
    order: "DESC"
} as const;

export function createSortDefaults(): EntitySort {
    return structuredClone(SORT_DEFAULTS);
}

export class SortState {
    constructor(readonly section: string) {}

    get value(): EntitySort {
        const sortSettings = settings.get("sort");
        if (!sortSettings[this.section]) {
            sortSettings[this.section] = createSortDefaults();
        }
        return sortSettings[this.section];
    }

    set value(v: EntitySort) {
        const sortSettings = settings.get("sort");
        sortSettings[this.section] = v;
    }

    /** Resolves once persisted sort settings have been applied. */
    async ready(): Promise<void> {
        return Promise.resolve();
    }
}

export const photosSort = new SortState("photos");
export const collectionsSort = new SortState("collections");
export const collectionDetailSort = new SortState("collectionDetail");
