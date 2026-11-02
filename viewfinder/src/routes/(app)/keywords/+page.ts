import { sendVizAPIRequest } from "#lib/utils/http.js";
import { listKeywords } from "@viz/api";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
    const data = await sendVizAPIRequest(listKeywords(), "Failed to load keywords");
    return data;
};
