import type { APICollectionListResponse } from "$lib/types/api-adapters";
import type { PageLoad } from "./$types";
import { sendAPIRequest } from "$lib/utils/http";
import CollectionData from "$lib/entities/collection";

export const load: PageLoad = async ({ fetch }) => {
    const res = await sendAPIRequest<APICollectionListResponse>("collections", { fetch });

    const allCollections = {
        ...res,
        items: res.items.map(item => CollectionData.fromAPI(item))
    };

    return allCollections;
};
