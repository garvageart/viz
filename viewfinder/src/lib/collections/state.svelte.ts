import type { Collection, CollectionListResponse } from "@viz/api";

// Helper class for managing collection gallery state.
// It initializes from the route-load response and appends pages via listCollections.
export class CollectionsPaginationState {
    items = $state<Collection[]>([]);
    pagination = $state({ limit: 50, page: 0 });
    totalCount = $state(0);
    hasMore = $state(false);

    constructor(data: CollectionListResponse | undefined) {
        if (!data) {
            return;
        }

        this.items = data.items ?? [];
        this.pagination = {
            limit: data.limit ?? 50,
            page: data.page ?? 0
        };

        this.totalCount = data.count ?? data.items?.length ?? 0;
        this.hasMore = !!data.next;
    }
}
