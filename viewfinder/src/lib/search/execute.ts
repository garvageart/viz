import { dev } from "$app/environment";
import { goto } from "$app/navigation";
import { page } from "$app/state";
import { executeSearch } from "$lib/api";
import { search } from "$lib/states/index.svelte";
import { sleep } from "$lib/utils/misc";
import { updateURLParameter } from "$lib/utils/url";

export function transformQueryString(queryStr: string) {
    return queryStr.replace(/\s/g, "+");
}
export function redirectToSearchWithQuery() {
    goto(`/search?q=${transformQueryString(search.value)}`);
}

export async function performSearch() {
    if (!search.value.trim()) {
        return;
    }

    // TODO: Create search results dropdown and have an option to go to the search page
    // if the results aren't sufficient for the user
    // For now we just redirect to the search page

    if (page.url.pathname !== "/search") {
        redirectToSearchWithQuery();
        return;
    }

    search.loading = true;
    search.executed = true;

    if (dev) {
        const randomLatency = dev ? Math.floor(Math.random() * 200) + 100 : 0;
        await sleep(randomLatency);
    }

    updateURLParameter("q", search.value);

    // Reset pagination on new search
    search.pagination.page = 0;
    search.pagination.hasMore = false;

    const res = await executeSearch(search.value, { limit: search.pagination.limit, page: 0 });
    if (res.status === 200) {
        search.data.images.data = res.data.images ?? [];
        search.data.collections.data = res.data.collections ?? [];

        search.pagination.page = res.data.page ?? 0;
        search.pagination.count = res.data.count ?? 0;
        search.pagination.hasMore = !!res.data.next;

        search.loading = false;
    } else {
        search.data.images.data = [];
        search.data.collections.data = [];
        search.loading = false;
        throw new Error(`Error fetching search results: ${res.data.error}`);
    }
}

export async function paginateSearch() {
    if (search.loading || !search.pagination.hasMore) return;

    search.loading = true;
    const nextPage = search.pagination.page + 1;

    try {
        const res = await executeSearch(search.value, { 
            limit: search.pagination.limit, 
            page: nextPage 
        });

        if (res.status === 200) {
            const nextImages = res.data.images ?? [];
            search.data.images.data.push(...nextImages);

            search.pagination.page = res.data.page ?? nextPage;
            search.pagination.hasMore = !!res.data.next;
        }
    } catch (error) {
        console.error("Pagination failed:", error);
    } finally {
        search.loading = false;
    }
}
 