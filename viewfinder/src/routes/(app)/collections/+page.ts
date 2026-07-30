import { listCollections } from "$lib/api";
import { DataKeys } from "$lib/dependency-keys";
import { sendVizAPIRequest } from "$lib/utils/http";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ depends }) => {
    depends(DataKeys.Collections);
    return sendVizAPIRequest(listCollections(), "Failed to load collections");
};
