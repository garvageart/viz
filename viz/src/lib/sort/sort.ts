import type CollectionData from "$lib/entities/collection";
import type { ImageObjectData } from "$lib/entities/image";
import type { AssetSort } from "$lib/types/asset";
import { orderBy } from "lodash-es";

export function sortCollectionImages(assets: ImageObjectData[], sort: AssetSort) {
    switch (sort.by) {
        case "name":
            return orderBy(assets, "name", sort.order);
        case "created_at":
            return orderBy(assets, "created_at", sort.order);
        case "updated_at":
            return orderBy(assets, "updated_at", sort.order);
        case "most_recent":
            return orderBy(assets, "updated_at", sort.order);
        default:
            return assets;
    }
}

export function sortCollections(collections: CollectionData[], sort: AssetSort) {
    switch (sort.by) {
        case "name":
            return orderBy(collections, "name", sort.order);
        case "created_at":
            return orderBy(collections, "created_at", sort.order);
        case "updated_at":
            return orderBy(collections, "updated_at", sort.order);
        case "oldest":
            return orderBy(collections, "created_at", "asc");
        case "most_recent":
            return orderBy(collections, "updated_at", sort.order);
            return orderBy(collections, (col) => col.updated_at || col.created_at, "desc");
        default:
            return collections;
    }
}