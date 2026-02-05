import type { PageLoad } from './$types';
import { listImages } from '$lib/api';
import { error } from "@sveltejs/kit";

export const load: PageLoad = async ({ url }) => {
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);
    const page = parseInt(url.searchParams.get('page') || '0', 10);

    const response = await listImages({ limit, page });

    if (response.status === 200) {
        return response.data;
    }

    error(response.status, {
        message: response.data.error || "Failed to load images"
    });
};