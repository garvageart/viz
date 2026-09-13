import { type ImageAsset, type ImagesListResponse, listCollectionImages, listImages } from "@viz/api";
import { PaginationState } from "$lib/states/index.svelte";
import { collectionDetailSort, photosSort } from "$lib/states/sort.svelte";

// Helper class for managing gallery state
// This ensures we can mutate state (append images) while still initializing from data
export class ImagesPaginationState extends PaginationState<ImageAsset> {
    constructor(data?: ImagesListResponse) {
        super();
        if (!data) {
            return;
        }

        this.items = data.items?.map((i) => i.image);
        this.pagination = { limit: data.limit, page: data.page };
        this.totalCount = data.count;
        this.hasMore = Boolean(data.next);
    }

    get images(): ImageAsset[] {
        return this.items;
    }

    set images(value: ImageAsset[]) {
        this.items = value;
    }

    async paginate(collectionUid?: string) {
        if (!this.hasMore) {
            return;
        }

        const res = collectionUid
            ? await listCollectionImages(collectionUid, {
                  limit: this.pagination.limit,
                  page: this.pagination.page + 1,
                  sortBy: collectionDetailSort.value.by,
                  order: collectionDetailSort.value.order
              })
            : await listImages({
                  limit: this.pagination.limit,
                  page: this.pagination.page + 1,
                  sortBy: photosSort.value.by,
                  order: photosSort.value.order
              });

        if (res.status === 200) {
            const nextItems = res.data.items?.map((i) => i.image) ?? [];
            this.items.push(...nextItems);

            this.pagination.page = res.data.page;
            this.totalCount = res.data.count;
            this.hasMore = Boolean(res.data.next);
        } else {
            this.hasMore = false;
        }
    }
}
