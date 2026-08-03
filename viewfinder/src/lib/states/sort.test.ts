import { openDB } from "idb";
import { flushSync } from "svelte";
import { beforeEach, describe, expect, it } from "vitest";
import type { AssetSort } from "$lib/types/asset";
import { SortState } from "./sort.svelte";

const DB_NAME = "viz";
const DEFAULTS: AssetSort = {
    display: "cover",
    group: { by: "year", order: "ASC" },
    by: "taken_at",
    order: "DESC"
} as const;

async function clearSettingsStore() {
    const db = await openDB(DB_NAME, 2);
    await db.clear("settings");
    db.close();
}

async function readStored(key: string) {
    const db = await openDB(DB_NAME, 2);
    const stored = await db.get("settings", key);
    db.close();
    return stored;
}

// Flush the Svelte effect scheduler and let async IndexedDB ops settle.
async function settle() {
    flushSync();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
}

// Poll until the auto-save effect has written a value for the key.
async function waitForStored(key: string) {
    for (let i = 0; i < 50; i++) {
        const stored = await readStored(key);
        if (stored !== undefined) {
            return stored;
        }
        await new Promise((resolve) => setTimeout(resolve, 5));
    }
    return undefined;
}

// Poll until the async load has hydrated the instance with the expected value.
async function waitForValue(state: SortState, expected: AssetSort) {
    for (let i = 0; i < 50; i++) {
        if (JSON.stringify(state.value) === JSON.stringify(expected)) {
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, 5));
    }
}

describe("SortState", () => {
    beforeEach(async () => {
        await clearSettingsStore();
    });

    it("starts with defaults when nothing is stored", async () => {
        const state = new SortState("test-defaults");
        await waitForValue(state, DEFAULTS);

        expect(state.value).toEqual(DEFAULTS);
    });

    it("saves mutations to the settings store as a plain object", async () => {
        const state = new SortState("test-save");
        await waitForValue(state, DEFAULTS);

        state.value.by = "name";
        state.value.order = "ASC";
        state.value.group.by = "month";

        const stored = await waitForStored("sort.test-save");
        expect(stored).toEqual({
            display: "cover",
            group: { by: "month", order: "ASC" },
            by: "name",
            order: "ASC"
        });
    });

    it("loads previously stored values into a new instance", async () => {
        const first = new SortState("test-load");
        await waitForValue(first, DEFAULTS);

        first.value.by = "recently_added";
        first.value.group.order = "DESC";
        await waitForStored("sort.test-load");

        const second = new SortState("test-load");
        await waitForValue(second, {
            display: "cover",
            group: { by: "year", order: "DESC" },
            by: "recently_added",
            order: "DESC"
        });

        expect(second.value).toEqual({
            display: "cover",
            group: { by: "year", order: "DESC" },
            by: "recently_added",
            order: "DESC"
        });
    });

    it("keeps its own storage key per section", async () => {
        const sectionA = new SortState("test-section-a");
        const sectionB = new SortState("test-section-b");
        await settle();

        sectionA.value.by = "updated_at";
        sectionB.value.by = "name";

        const storedA = await waitForStored("sort.test-section-a");
        const storedB = await waitForStored("sort.test-section-b");
        expect(storedA).toMatchObject({ by: "updated_at" });
        expect(storedB).toMatchObject({ by: "name" });
        expect(storedA).not.toEqual(storedB);
    });

    it("hydrates from stored values when they differ from defaults", async () => {
        const seed = new SortState("test-hydrate");
        await waitForValue(seed, DEFAULTS);

        seed.value.by = "name";
        await waitForStored("sort.test-hydrate");

        const hydrated = new SortState("test-hydrate");
        await waitForValue(hydrated, { ...DEFAULTS, by: "name" });

        expect(hydrated.value.by).toBe("name");
        expect(hydrated.value.order).toBe("DESC");
    });
});
