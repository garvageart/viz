import { initDB } from "#lib/db/client.js";
import { settings } from "#lib/settings/client/settings.svelte.js";
import type { EntitySort } from "#lib/types/asset.js";
import { beforeEach, describe, expect, it } from "vitest";
import { SortState } from "./sort.svelte";

const DEFAULTS: EntitySort = {
    display: "cover",
    group: { by: "year", order: "ASC" },
    by: "taken_at",
    order: "DESC"
} as const;

async function clearSettingsStore() {
    const db = await initDB();
    await db.clear("settings");
    db.close();
}

async function readStoredSort(section: string) {
    const db = await initDB();
    const stored = (await db.get("settings", "sort")) as Record<string, EntitySort> | undefined;
    db.close();
    return stored?.[section];
}

async function waitForStored(section: string) {
    for (let i = 0; i < 50; i++) {
        const stored = await readStoredSort(section);
        if (stored !== undefined) {
            return stored;
        }
        await new Promise((resolve) => setTimeout(resolve, 5));
    }
    return undefined;
}

describe("SortState", () => {
    beforeEach(async () => {
        await clearSettingsStore();
        await settings.init();
    });

    it("starts with defaults when nothing is stored", () => {
        const state = new SortState("test-defaults");
        expect(state.value).toEqual(DEFAULTS);
    });

    it("saves mutations to the settings store under the sort scope", async () => {
        const state = new SortState("test-save");
        state.value.by = "name";
        state.value.order = "ASC";
        state.value.group.by = "month";

        const stored = await waitForStored("test-save");
        expect(stored).toEqual({
            display: "cover",
            group: { by: "month", order: "ASC" },
            by: "name",
            order: "ASC"
        });
    });

    it("loads previously stored values when initialized", async () => {
        const db = await initDB();
        await db.put(
            "settings",
            {
                "test-load": {
                    display: "cover",
                    group: { by: "year", order: "DESC" },
                    by: "recently_added",
                    order: "DESC"
                }
            },
            "sort"
        );
        db.close();

        await settings.init();
        const state = new SortState("test-load");

        expect(state.value).toEqual({
            display: "cover",
            group: { by: "year", order: "DESC" },
            by: "recently_added",
            order: "DESC"
        });
    });

    it("keeps its own storage section per section name", async () => {
        const sectionA = new SortState("test-section-a");
        const sectionB = new SortState("test-section-b");

        sectionA.value.by = "updated_at";
        sectionB.value.by = "name";

        const storedA = await waitForStored("test-section-a");
        const storedB = await waitForStored("test-section-b");
        expect(storedA).toMatchObject({ by: "updated_at" });
        expect(storedB).toMatchObject({ by: "name" });
        expect(storedA).not.toEqual(storedB);
    });
});
