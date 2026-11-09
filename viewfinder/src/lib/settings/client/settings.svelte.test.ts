import { beforeEach, describe, expect, it } from "vitest";
import { initDB } from "#lib/db/client.js";
import { DEFAULT_SETTINGS, SettingsDatabase, settings } from "#lib/settings/client/settings.svelte.js";

async function clearSettingsStore() {
    const db = await initDB();
    await db.clear("settings");
    db.close();
}

async function readScopeFromDb<T>(scopeKey: string): Promise<T | undefined> {
    const db = await initDB();
    const stored = (await db.get("settings", scopeKey)) as T | undefined;
    db.close();

    return stored;
}

async function waitForStoredScope<T>(scopeKey: string, predicate?: (val: T) => boolean): Promise<T | undefined> {
    for (let i = 0; i < 50; i++) {
        const stored = await readScopeFromDb<T>(scopeKey);
        if (stored !== undefined && (!predicate || predicate(stored))) {
            return stored;
        }

        await new Promise((resolve) => setTimeout(resolve, 5));
    }
    return undefined;
}

describe("SettingsDatabase", () => {
    beforeEach(async () => {
        await clearSettingsStore();
    });

    it("returns default values when nothing is stored", () => {
        const upload = settings.get("upload");
        expect(upload.concurrency).toBe(2);

        const lightbox = settings.get("imageLightbox");
        expect(lightbox.filmstrip.visible).toBe(true);
        expect(lightbox.filmstrip.position).toBe("bottom");
    });

    it("persists mutations to IndexedDB automatically", async () => {
        await settings.init();

        const upload = settings.get("upload");
        upload.concurrency = 6;

        const stored = await waitForStoredScope<{ concurrency: number }>("upload", (val) => val.concurrency === 6);
        expect(stored).toEqual({ concurrency: 6 });
    });

    it("persists nested property mutations to IndexedDB", async () => {
        await settings.init();

        const lightbox = settings.get("imageLightbox");
        lightbox.filmstrip.visible = false;
        lightbox.filmstrip.position = "side";

        const stored = await waitForStoredScope<typeof lightbox>(
            "imageLightbox",
            (val) => val.filmstrip.visible === false && val.filmstrip.position === "side"
        );
        expect(stored?.filmstrip.visible).toBe(false);
        expect(stored?.filmstrip.position).toBe("side");
    });

    it("hydrates from IndexedDB during initialization", async () => {
        const db = await initDB();
        await db.put("settings", { concurrency: 9 }, "upload");
        await db.put("settings", { showCollections: true, showImages: true }, "favourites");
        db.close();

        const freshSettings = new SettingsDatabase(DEFAULT_SETTINGS);
        await freshSettings.init();

        expect(freshSettings.get("upload").concurrency).toBe(9);
        expect(freshSettings.get("favourites")).toEqual({
            showCollections: true,
            showImages: true
        });
    });

    it("ignores unknown keys during initialization without throwing", async () => {
        const db = await initDB();
        await db.put("settings", { unknownData: 123 }, "nonExistentScope");
        db.close();

        const freshSettings = new SettingsDatabase(DEFAULT_SETTINGS);
        await expect(freshSettings.init()).resolves.toBeUndefined();
    });

    it("supports agnostic custom schemas", async () => {
        interface CustomSchema {
            theme: { mode: string; accent: string };
            player: { volume: number; autoplay: boolean };
        }

        const customDefaults: CustomSchema = {
            theme: { mode: "dark", accent: "blue" },
            player: { volume: 80, autoplay: false }
        };

        const customDb = new SettingsDatabase<CustomSchema>(customDefaults);
        await customDb.init();

        const player = customDb.get("player");
        player.volume = 42;

        const stored = await waitForStoredScope<{ volume: number; autoplay: boolean }>(
            "player",
            (val) => val.volume === 42
        );
        expect(stored?.volume).toBe(42);
        expect(stored?.autoplay).toBe(false);
    });
});
