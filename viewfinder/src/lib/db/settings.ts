import { initDB } from "./client";

export class DbSettings<T> {
    private key: string;
    private dbPromise: ReturnType<typeof initDB> | null = null;

    constructor(key: string) {
        this.key = key;
    }

    private getDb() {
        if (!this.dbPromise) {
            this.dbPromise = initDB();
        }
        return this.dbPromise;
    }

    /**
     * Loads settings from IndexedDB. Returns undefined if not found or on error.
     */
    async load(): Promise<T | undefined> {
        try {
            const db = await this.getDb();
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
            const db = await this.getDb();
            await db.put("settings", value, this.key);
        } catch (e) {
            console.error(`[DbSettings] Failed to save settings for key: ${this.key}`, e);
        }
    }
}
