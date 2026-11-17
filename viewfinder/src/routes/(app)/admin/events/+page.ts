import type { EventRecord, WsMetricsResponse, WsStatsResponse } from "@viz/api";
import { getEventsSince, getWsMetrics, getWsStats } from "@viz/api";
import { sendVizAPIRequest } from "#lib/utils/http.js";
import type { PageLoad } from "./$types";

interface PageLoadData {
    stats: WsStatsResponse;
    metrics: WsMetricsResponse;
    history: EventRecord[];
}

export const load: PageLoad = async (): Promise<PageLoadData> => {
    const [stats, metrics, historyRes] = await Promise.all([
        sendVizAPIRequest(getWsStats()),
        sendVizAPIRequest(getWsMetrics()),
        sendVizAPIRequest(getEventsSince({ limit: 50 }))
    ]);

    return {
        stats,
        metrics,
        history: "events" in historyRes ? historyRes.events || [] : []
    };
};
