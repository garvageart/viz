import { getCollection } from "$lib/api";
import { sort } from "$lib/states/index.svelte";
import { sendVizAPIRequest } from "$lib/utils/http";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params }) => {
    return sendVizAPIRequest(
        getCollection(params.uid, {
            sortBy: sort.by,
            order: sort.order
        }),
        "Failed to load collection"
    );
};
