import { error } from "@sveltejs/kit";
import { listAssetsForKeyword } from "@viz/api";
import { sendVizAPIRequest } from "#lib/utils/http.ts";

export async function load({ parent, params }) {
    const allKeywords = await parent();
    const keyword = allKeywords.keywords.find((k) => k.name === params.name);

    if (!keyword) {
        error(404, "Can't find keyword");
    }

    const res = await sendVizAPIRequest(listAssetsForKeyword(keyword.uid));
    return {
        keyword,
        assets: res
    };
}
