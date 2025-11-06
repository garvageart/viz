import type { ImageObjectData } from "$lib/entities/image";
import type CollectionData from "$lib/entities/collection";
import type { AssetSort } from "$lib/types/asset";
import type { UploadImage } from "$lib/upload/asset.svelte";
import { cookieMethods } from "$lib/utils/cookie";
import { writable } from "svelte/store";
import { type User, getCurrentUser } from "$lib/api/client";
import { VizLocalStorage } from "$lib/utils/misc";

export let login = $state({
    state: cookieMethods.get("imag-state")
});

export let sidebar = $state({
    open: false
});

export let showHeader = writable(true);

// Authenticated user state (Svelte 5 runes)
export let user = $state<{ data: User | null; loading: boolean; fetched: boolean; error?: string | null; isAdmin: boolean; }>({
    data: null,
    loading: false,
    fetched: false,
    error: null,
    isAdmin: false
});

export async function fetchCurrentUser(): Promise<User | null> {
    user.loading = true;
    try {
        const result = await getCurrentUser();

        if (result.status === 200) {
            user.data = result.data;
            user.error = null;
            user.isAdmin = result.data.role.includes('admin');
            return result.data;
        } else {
            user.data = null;
            user.error = null;
            return null;
        }
    } catch (err: any) {
        user.data = null;
        user.error = err?.message ?? 'Failed to fetch current user';
        return null;
    } finally {
        user.loading = false;
        user.fetched = true;
    }
}

export function clearUser() {
    user.data = null;
    user.error = null;
    user.fetched = true;
}

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