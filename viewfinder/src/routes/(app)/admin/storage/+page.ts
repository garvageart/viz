import { sendVizAPIRequest } from "#lib/utils/http.js";
import { getSystemConfig } from "@viz/api";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
    return sendVizAPIRequest(getSystemConfig(), "Failed to load system configuration");
};
