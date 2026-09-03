import { collectionDetailSort, collectionsSort, photosSort } from "$lib/states/sort.svelte";

/**
 * SvelteKit client init hook. Runs once on application startup
 * before routing begins or any load() functions execute.
 */
export async function init(): Promise<void> {
    await Promise.all([photosSort.ready(), collectionsSort.ready(), collectionDetailSort.ready()]);
}
