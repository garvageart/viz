import { listImages } from "$lib/api";
import { sort } from "$lib/states/index.svelte";
import { sendVizAPIRequest } from "$lib/utils/http";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
    return sendVizAPIRequest(
        listImages({
            limit: 100,
            page: 0,
            sortBy: sort.by,
            order: sort.order
        }),
        "Failed to load images"
    );
};
