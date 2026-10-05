import { DataKeys } from "#lib/dependency-keys.js";
import { sendVizAPIRequest } from "#lib/utils/http.js";
import { listCollections } from "@viz/api";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ depends }) => {
    depends(DataKeys.Collections);
    return sendVizAPIRequest(listCollections(), "Failed to load collections");
};
