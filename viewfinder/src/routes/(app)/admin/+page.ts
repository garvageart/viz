import { getCacheStatus, getDatabaseStats, getSystemAbout, getSystemStats, getWsStats } from "$lib/api";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
    const [cacheRes, wsRes, dbRes, sysRes, aboutRes] = await Promise.all([
        getCacheStatus(),
        getWsStats(),
        getDatabaseStats(),
        getSystemStats(),
        getSystemAbout()
    ]);

    return {
        cacheStatus: cacheRes.status === 200 ? cacheRes.data : null,
        wsStats: wsRes.status === 200 ? wsRes.data : null,
        dbStats: dbRes.status === 200 ? dbRes.data : null,
        systemStats: sysRes.status === 200 ? sysRes.data : null,
        serverAbout: aboutRes.status === 200 ? aboutRes.data : null
    };
};
