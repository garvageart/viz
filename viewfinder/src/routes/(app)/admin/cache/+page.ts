import { getCacheStatus } from "$lib/api";
import { sendVizAPIRequest } from "$lib/utils/http";

export async function load() {
    const cacheStatus = await sendVizAPIRequest(getCacheStatus(), "Failed to load cache status");

    return {
        cacheStatus
    };
}
