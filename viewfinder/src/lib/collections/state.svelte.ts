import { type Collection, type CollectionListResponse, listCollections } from "@viz/api";
import { ImagesPaginationState } from "$lib/images/state.svelte";
import { PaginationState } from "$lib/states/index.svelte";
import { collectionsSort } from "$lib/states/sort.svelte";

// Helper class for managing collection gallery state.
// It initializes from the route-load response and appends pages via listCollections.
export class CollectionsPaginationState extends PaginationState<Collection> {
    images = new ImagesPaginationState();

    constructor(data?: CollectionListResponse) {
        super();
        if (!data) {
            return;
        }

        this.items = data.items;
        this.pagination = { limit: data.limit, page: data.page };
        this.totalCount = data.count;
        this.hasMore = Boolean(data.next);
    }

    async paginate() {
        if (!this.hasMore) {
            return;
        }

        const res = await listCollections({
            limit: this.pagination.limit,
            page: this.pagination.page + 1,
            sortBy: collectionsSort.value.by as "name" | "recently_added" | "updated_at",
            order: collectionsSort.value.order
        });

        if (res.status === 200) {
            this.items.push(...res.data.items);
            this.pagination.page = res.data.page;
            this.totalCount = res.data.count;
            this.hasMore = Boolean(res.data.next);
        } else {
            this.hasMore = false;
        }
    }

    async paginateImages(collectionUid: string) {
        return this.images.paginate(collectionUid);
    }
}
