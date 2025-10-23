import type { ImageObjectData } from "$lib/entities/image";
import type { AssetSort } from "$lib/types/asset";
import type { Collection } from "$lib/types/images";
import type { UploadImage } from "$lib/upload/asset.svelte";
import { cookieMethods } from "$lib/utils/cookie";
import { writable } from "svelte/store";

export let login = $state({
    state: cookieMethods.get("imag-state")
});

export let sidebar = $state({
    open: false
});

export let showHeader = writable(true);

export let search = $state({
    loading: false,
    executed: false,
    data: {
        collections: {
            data: [] as unknown as Collection[]
        },
        images: {
            data: [] as unknown as ImageObjectData[]
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

/**
 * @todo Get sort options from saved settings by these are the defaults for now
 */
export let sort: AssetSort = $state({
    display: "cover",
    group: {
        by: "year",
        order: "asc",
    },
    by: "name",
    order: "asc",
});

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