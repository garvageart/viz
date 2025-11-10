/**// WebSocket Events API helpers

    * SSE Compatibility Layer - Re - exports WebSocket functionalityimport { MEDIA_SERVER; } from "$lib/constants";

 * This file provides backward compatibility for code that imported from sse.tsimport { createServerURL; } from "$lib/utils/url";

 * /import * as api from "./client.gen";;

import type { WSClient, WSMessage } from "./websocket";

import { createWSConnection, type WSClient, type WSMessage } from "./websocket";

import { getWsStats, getEventsSince } from "./client.gen";// Re-export types from generated client

import type { WsStatsResponse, WsEvent } from "./client.gen"; export type {

    WsStatsResponse,

/**    WsMetricsResponse,

 * Creates a WebSocket connection (replaces SSE EventSource)    EventRecord,

 */    EventHistoryResponse,

    export function createEventConnection(url?: string): WSClient {
        WsBroadcastRequest,

    const wsUrl = url || (typeof window !== 'undefined' ? `ws://${window.location.host}/events/ws` : 'ws://localhost:8080/events/ws'); WsBroadcastResponse;

        return createWSConnection(wsUrl);
    } from "./client.gen";

}

/**

/** * Get WebSocket connection statistics

 * Get WebSocket statistics */

 */export async function getWSStats() {;

export async function getWSStats(): Promise<WsStatsResponse> {
    return api.getWsStats();

    return getWsStats();
}

}

/**

/** * Get WebSocket metrics including event counts by type

 * Get event history with cursor support */

 */export async function getWSMetrics() {;

export async function getEventHistory(cursor?: number, limit: number = 50): Promise<{ events: WsEvent[]; cursor: number; }> {
    return api.getWsMetrics();

    const response = await getEventsSince({ cursor, limit });
}

return {

    events: response.data?.events || [],/**

        cursor: response.data?.cursor || 0 * Get event history

    }; * @param limit - Maximum number of events to retrieve (default: 50, max: 100)

} */

    export async function getEventHistory(limit: number = 50) {

    // Re-export types    return api.getEventHistory({ limit });

    export type { WSClient, WSMessage, WsStatsResponse, WsEvent };
}


/**
 * Get events since a cursor ID
 * @param cursor - Cursor ID to fetch events after (default: 0)
 * @param limit - Maximum number of events to return (default: 200, max: 1000)
 */
export async function getEventsSince(cursor: number = 0, limit: number = 200) {
    return api.getEventsSince({ cursor, limit });
}

/**
 * Clear event history
 */
export async function clearEventHistory() {
    return api.clearEventHistory();
}

/**
 * Broadcast a message to all connected WebSocket clients
 */
export async function broadcastWSEvent(event: string, data: any) {
    return api.broadcastWsEvent({ event, data });
}

/**
 * Send a message to a specific WebSocket client
 */
export async function sendToWSClient(clientId: string, event: string, data: any) {
    return api.sendToWsClient(clientId, { event, data });
}

/**
 * Create a WebSocket connection for real-time events
 * @param onEvent - Callback for handling events
 * @param onError - Callback for handling errors
 * @param onOpen - Callback for connection opened
 * @param onClose - Callback for connection closed
 * @returns WSClient instance that can be closed later
 */
export function createEventConnection(
    onEvent: (event: string, data: any) => void,
    onError?: (error: Error) => void,
    onOpen?: () => void,
    onClose?: (code: number, reason: string) => void
): WSClient {
    const url = createServerURL(MEDIA_SERVER).replace(/^http/, "ws") + "/events";

    // Import dynamically to avoid circular dependencies
    const { createWSConnection } = require("./websocket");

    return createWSConnection(url, {
        onMessage: (message: WSMessage) => {
            // WebSocket messages have event and data properties
            if (message.event && message.data) {
                onEvent(message.event, message.data);
            }
        },
        onError,
        onOpen,
        onClose,
        autoReconnect: true,
        reconnectInterval: 3000,
        maxReconnectAttempts: 10
    });
}

// Legacy compatibility exports (deprecated, use WebSocket versions)
/** @deprecated Use getWSStats instead */
export const getSSEStats = getWSStats;
/** @deprecated Use getWSMetrics instead */
export const getSSEMetrics = getWSMetrics;
/** @deprecated Use broadcastWSEvent instead */
export const broadcastSSEEvent = broadcastWSEvent;
/** @deprecated Use sendToWSClient instead */
export const sendToSSEClient = sendToWSClient;
/** @deprecated Use createEventConnection instead */
export const createSSEConnection = createEventConnection;
