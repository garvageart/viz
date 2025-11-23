import type { ImageObjectData } from "$lib/entities/image";
import type CollectionData from "$lib/entities/collection";
import type { AssetSort } from "$lib/types/asset";
import type { UploadImage } from "$lib/upload/asset.svelte";
import { writable } from "svelte/store";
import { type User } from "$lib/api/client";
import { VizLocalStorage, VizCookieStorage } from "$lib/utils/misc";

class LoginState {
    storage: VizCookieStorage<string>;
    value: string | null = $state(null);
    constructor() {
        // shitty hack
        this.storage = new VizCookieStorage<string>('state');
        this.storage.prefix = "imag";
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

export let showHeader = writable(true);

export let user = $state<{ data: User | null; loading: boolean; fetched: boolean; error?: string | null; isAdmin: boolean; }>({
    data: null,
    loading: false,
    fetched: false,
    error: null,
    isAdmin: false
});

export let search = $state({
    loading: false,
    executed: false,
    data: {
        collections: {
            data: [] as CollectionData[]
        },
        images: {
            data: [] as ImageObjectData[]
        }
    },
    value: "",
    enableHomePageSearch: false,
    element: undefined as unknown as HTMLInputElement | undefined
});

export let modal = $state({
    show: false
});

export let lightbox = $state({
    show: false
});

// eventually this will move to a different page with a different way of enabling, this is just temporary
class DebugState {
    storage = new VizLocalStorage<boolean>('debugMode');
    value: boolean = $state(this.storage.get() ?? false);

    toggle() {
        this.value = !this.value;
    }
}
export const debugState = new DebugState();
export let debugMode = debugState.value;

class SortState {
    private storage = new VizLocalStorage<AssetSort>("sort");

    value: AssetSort = $state(
        this.storage.get() ?? {
            display: "cover",
            group: {
                by: "year",
                order: "asc",
            },
            by: "name",
            order: "asc",
        }
    );

    constructor() { }

    save() {
        this.storage.set(this.value);
    }
}

export const sortState = new SortState();
export let sort = sortState.value;

export let upload = $state({
    files: [] as UploadImage[],
    concurrency: 2,
    stats: {
        errors: 0,
        duplicates: 0,
        success: 0,
        total: 0
    }
});

export let continuePath = $state<string | null>(null);

class ThemeState {
    ls = new VizLocalStorage<'light' | 'dark'>('theme');
    cs = new VizCookieStorage<'light' | 'dark'>('theme');

    value: 'light' | 'dark' = $state(this.getInitialTheme());

    private getInitialTheme(): 'light' | 'dark' {
        // Preference: 1. LocalStorage, 2. OS preference
        const storedTheme = this.ls.get();
        if (storedTheme) {
            return storedTheme;
        }
        return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
    }

    toggle() {
        this.value = this.value === 'dark' ? 'light' : 'dark';
    }
}

export const themeState = new ThemeState();
export let theme = themeState.value;

export function toggleTheme() {
    themeState.toggle();
}