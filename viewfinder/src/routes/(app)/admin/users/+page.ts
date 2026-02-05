import { listUsers } from "$lib/api";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch }) => {
    const res = await listUsers({ fetch });
    if (res.status === 200) {
        return {
            users: res.data
        };
    }

    throw error(res.status, {
        message: res.data.error || "Failed to load users"
    });
};
