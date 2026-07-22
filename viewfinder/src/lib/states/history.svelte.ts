import { afterNavigate } from "$app/navigation";

export interface HistoryMetadata {
    path: string;
    timestamp: number;
    title: string;
    metadata?: Record<string, any>;
    index: number;
}

class HistoryState {
    canGoBack = $state(false);
    canGoForward = $state(false);
    entries = $state<HistoryMetadata[]>([]);

    private initialIdx = 0;
    private currentIdx = 0;
    private maxIdx = 0;
    private lastSvelteKitHistory = 0;
    private initialized = false;

    constructor() {
        // No-op
    }

    init() {
        if (typeof window === "undefined" || this.initialized) {
            return;
        }

        const state = window.history.state || {};
        const skHistoryId = state["sveltekit:history"];

        // Recover entries from session storage if possible
        try {
            const stored = sessionStorage.getItem("viz_history_entries");
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    // Heal state by filtering out potential null/undefined values from old bugs
                    this.entries = parsed.filter((e) => {
                        return e !== null && e !== undefined;
                    });
                }
            }
        } catch (e) {
            console.error("Failed to load history entries", e);
        }

        // Try to match the current SvelteKit history ID
        const matchingEntry = this.entries.find((e) => {
            return e.metadata?.skHistoryId === skHistoryId;
        });

        if (matchingEntry) {
            this.currentIdx = matchingEntry.index;
        } else {
            // New session or untracked
            this.currentIdx = 0;
            this.entries = [];
        }

        this.initialIdx = 0;
        this.maxIdx = this.currentIdx;

        // If entries is empty, initialize start entry
        if (this.entries.length === 0) {
            const startEntry: HistoryMetadata = {
                path: window.location.pathname,
                timestamp: Date.now(),
                title: document.title,
                metadata: { skHistoryId },
                index: this.currentIdx
            };
            this.entries = [startEntry];
        } else {
            // Calculate initial and max indexes from restored entries
            const indexes = this.entries.map((e) => {
                return e.index;
            });
            this.initialIdx = Math.min(...indexes);
            this.maxIdx = Math.max(...indexes);
        }

        if (typeof skHistoryId === "number") {
            this.lastSvelteKitHistory = skHistoryId;
        }

        this.updateDerived();
        this.initialized = true;

        afterNavigate((navigation) => {
            const state = window.history.state || {};
            const currentSkitHistory = state["sveltekit:history"];
            const isReplace =
                typeof currentSkitHistory === "number" && currentSkitHistory === this.lastSvelteKitHistory;

            // Search for existing entry matching the history ID
            const matching = this.entries.find((e) => {
                return e.metadata?.skHistoryId === currentSkitHistory;
            });

            let newIdx = this.currentIdx;

            if (matching) {
                // Popped to existing entry
                newIdx = matching.index;
            } else {
                // New entry or replacement
                if (isReplace) {
                    newIdx = this.currentIdx;
                } else if (navigation.type === "enter") {
                    newIdx = this.currentIdx;
                } else {
                    newIdx = this.currentIdx + 1;
                }

                // Update or push entry
                if (isReplace) {
                    const existingIdx = this.entries.findIndex((e) => {
                        return e.index === newIdx;
                    });
                    if (existingIdx !== -1) {
                        this.entries[existingIdx] = {
                            ...this.entries[existingIdx],
                            path: window.location.pathname,
                            title: document.title,
                            timestamp: Date.now(),
                            metadata: {
                                ...this.entries[existingIdx].metadata,
                                skHistoryId: currentSkitHistory
                            }
                        };
                    }
                } else if (navigation.type === "enter") {
                    const existingIdx = this.entries.findIndex((e) => {
                        return e.index === newIdx;
                    });
                    if (existingIdx !== -1) {
                        this.entries[existingIdx].metadata = {
                            ...this.entries[existingIdx].metadata,
                            skHistoryId: currentSkitHistory
                        };
                    }
                } else {
                    // PUSH: We branch out. Remove forward history.
                    const sliceIdx = this.entries.findIndex((e) => {
                        return e.index === this.currentIdx;
                    });

                    if (sliceIdx !== -1) {
                        this.entries = this.entries.slice(0, sliceIdx + 1);
                    }

                    this.entries.push({
                        path: window.location.pathname,
                        timestamp: Date.now(),
                        title: document.title,
                        metadata: { skHistoryId: currentSkitHistory },
                        index: newIdx
                    });

                    this.maxIdx = newIdx;
                }
            }

            this.currentIdx = newIdx;
            if (typeof currentSkitHistory === "number") {
                this.lastSvelteKitHistory = currentSkitHistory;
            }
            this.saveToSession();
            this.updateDerived();
        });
    }

    private updateDerived() {
        this.canGoBack = this.currentIdx > this.initialIdx;
        this.canGoForward = this.currentIdx < this.maxIdx;
    }

    private saveToSession() {
        if (typeof window === "undefined") {
            return;
        }
        try {
            sessionStorage.setItem("viz_history_entries", JSON.stringify(this.entries));
        } catch (e) {
            console.error("Failed to save history state", e);
        }
    }
}

export const historyState = new HistoryState();
