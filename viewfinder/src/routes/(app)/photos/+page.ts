import { listImages } from "@viz/api";
import { DataKeys } from "$lib/dependency-keys";
import { photosSort } from "$lib/states/sort.svelte";
import { sendVizAPIRequest } from "$lib/utils/http";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ depends }) => {
    depends(DataKeys.Photos);

    return sendVizAPIRequest(
        listImages({
            limit: 100,
            page: 0,
            sortBy: photosSort.value.by,
            order: photosSort.value.order
        }),
        "Failed to load images"
    );
};
