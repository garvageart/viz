import type { EventRecord, WsMetricsResponse, WsStatsResponse } from "@viz/api";
import { getEventsSince, getWsMetrics, getWsStats } from "@viz/api";
import { sendVizAPIRequest } from "$lib/utils/http";
import type { PageLoad } from "./$types";

interface PageLoadData {
    stats: WsStatsResponse;
    metrics: WsMetricsResponse;
    history: EventRecord[];
}

export const load: PageLoad = async (): Promise<PageLoadData> => {
    const [stats, metrics, historyRes] = await Promise.all([
        sendVizAPIRequest(getWsStats(), "Failed to load stats"),
        sendVizAPIRequest(getWsMetrics(), "Failed to load metrics"),
        sendVizAPIRequest(getEventsSince({ limit: 50 }), "Failed to load history")
    ]);

    return {
        stats,
        metrics,
        history: "events" in historyRes ? historyRes.events || [] : []
    };
};
