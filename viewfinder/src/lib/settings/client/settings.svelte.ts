import type {
    DownloadScopeSettings,
    ExportScopeSettings,
    FavouritesScopeSettings,
    ImageLightboxScopeSettings,
    SortScopeSettings,
    UploadScopeSettings
} from "#lib/settings/client/index.js";
import type { EntitySort } from "#lib/types/asset.js";
import { initDB } from "../../db/client.js";

export interface AppSettings {
    sort: SortScopeSettings;
    upload: UploadScopeSettings;
    download: DownloadScopeSettings;
    imageLightbox: ImageLightboxScopeSettings;
    export: ExportScopeSettings;
    favourites: FavouritesScopeSettings;
}

export type SettingKey<T> = Extract<keyof T, string>;

const defaultSort: EntitySort = {
    display: "cover",
    group: {
        by: "year",
        order: "ASC"
    },
    by: "taken_at",
    order: "DESC"
};

export const DEFAULT_SETTINGS: AppSettings = {
    sort: {
        photos: { ...defaultSort },
        collections: { ...defaultSort },
        collectionDetail: { ...defaultSort }
    },
    upload: {
        concurrency: 2
    },
    download: {
        concurrency: 2
    },
    imageLightbox: {
        filmstrip: {
            visible: true,
            position: "bottom"
        },
        sidePanel: {
            visible: true
        }
    },
    export: {
        panel: {
            format: "jpg",
            quality: 80,
            resizeMode: "none",
            resizeWidth: 2048,
            resizeHeight: 2048,
            colorSpace: "sRGB",
            includeLocation: true,
            includeMetadata: true,
            metadata: "all",
            destinationMode: "zip",
            bitDepth: 8
        },
        rename: {
            namingMode: "original",
            customName: "",
            namingTemplate: "{{basename}}",
            sequenceStart: 1,
            sequencePadding: 4,
            builderRows: [
                {
                    id: "default-row",
                    type: "original",
                    textValue: "",
                    dateFormat: "YYYY-MM-DD",
                    metadataField: "model",
                    sequencePadding: 4
                }
            ]
        },
        sections: {
            destination: true,
            naming: true,
            settings: true,
            sizing: true,
            metadata: false,
            watermarking: false
        }
    },
    favourites: {
        showCollections: false,
        showImages: false
    }
};

export class SettingsDatabase<T extends Record<string, any>> {
    private data: T;
    private ready = $state(false);

    constructor(defaults: T) {
        this.data = $state(structuredClone(defaults));

        $effect.root(() => {
            for (const key of Object.keys(defaults) as SettingKey<T>[]) {
                $effect(() => {
                    const snapshot = $state.snapshot(this.data[key]);
                    if (!this.ready) {
                        return;
                    }

                    void this.saveScope(key, snapshot);
                });
            }
        });
    }

    async init(): Promise<void> {
        try {
            const db = await initDB();
            const tx = db.transaction("settings", "readonly");
            const keys = await tx.store.getAllKeys();
            const values = await tx.store.getAll();

            await tx.done;

            for (let i = 0; i < keys.length; i++) {
                const key = String(keys[i]) as SettingKey<T>;
                if (!(key in this.data)) {
                    continue;
                }

                if (values[i] !== undefined) {
                    this.data[key] = values[i];
                }
            }
        } catch (e) {
            console.error("[SettingsDatabase] Failed to initialize settings from IndexedDB", e);
        } finally {
            this.ready = true;
        }
    }

    private async saveScope(key: SettingKey<T>, value: unknown): Promise<void> {
        try {
            const db = await initDB();
            await db.put("settings", value, key);
        } catch (e) {
            console.error(`[SettingsDatabase] Failed to save settings for scope: ${key}`, e);
        }
    }

    get<K extends SettingKey<T>>(key: K): T[K] {
        return this.data[key];
    }
}

export const settings = new SettingsDatabase<AppSettings>(DEFAULT_SETTINGS);
