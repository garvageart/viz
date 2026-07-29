import { invalidate } from "$app/navigation";
import { page } from "$app/state";
import { WSClient } from "$lib/api/websocket";
import { performSearch } from "$lib/search/execute";
import { debounce } from "$lib/utils/misc";
import { invalidateViz } from "$lib/views/views.svelte";

/**
 * Global application events handler via WebSocket.
 * This stays active regardless of the current page.
 */
class EventsState {
    private client: WSClient | null = null;
    connected = $state(false);
    initialized = $state(false);
    private wasDisconnected = false;

    private debouncedInvalidate = debounce(async (resourcePath?: string) => {
        console.debug(`[Events] Triggering debounced soft refresh for path: ${resourcePath ?? "all"}`);
        invalidateViz({ delay: 100, skipInvalidateAll: true });

        if (resourcePath) {
            try {
                await invalidate((url) => url.pathname.includes(resourcePath));
            } catch (e) {
                console.warn(`[Events] Targeted invalidation failed for ${resourcePath}:`, e);
            }
        }

        // If the user is currently on the search page, trigger a fresh search
        if (typeof window !== "undefined" && page.url.pathname.endsWith("/search")) {
            try {
                await performSearch();
            } catch (e) {
                console.error("[Events] performSearch failed:", e);
            }
        }
    }, 300);

    /**
     * Initialize the global WebSocket connection.
     */
    init() {
        if (typeof window === "undefined" || this.client) {
            return;
        }

        console.debug("[Events] Initializing global WebSocket connection");

        this.client = new WSClient({
            onEvent: (event, data) => this.handleEvent(event, data),
            onError: () => {
                console.debug("[Events] onError callback, current connected state:", this.connected);
                if (this.connected) {
                    this.wasDisconnected = true;
                    console.debug("[Events] onError marked wasDisconnected = true");
                }
                this.connected = false;
                this.initialized = true;
            },
            onOpen: () => {
                this.connected = true;
                this.initialized = true;
                console.debug(
                    "[Events] Global WebSocket connected, wasDisconnected is currently:",
                    this.wasDisconnected
                );
            },
            onClose: () => {
                console.debug("[Events] onClose callback, current connected state:", this.connected);
                if (this.connected) {
                    this.wasDisconnected = true;
                    console.debug("[Events] onClose marked wasDisconnected = true");
                }
                this.connected = false;
                this.initialized = true;
            },
            maxReconnectAttempts: 0 // Retry infinitely so we automatically reconnect when server reboots
        });
    }

    /**
     * Close the global WebSocket connection.
     */
    destroy() {
        if (this.client) {
            this.client.close();
            this.client = null;
            this.connected = false;
        }
    }

    private handleEvent(event: string, data: any) {
        console.debug(
            "[Events] handleEvent received event:",
            event,
            "data:",
            data,
            "wasDisconnected state:",
            this.wasDisconnected
        );
        switch (event) {
            case "collection-created":
            case "collection-updated":
            case "collection-deleted":
                console.debug(`[Events] Collection event: ${event}`);
                this.debouncedInvalidate("collection");
                break;

            case "image-created":
            case "image-updated":
            case "image-deleted":
                console.debug(`[Events] Image event: ${event}`);
                this.debouncedInvalidate("image");
                break;

            case "server-online":
                console.debug("[Events] Server came back online, wasDisconnected:", this.wasDisconnected);
                if (this.wasDisconnected) {
                    console.debug("[Events] Reloading page after server came back online...");
                    if (typeof window !== "undefined") {
                        window.location.reload();
                    }
                }
                break;
        }
    }
}

export const eventsState = new EventsState();
