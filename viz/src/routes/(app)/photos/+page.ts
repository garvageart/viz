import type { PageLoad } from './$types';
import { listImages, type ImagesPage } from '$lib/api/client.gen';

export const load: PageLoad = async ({ url }) => {
    const limit = parseInt(url.searchParams.get('limit') || '25', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    const response = await listImages({ limit, offset });

    if (response.status === 200) {
        const data = response.data as ImagesPage;
        return {
            images: data.items?.map((item) => item.image) || [],
            count: data.count || 0,
            limit,
            offset
        };
    }

    return {
        images: [],
        count: 0,
        limit,
        offset
    };
};