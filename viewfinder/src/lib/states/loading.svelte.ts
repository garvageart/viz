/**
 * loading.svelte.ts
 *
 * Centralized state for tracking navigation progress.
 * Progress is driven purely by real request completions — no timers,
 * no trickle, no simulated progress.  Monotonic within a session so
 * the bar never regresses when new requests are discovered.
 */
import { untrack } from "svelte";

class LoadingState {
    private activeRequests = $state(0);
    private totalRequestsInSession = $state(0);
    private completedRequestsInSession = $state(0);

    /** Whether we are currently in a "navigation" phase */
    isNavigating = $state(false);

    /**
     * Progress (0–100), driven purely by request data.
     * Monotonic — never decreases within a single navigation session.
     */
    progress = $state(100);

    private updateProgress() {
        let newProgress: number;

        if (!this.isNavigating) {
            newProgress = 100;
        } else if (this.totalRequestsInSession === 0) {
            // No requests yet — show a hint of activity
            newProgress = 15;
        } else {
            // Pure request-ratio progress, scaled to 15–95
            const ratio = this.completedRequestsInSession / this.totalRequestsInSession;
            newProgress = 15 + ratio * 80;
            newProgress = Math.min(newProgress, 95);
        }

        // Ratchet — never go backwards within a navigation session
        if (newProgress > this.progress) {
            this.progress = newProgress;
        }
    }

    startRequest() {
        untrack(() => {
            if (!this.isNavigating) return;

            this.activeRequests++;
            this.totalRequestsInSession++;
            this.updateProgress();
        });
    }

    endRequest() {
        untrack(() => {
            if (!this.isNavigating) return;

            this.activeRequests = Math.max(0, this.activeRequests - 1);
            this.completedRequestsInSession++;
            this.updateProgress();
        });
    }

    startNavigation() {
        this.totalRequestsInSession = 0;
        this.completedRequestsInSession = 0;
        this.activeRequests = 0;
        this.isNavigating = true;
        this.progress = 0; // Reset so monotonic guard starts fresh
        this.updateProgress();
    }

    endNavigation() {
        this.progress = 100;
        this.isNavigating = false;
        this.activeRequests = 0;
    }
}

export const loadingState = new LoadingState();
