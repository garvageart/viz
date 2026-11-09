import { page } from "$app/state";
import {
    type Collection,
    type ImageAsset,
    type Setting,
    type SystemStatusResponse,
    type User,
    type VizConfig,
    getSystemConfig,
    updateUserSetting
} from "@viz/api";
import { MediaQuery } from "svelte/reactivity";
import type { MenuItem } from "#lib/context-menu/types.js";
import type { DownloadFile } from "#lib/download/asset.svelte.js";
import { settings } from "#lib/settings/client/settings.svelte.js";
import type { EntityViewType } from "#lib/types/asset.js";
import type { UploadImage } from "#lib/upload/asset.svelte.js";
import { VizCookieStorage, VizLocalStorage } from "#lib/utils/misc.js";

// Types
interface UserState {
    data?: User;
    loading: boolean;
    fetched: boolean;
    error?: string | null;
    isAdmin: boolean;
    connectionError?: boolean;
    settings?: Setting[] | null;
}

export let system = $state<{
    data: SystemStatusResponse | null;
    loading: boolean;
    fetched: boolean;
    error: string | null;
}>({
    data: null,
    loading: false,
    fetched: false,
    error: null
});

export let config = $state<{
    data: VizConfig | null;
    loading: boolean;
    fetched: boolean;
    error: string | null;
}>({
    data: null,
    loading: false,
    fetched: false,
    error: null
});

export async function fetchSystemConfig(opts?: { fetch?: typeof window.fetch }) {
    if (config.fetched) {
        return;
    }

    config.loading = true;
    try {
        const res = await getSystemConfig(opts);
        if (res.status === 200) {
            config.data = res.data;
            config.fetched = true;
            config.error = null;
        } else {
            config.error = "Failed to load system config";
        }
    } catch (e: any) {
        config.error = e?.message || "Failed to load system config";
    } finally {
        config.loading = false;
    }
}

class LoginState {
    private storage: VizCookieStorage<string>;
    value: string | null = $state(null);
    constructor() {
        // shitty hack
        this.storage = new VizCookieStorage<string>("state");
        this.storage.prefix = "viz";
        this.value = this.storage.get();
    }
}

const loginState = new LoginState();
export let login = $state({
    state: loginState.value
});

export let sidebar = $state({
    open: false
});

export let showHeader = $state(true);

export let user = $state<UserState>({
    data: undefined,
    loading: false,
    fetched: false,
    error: null,
    isAdmin: false,
    connectionError: false,
    settings: null
});

export let search = $state({
    loading: false,
    executed: false,
    data: {
        collections: {
            data: [] as Collection[]
        },
        images: {
            data: [] as ImageAsset[]
        }
    },
    pagination: {
        page: 0,
        limit: 100,
        count: 0,
        hasMore: false
    },
    value: "",
    enableHomePageSearch: false,
    element: undefined as HTMLInputElement | undefined
});

export let lightbox = $state({
    show: false
});

export function isLayoutPage() {
    return page.url.pathname === "/";
}

// eventually this will move to a different page with a different way of enabling, this is just temporary
class DebugState {
    storage = new VizLocalStorage<boolean>("debugMode");
    value: boolean = $state(this.storage.get() ?? false);

    toggle() {
        this.value = !this.value;
    }
}
export const debugState = new DebugState();
export let debugMode = debugState.value;

export class TableColumnSettings {
    storage = new VizLocalStorage<string[]>("tableColumnSettings");
    // Default columns (Preview is hardcoded in EntityView, so we just track the dynamic ones)
    value: string[] = $state(this.storage.get() ?? ["name", "created_at"]);

    toggle(column: string) {
        if (this.value.includes(column)) {
            this.value = this.value.filter((c) => c !== column);
        } else {
            this.value = [...this.value, column];
        }
        this.storage.set(this.value);
    }

    set(columns: string[]) {
        this.value = columns;
        this.storage.set(this.value);
    }
}

export const tableColumnSettings = new TableColumnSettings();

class ViewSettingsState {
    storage = new VizLocalStorage<EntityViewType>("viewSettings");
    showDatesStorage = new VizLocalStorage<boolean>("showGridDates");
    showSimpleStorage = new VizLocalStorage<boolean>("showGridSimple");

