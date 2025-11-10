// WebSocket Events API helpers
import { MEDIA_SERVER } from "$lib/constants";
import { createServerURL } from "$lib/utils/url";

/**
 * WebSocket message structure from server
 */
export interface WSMessage {
    event: string;
    data: any;
    id?: number;
    timestamp?: string;
}

/**
 * WebSocket connection options
 */
export interface WSConnectionOptions {
    /** Callback for handling events */
    onEvent: (event: string, data: any) => void;
    /** Callback for handling errors */
    onError?: (error: Event) => void;
    /** Callback when connection opens */
    onOpen?: () => void;
    /** Callback when connection closes */
    onClose?: () => void;
    /** Auto-reconnect on close (default: true) */
    autoReconnect?: boolean;
    /** Reconnect delay in ms (default: 1000) */
    reconnectDelay?: number;
    /** Maximum reconnect attempts (default: 5, 0 for infinite) */
    maxReconnectAttempts?: number;
}

/**
 * WebSocket client wrapper with auto-reconnect
 */
export class WSClient {
    private ws: WebSocket | null = null;
    private url: string;
    private options: Required<WSConnectionOptions>;
    private reconnectAttempts = 0;
    private reconnectTimeout: number | null = null;
    private isClosed = false;

    constructor(options: WSConnectionOptions) {
        // Convert HTTP(S) URL to WS(S)
        const baseUrl = createServerURL(MEDIA_SERVER);
        this.url = baseUrl.replace(/^http/, 'ws') + '/events';

        this.options = {
            onEvent: options.onEvent,
            onError: options.onError || (() => { }),
            onOpen: options.onOpen || (() => { }),
            onClose: options.onClose || (() => { }),
            autoReconnect: options.autoReconnect ?? true,
            reconnectDelay: options.reconnectDelay ?? 1000,
            maxReconnectAttempts: options.maxReconnectAttempts ?? 5
        };

        this.connect();
    }

    private connect() {
        if (this.isClosed) return;

        try {
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                console.log('[WebSocket] Connected');
                this.reconnectAttempts = 0;
                this.options.onOpen();
            };

            this.ws.onmessage = (event) => {
                try {
                    const message: WSMessage = JSON.parse(event.data);

                    // Handle ping/pong for keepalive
                    if (message.event === 'ping') {
                        this.send('pong', {});
                        return;
                    }

                    this.options.onEvent(message.event, message.data);
                } catch (error) {
                    console.error('[WebSocket] Failed to parse message:', error);
                }
            };

            this.ws.onerror = (error) => {
                console.error('[WebSocket] Error:', error);
                this.options.onError(error);
            };

            this.ws.onclose = () => {
                console.log('[WebSocket] Closed');
                this.options.onClose();

                if (this.options.autoReconnect && !this.isClosed) {
                    this.scheduleReconnect();
                }
            };
        } catch (error) {
            console.error('[WebSocket] Connection error:', error);
            if (this.options.autoReconnect && !this.isClosed) {
                this.scheduleReconnect();
            }
        }
    }

    private scheduleReconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        // Check if we've exceeded max attempts (0 means infinite)
        if (this.options.maxReconnectAttempts > 0 &&
            this.reconnectAttempts >= this.options.maxReconnectAttempts) {
            console.error('[WebSocket] Max reconnect attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.options.reconnectDelay * Math.min(this.reconnectAttempts, 5); // Exponential backoff capped at 5x

        console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        this.reconnectTimeout = window.setTimeout(() => {
            this.connect();
        }, delay);
    }

    /**
     * Send a message to the server
     */
    send(event: string, data: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ event, data }));
        } else {
            console.warn('[WebSocket] Cannot send - not connected');
        }
    }

    /**
     * Close the WebSocket connection
     */
    close() {
        this.isClosed = true;

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * Get current connection state
     */
    get readyState(): number {
        return this.ws?.readyState ?? WebSocket.CLOSED;
    }

    /**
     * Check if connected
     */
    get isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}

/**
 * Create a WebSocket connection (convenience function)
 * @returns WSClient instance that can be closed later
 */
export function createWSConnection(
    onEvent: (event: string, data: any) => void,
    onError?: (error: Event) => void,
    onOpen?: () => void,
    onClose?: (code: number, reason: string) => void
): WSClient {
    return new WSClient({
        onEvent,
        onError,
        onOpen,
        onClose: onClose ? () => onClose(1000, 'Connection closed') : undefined
    });
}

/**
 * Get WebSocket connection statistics
 */
export async function getWSStats() {
    const response = await fetch(createServerURL(MEDIA_SERVER) + '/events/stats', {
        credentials: 'include'
    });
    return response.json();
}

/**
 * Get event history
 * @param limit - Maximum number of events to retrieve (default: 50, max: 100)
 */
export async function getEventHistory(limit: number = 50) {
    const response = await fetch(
        createServerURL(MEDIA_SERVER) + `/events/history?limit=${limit}`,
        { credentials: 'include' }
    );
    return response.json();
}

/**
 * Get events since a given cursor
 */
export async function getEventsSince(cursor: number, limit: number = 200) {
    const response = await fetch(
        createServerURL(MEDIA_SERVER) + `/events/since?cursor=${cursor}&limit=${limit}`,
        { credentials: 'include' }
    );
    return response.json();
}
