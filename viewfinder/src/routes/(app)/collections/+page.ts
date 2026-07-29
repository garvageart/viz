import { error } from "@sveltejs/kit";
import { listCollections } from "$lib/api";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch }) => {
    const response = await listCollections({}, { fetch });

    if (response.status !== 200) {
        error(response.status, {
            message: response.data.error || "Failed to load collections"
        });
    }

    return response.data;
};
