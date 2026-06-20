import { initDB } from "./client";

export class DbSettings<T> {
    private key: string;
    private dbPromise = initDB();

    constructor(key: string) {
        this.key = key;
    }

    /**
     * Loads settings from IndexedDB. Returns undefined if not found or on error.
     */
    async load(): Promise<T | undefined> {
        try {
            const db = await this.dbPromise;
            return (await db.get("settings", this.key)) as T | undefined;
        } catch (e) {
            console.error(`[DbSettings] Failed to load settings for key: ${this.key}`, e);
            return undefined;
        }
    }

    /**
     * Saves settings to IndexedDB.
     */
    async save(value: T): Promise<void> {
        try {
            const db = await this.dbPromise;
            await db.put("settings", value, this.key);
        } catch (e) {
            console.error(`[DbSettings] Failed to save settings for key: ${this.key}`, e);
        }
    }
}
