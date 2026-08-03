import { getCollection } from "$lib/api";
import { DataKeys } from "$lib/dependency-keys";
import { collectionDetailSort } from "$lib/states/sort.svelte";
import { sendVizAPIRequest } from "$lib/utils/http";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params, depends, route, url }) => {
    depends(DataKeys.Collection);

    return sendVizAPIRequest(
        getCollection(params.uid, {
            sortBy: collectionDetailSort.value.by,
            order: collectionDetailSort.value.order
        }),
        "Failed to load collection"
    );
};
