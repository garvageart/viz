import type { PageLoad } from "./$types";
import { listCollections } from "$lib/api";

export const load: PageLoad = async () => {
    const response = await listCollections();

    if (response.status !== 200) {
        throw new Error(`Failed to load collections: ${response.status}`);
    }

    return response.data;
};