    current: EntityViewType = $state(this.storage.get() ?? "grid");
    showDates: boolean = $state(this.showDatesStorage.get() ?? false);
    simple: boolean = $state(this.showSimpleStorage.get() ?? false);

    displayOptions: MenuItem[] = [
        { id: "view-grid", label: "Grid" },
        { id: "view-list", label: "List" },
        { id: "view-custom", label: "Custom" }
    ];

    setView(view: EntityViewType) {
        this.current = view;
        this.storage.set(view);
    }

    toggleShowDates() {
        this.showDates = !this.showDates;
        this.showDatesStorage.set(this.showDates);
    }

    toggleShowSimple() {
        this.simple = !this.simple;
        this.showSimpleStorage.set(this.simple);
    }
}

export const viewSettings = new ViewSettingsState();

class UploadState {
    files: UploadImage[] = $state([]);
    activeCount: number = $state(0);
    stats = $state({
        errors: 0,
        duplicates: 0,
        success: 0
    });
    total = $derived.by(() => {
        return Object.values(this.stats).reduce((p, c) => p + c, 0);
    });

    get concurrency(): number {
        return settings.get("upload").concurrency;
    }

    set concurrency(val: number) {
        settings.get("upload").concurrency = val;
    }

    /** Resolves once persisted settings have been applied (or none were stored). */
    async ready(): Promise<void> {
        return Promise.resolve();
    }
}

export const uploadState = new UploadState();
export let upload = uploadState;

class DownloadState {
    files: DownloadFile[] = $state([]);
    activeCount: number = $state(0);
    stats = $state({
        errors: 0,
        duplicates: 0,
        success: 0,
        total: 0
    });

    get concurrency(): number {
        return settings.get("download").concurrency;
    }

    set concurrency(val: number) {
        settings.get("download").concurrency = val;
    }

    async ready(): Promise<void> {
        return Promise.resolve();
    }
}

export const downloadState = new DownloadState();
export let download = downloadState;

export let continuePath = $state<string | null>(null);

export type ThemeOption = "light" | "dark" | "system";

class ThemeState {
    ls = new VizLocalStorage<ThemeOption>("theme");
    prefLs = new VizLocalStorage<ThemeOption>("preferred_theme");

    value: ThemeOption = $state(this.getInitialTheme());
    preferredTheme: ThemeOption = $state(this.getInitialPreference());

    private media = new MediaQuery("prefers-color-scheme: dark");
    systemPref = $derived((this.media?.current ?? false) ? "dark" : "light");

    resolved = $derived(this.value === "system" ? this.systemPref : this.value);
    resolvedPreference = $derived(this.preferredTheme === "system" ? this.systemPref : this.preferredTheme);

    constructor() {}

    private getInitialTheme(): ThemeOption {
        // Preference: 1. LocalStorage, 2. Default to system
        const storedTheme = this.ls.get();
        if (storedTheme) {
            return storedTheme;
        }
        return "system";
    }

    private getInitialPreference(): ThemeOption {
        const stored = this.prefLs.get();
        if (stored) {
            return stored;
        }

        return "system";
    }

    async setPreferredTheme(theme: ThemeOption) {
        this.preferredTheme = theme;
        this.prefLs.set(theme);
        try {
            await updateUserSetting("theme", { value: theme });
        } catch (e) {
            console.error("Failed to sync theme preference", e);
        }
    }

    toggle() {
        // If we are NOT at our default preference, return to it.
        if (this.resolved !== this.resolvedPreference) {
            this.value = this.preferredTheme;
            return;
        }

        const currentResolved = this.resolved;
        const targetResolved = currentResolved === "dark" ? "light" : "dark";

        // If 'system' preference matches the target visual state, prefer 'system'.
        // This ensures we default to system behavior when possible, while guaranteeing a visual switch.
        if (this.systemPref === targetResolved) {
            this.value = "system";
        } else {
            this.value = targetResolved;
        }
    }
}

export const themeState = new ThemeState();
export function getTheme() {
    return themeState.resolved;
}

export function toggleTheme() {
    themeState.toggle();
}

export let isMobile = new MediaQuery("(max-width: 40rem)").current;

export abstract class PaginationState<T> {
    items = $state<T[]>([]);
    pagination = $state({ limit: 100, page: 0 });
    totalCount = $state(0);
    hasMore = $state(false);

    abstract paginate(): Promise<void>;
}

export { bootState } from "./boot.svelte";
