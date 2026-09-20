import { SvelteSet } from "svelte/reactivity";

class BootState {
    isReady = $state(false);

    private pending = new SvelteSet<Promise<unknown>>();
    private fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    private initialized = false;

    init() {
        if (this.initialized) {
            return;
        }
        this.initialized = true;

        if ("fonts" in document) {
            this.wait(document.fonts.ready);
        }

        this.fallbackTimer = setTimeout(() => {
            this.dismiss();
        }, 10000);

        this.check();
    }

    wait(promise: Promise<unknown> | Promise<unknown>[]) {
        if (this.isReady) {
            return;
        }

        const list = Array.isArray(promise) ? promise : [promise];
        for (const p of list) {
            const wrapped = p.finally(() => {
                this.pending.delete(wrapped);
                this.check();
            });

            this.pending.add(wrapped);
        }
    }

    dismiss() {
        if (this.isReady) {
            return;
        }

        this.isReady = true;
        this.pending.clear();

        if (this.fallbackTimer) {
            clearTimeout(this.fallbackTimer);
            this.fallbackTimer = null;
        }

        const el = document.getElementById("app-splash");
        if (el) {
            el.classList.add("app-splash--fade");

            const cleanup = () => {
                el.remove();
                document.getElementById("splash-styles")?.remove();
            };

            el.addEventListener("transitionend", cleanup, { once: true });

            setTimeout(() => {
                if (el.parentNode) {
                    cleanup();
                }
            }, 600);
        }
    }

    private check() {
        if (!this.isReady && this.pending.size === 0) {
            this.dismiss();
        }
    }
}

export const bootState = new BootState();
