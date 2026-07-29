import { error } from "@sveltejs/kit";
import { getCollection } from "$lib/api";
import { sort } from "$lib/states/index.svelte";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params, fetch }) => {
    const collectionImages = await getCollection(
        params.uid,
        {
            sortBy: sort.by,
            order: sort.order
        },
        { fetch }
    );
    if (collectionImages.status !== 200) {
        error(collectionImages.status, {
            message: collectionImages.data.error || "Failed to load collection"
        });
    }

    return collectionImages.data;
};
