import { getCollection } from "$lib/api";
import { DataKeys } from "$lib/dependency-keys";
import { sort } from "$lib/states/index.svelte";
import { sendVizAPIRequest } from "$lib/utils/http";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params, depends, route, url }) => {
    depends(DataKeys.Collection);

    return sendVizAPIRequest(
        getCollection(params.uid, {
            sortBy: sort.by,
            order: sort.order
        }),
        "Failed to load collection"
    );
};
