import { error, redirect } from "@sveltejs/kit";
import { getUserSettings } from "$lib/api";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params }) => {
    if (!params.section) {
        redirect(307, "/settings/general");
    }

    const response = await getUserSettings();
    if (response.status !== 200) {
        error(response.status, {
            message: response.data.error
        });
    }

    return {
        settings: response.data,
        section: params.section
    };
};
