import { createWSConnection, type WSClient } from "$lib/api/websocket";
import { invalidateViz } from "$lib/views/views.svelte";
import { debounce } from "$lib/utils/misc";
import { performSearch } from "$lib/search/execute";

/**
 * Global application events handler via WebSocket.
 * This stays active regardless of the current page.
 */
class EventsState {
    private client: WSClient | null = null;
    connected = $state(false);
    initialized = $state(false);

    private debouncedInvalidate = debounce(async () => {
        console.debug("[Events] Triggering debounced refresh");
        invalidateViz({ delay: 100 });

        // If the user is currently on the search page, trigger a fresh search
        // so results (e.g., deleted collections) are reflected immediately.
        if (typeof window !== "undefined" && window.location.pathname === "/search") {
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

        this.client = createWSConnection(
            (event, data) => this.handleEvent(event, data),
            () => {
                this.connected = false;
                this.initialized = true;
            },
            () => {
                this.connected = true;
                this.initialized = true;
                console.debug("[Events] Global WebSocket connected");
            },
            () => {
                this.connected = false;
                this.initialized = true;
            }
        );
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
        switch (event) {
            case "collection-created":
            case "collection-updated":
            case "collection-deleted":
                console.debug(`[Events] Collection event: ${event}`);
                this.debouncedInvalidate();
                break;

            // We can add more global event handlers here as needed
        }
    }
}

export const eventsState = new EventsState();
