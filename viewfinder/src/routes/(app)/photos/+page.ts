import { error } from "@sveltejs/kit";
import { listImages } from "$lib/api";
import { sort } from "$lib/states/index.svelte";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
    const response = await listImages({
        limit: 100,
        page: 0,
        sortBy: sort.by,
        order: sort.order
    });

    if (response.status === 200) {
        return response.data;
    }

    error(response.status, {
        message: response.data.error || "Failed to load images"
    });
};
