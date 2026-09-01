import { invalidate } from "$app/navigation";
import { page } from "$app/state";
import { WSClient } from "@viz/api";
import { DataKeys } from "$lib/dependency-keys";
import { performSearch } from "$lib/search/execute";
import { invalidateViz } from "$lib/views/views.svelte";

/**
 * Global application events handler via WebSocket.
 * This stays active regardless of the current page.
 */
class EventsState {
    private client: WSClient | null = null;
    connected = $state(false);
    initialized = $state(false);
    private wasDisconnected = $state(false);

    private invalidateApp = async (resourcePath?: string) => {
        console.debug(`[Events] Triggering debounced soft refresh for path: ${resourcePath ?? "all"}`);
        invalidateViz({ skipInvalidateAll: true });

        if (resourcePath) {
            try {
                await invalidate(resourcePath);
            } catch (e) {
                console.warn(`[Events] Targeted invalidation failed for ${resourcePath}:`, e);
            }
        }

        // If the user is currently on the search page, trigger a fresh search
        if (page.url.pathname.endsWith("/search")) {
            try {
                await performSearch();
            } catch (e) {
                console.error("[Events] failed to perform search:", e);
            }
        }
    };

    /**
     * Initialize the global WebSocket connection.
     */
    init() {
        if (this.client) {
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
        console.debug("[Events] received event:", event, "data:", data, "disconnected state:", this.wasDisconnected);
        switch (event) {
            case "collection-created":
            case "collection-updated":
            case "collection-deleted":
                console.debug(`[Events] Collection event: ${event}`);
                this.invalidateApp(DataKeys.Collection);
                this.invalidateApp(DataKeys.Collections);
                break;

            case "image-created":
            case "image-updated":
            case "image-deleted":
                console.debug(`[Events] Image event: ${event}`);
                this.invalidateApp(DataKeys.Photos);
                this.invalidateApp(DataKeys.Collections);
                this.invalidateApp(DataKeys.Collection);
                break;

            case "config-updated":
                console.debug("[Events] Config updated, updating window.vizConfig:", data);
                if (data) {
                    window.vizConfig = {
                        ...window.vizConfig,
                        ...data
                    };
                }
                break;

            case "server-online":
                console.debug("[Events] Server came back online, wasDisconnected:", this.wasDisconnected);
                if (this.wasDisconnected) {
                    console.debug("[Events] Reloading page after server came back online...");
                    window.location.reload();
                }

                break;
        }
    }
}

export const eventsState = new EventsState();
