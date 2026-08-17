import { listUsers } from "@viz/api";
import { sendVizAPIRequest } from "$lib/utils/http";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
    const users = await sendVizAPIRequest(listUsers(), "Failed to load users");

    return {
        users
    };
};
