import { DataKeys } from "#lib/dependency-keys.js";
import { collectionDetailSort } from "#lib/states/sort.svelte.js";
import { sendVizAPIRequest } from "#lib/utils/http.js";
import { getCollection } from "@viz/api";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params, depends }) => {
    depends(DataKeys.Collection);

    return sendVizAPIRequest(
        getCollection(params.uid, {
            sortBy: collectionDetailSort.value.by,
            order: collectionDetailSort.value.order
        }),
        "Failed to load collection"
    );
};
