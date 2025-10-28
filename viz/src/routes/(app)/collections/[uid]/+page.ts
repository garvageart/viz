import type { PageLoad } from "./$types";
import { getCollection } from "$lib/api";

export const load: PageLoad = async ({ params }) => {
    const collectionImages = await getCollection(params.uid);
    if (collectionImages.status !== 200) {
        throw new Error(`Failed to load collection images: ${collectionImages.status}`);
    }

    return collectionImages.data;
};