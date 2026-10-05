import { sendVizAPIRequest } from "#lib/utils/http.js";
import { redirect } from "@sveltejs/kit";
import { getUserSettings } from "@viz/api";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params }) => {
    if (!params.section) {
        redirect(307, "/settings/general");
    }

    const settings = await sendVizAPIRequest(getUserSettings(), "Failed to load user settings");

    return {
        settings,
        section: params.section
    };
};
