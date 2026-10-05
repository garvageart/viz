import { sendVizAPIRequest } from "#lib/utils/http.js";
import { getCacheStatus } from "@viz/api";

export async function load() {
    const cacheStatus = await sendVizAPIRequest(getCacheStatus(), "Failed to load cache status");

    return {
        cacheStatus
    };
}
