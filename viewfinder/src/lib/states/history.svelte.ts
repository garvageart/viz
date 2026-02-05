import { afterNavigate, replaceState } from "$app/navigation";
import { tick } from "svelte";

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
	private initialized = false;

	constructor() {
		// No-op
	}

	init() {
		if (typeof window === "undefined" || this.initialized) {
			return;
		}

		// On init, we try to recover state or set default
		const state = window.history.state || {};
		const historyLen = window.history.length;

		if (typeof state.viz_nav_idx === "number") {
			this.currentIdx = state.viz_nav_idx;
			// If we are restoring, we assume the session started at some point before.
			// However, we can't be sure about forward history on reload, so we default maxIdx to current.
			// We set initialIdx to 0 to allow going back if we have history.
			// Note: This assumes 0 is the start of *our* tracking.
			this.initialIdx = 0;
			this.maxIdx = this.currentIdx;
		} else {
			// New entry or untracked
			// Use history.length to anchor our index if possible, or start at 0
			this.currentIdx = historyLen > 0 ? historyLen - 1 : 0;
			this.initialIdx = this.currentIdx;
			this.maxIdx = this.currentIdx;
			// Defer this update to ensure router is initialized
			tick().then(() => this.updateState(this.currentIdx));
		}

		this.initialized = true;

		// Recover entries from session storage if possible
		try {
			const stored = sessionStorage.getItem("viz_history_entries");
			if (stored) {
				this.entries = JSON.parse(stored);
			}
		} catch (e) {
			console.error("Failed to load history entries", e);
		}

		// If we are starting fresh or have no entries despite having an index, ensure we have an entry for current
		if (this.entries.length === 0 || this.currentIdx >= this.entries.length) {
			// It's tricky to reconstruct history if missing. 
			// We'll just reset entries to contain current page as the "start" if the index doesn't match.
			// Or if we have an index but no entries (cleared session), we treat this as a new root.
			this.entries = [{
				path: window.location.pathname,
				timestamp: Date.now(),
				title: document.title,
				metadata: {},
				index: this.currentIdx // Store index in metadata for debugging/reference
			}];

			// We might need to adjust currentIdx if it was high but we lost history
			if (this.entries.length === 1 && this.currentIdx > 0) {
				// We are in a weird state: browser thinks we are at index N, but we only have 1 entry.
				// We can't easily fix the browser's index  shenanigans.
				// We will just assume this entry corresponds to the currentIdx.
				this.entries[0].index = this.currentIdx;
			}
		}

		this.updateDerived();

		afterNavigate((navigation) => {
			const state = window.history.state || {};
			let newIdx = state.viz_nav_idx;

			if (typeof newIdx !== "number") {
				// No index, implies new entry (push) via normal browser nav or external link
				// We rely on the previous index + 1
				newIdx = this.currentIdx + 1;
				this.updateState(newIdx);
			}

			// Detect type of navigation
			if (navigation.type === "link" || navigation.type === "goto") {
				// PUSH: We branch out. Remove forward history.

				// We are moving FROM this.currentIdx TO newIdx.
				// If it's a push, newIdx should be this.currentIdx + 1.
				// If we went back then pushed, we need to remove entries after this.currentIdx.
				this.entries = this.entries.slice(0, this.currentIdx + 1);

				this.entries.push({
					path: window.location.pathname,
					timestamp: Date.now(),
					title: document.title,
					metadata: {},
					index: newIdx
				});

				this.maxIdx = newIdx;
			} else if (navigation.type === "popstate") {
				// Back/Forward
				// We don't modify the stack structure, usually.
				// But if we landed on an index that we don't have an entry for (weird edge case), we should add it?
				// Generally entries[newIdx] should exist.

				if (!this.entries[newIdx]) {
					// Recover missing entry?
					this.entries[newIdx] = {
						path: window.location.pathname,
						timestamp: Date.now(),
						title: document.title,
						metadata: {},
						index: newIdx
					};
				}

				if (newIdx > this.maxIdx) {
					this.maxIdx = newIdx;
				}
			} else {
				// replacements etc.
				// For 'replace', we should update the current entry
				if (this.entries[newIdx]) {
					this.entries[newIdx] = {
						...this.entries[newIdx],
						path: window.location.pathname,
						title: document.title,
						timestamp: Date.now()
					};
				}
			}

			this.currentIdx = newIdx;
			this.saveToSession();
			this.updateDerived();
		});
	}

	private updateState(idx: number) {
		if (typeof window === "undefined") return;
		const newState = { ...(window.history.state || {}), viz_nav_idx: idx };
		replaceState(window.location.href, newState);
	}

	private updateDerived() {
		this.canGoBack = this.currentIdx > this.initialIdx;
		this.canGoForward = this.currentIdx < this.maxIdx;
	}

	private saveToSession() {
		if (typeof window === "undefined") return;
		try {
			sessionStorage.setItem("viz_history_entries", JSON.stringify(this.entries));
		} catch (e) {
			console.error("Failed to save history state", e);
		}
	}
}

export const historyState = new HistoryState();