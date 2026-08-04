import { DbSettings } from "$lib/db/settings";
import type { AssetSort } from "$lib/types/asset";

export type SortSection = "photos" | "collections" | "collection-detail";

const DEFAULTS: AssetSort = {
    display: "cover",
    group: {
        by: "year",
        order: "ASC"
    },
    by: "taken_at",
    order: "DESC"
} as const;

function createDefaults(): AssetSort {
    return structuredClone(DEFAULTS);
}

export class SortState {
    private storage: DbSettings<AssetSort>;
    private readyPromise: Promise<void>;

    value: AssetSort = $state(createDefaults());

    constructor(readonly section: string) {
        this.storage = new DbSettings<AssetSort>(`sort.${section}`);
        this.readyPromise = this.load();

        $effect.root(() => {
            $effect(() => {
                this.storage.save($state.snapshot(this.value));
            });
        });
    }

    /** Resolves once persisted sort settings have been applied (or none were stored). */
    ready(): Promise<void> {
        return this.readyPromise;
    }

    private async load() {
        const stored = await this.storage.load();
        if (stored) {
            this.value = stored;
        }
    }
}

export const photosSort = new SortState("photos");
export const collectionsSort = new SortState("collections");
export const collectionDetailSort = new SortState("collection-detail");
