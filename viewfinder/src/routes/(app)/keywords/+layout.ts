import { sendVizAPIRequest } from "#lib/utils/http.js";
import { listKeywords } from "@viz/api";
import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = async () => {
    const data = await sendVizAPIRequest(listKeywords(), "Failed to load keywords");
    return data;
};
