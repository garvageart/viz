import { sendVizAPIRequest } from "#lib/utils/http.js";
import { listAvailableWorkers } from "@viz/api";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
    const data = await sendVizAPIRequest(listAvailableWorkers(), "Failed to load job types");

    return {
        jobTypes: data.items.sort((a, b) => a.name.localeCompare(b.name))
    };
};
