import type { Collection, CollectionDetailResponse } from "@viz/api";

export function isCollectionData(data: unknown): data is Collection | CollectionDetailResponse {
    return typeof data === "object" && data !== null && "image_count" in data;
}
