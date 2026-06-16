import { listUsers } from "$lib/api";
import { sendVizAPIRequest } from "$lib/utils/http";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch }) => {
    const users = await sendVizAPIRequest(listUsers({ fetch }), "Failed to load users");

    return {
        users
    };
};
