import type { AfterNavigate } from "$app/navigation";

export interface HistoryEntry {
    path: string;
    timestamp: number;
    title: string;
    metadata?: Record<string, any>;
    index: number;
}

class HistoryState {
    canGoBack = $state(false);
    canGoForward = $state(false);
    entries = $state<HistoryEntry[]>([]);

    private initialIdx = 0;
    private currentIdx = 0;
    private maxIdx = 0;
    private replaceTo: string | undefined;

    constructor() {
        // No-op
    }

    init() {
        const currentPath = window.location.pathname;

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

        // Restore the most recent tracked entry for this path.
        const matchingEntry = this.entries
            .filter((entry) => entry.path === currentPath)
            .sort((a, b) => b.index - a.index)[0];

        if (matchingEntry) {
            this.currentIdx = matchingEntry.index;
        } else {
            // New session or untracked
            this.currentIdx = 0;
            this.entries = [];
        }

        // If entries is empty, initialize the current entry.
        if (this.entries.length === 0) {
            const startEntry: HistoryEntry = {
                path: currentPath,
                timestamp: Date.now(),
                title: document.title,
                index: this.currentIdx
            };
            this.entries = [startEntry];
        }

        const indexes = this.entries.map((entry) => entry.index);
        this.initialIdx = Math.min(...indexes);
        this.maxIdx = Math.max(...indexes);

        this.updateDerived();
    }

    markReplace(url: string) {
        this.replaceTo = url;
    }

    clearReplace(url: string) {
        if (this.replaceTo === url) {
            this.replaceTo = undefined;
        }
    }

    handleNavigation(navigation: AfterNavigate) {
        if (navigation.shallow) {
            return;
        }

        if (navigation.type === "enter") {
            return;
        }

        if (navigation.type === "popstate") {
            this.replaceTo = undefined;
            this.currentIdx += navigation.delta;
        } else if (this.replaceTo === navigation.to?.url.href) {
            this.replaceTo = undefined;
            this.replaceCurrent();
        } else {
            this.pushCurrent();
        }

        this.saveToSession();
        this.updateDerived();
    }

    private pushCurrent() {
        this.currentIdx += 1;

        this.entries = this.entries.filter((entry) => entry.index < this.currentIdx);
        this.entries.push({
            path: window.location.pathname,
            timestamp: Date.now(),
            title: document.title,
            index: this.currentIdx
        });

        this.maxIdx = this.currentIdx;
    }

    private replaceCurrent() {
        const currentEntryIndex = this.entries.findIndex((item) => item.index === this.currentIdx);
        const entry: HistoryEntry = {
            path: window.location.pathname,
            timestamp: Date.now(),
            title: document.title,
            index: this.currentIdx
        };

        if (currentEntryIndex === -1) {
            this.entries.push(entry);
        } else {
            this.entries[currentEntryIndex] = {
                ...this.entries[currentEntryIndex],
                ...entry
            };
        }
    }

    private updateDerived() {
        this.canGoBack = this.currentIdx > this.initialIdx;
        this.canGoForward = this.currentIdx < this.maxIdx;
    }

    private saveToSession() {
        try {
            sessionStorage.setItem("viz_history_entries", JSON.stringify(this.entries));
        } catch (e) {
            console.error("Failed to save history state", e);
        }
    }
}

export const historyState = new HistoryState();
