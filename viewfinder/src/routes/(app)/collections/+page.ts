import { listCollections } from "$lib/api";
import { sendVizAPIRequest } from "$lib/utils/http";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
    return sendVizAPIRequest(listCollections(), "Failed to load collections");
};
