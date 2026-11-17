import { getSystemConfig } from "@viz/api";
import { sendVizAPIRequest } from "#lib/utils/http.js";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
    return sendVizAPIRequest(getSystemConfig());
};
