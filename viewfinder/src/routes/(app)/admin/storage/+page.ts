import { getSystemConfig } from "$lib/api";
import { sendVizAPIRequest } from "$lib/utils/http";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
    return sendVizAPIRequest(getSystemConfig(), "Failed to load system configuration");
};
