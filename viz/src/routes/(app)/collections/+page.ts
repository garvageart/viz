import type { Collection, CollectionResponse } from "$lib/types/images";
import type { PageLoad } from "./$types";
import { sendAPIRequest } from "$lib/utils/http";
import CollectionData from "$lib/entities/collection";

export const load: PageLoad = async ({ fetch }) => {
    let allCollections: CollectionResponse | undefined = undefined;

    const res = await sendAPIRequest<CollectionResponse>("collections", { fetch });
    allCollections = {
        ...res,
        items: res.items.map(item => new CollectionData({
            ...item,
            // @ts-ignore
            "created_on": new Date(item["CreatedAt"]),
            // @ts-ignore
            "updated_on": new Date(item["UpdatedAt"]),
            images: item.images ?? [],

        }))
    };



    return allCollections;
};
