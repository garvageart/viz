import { describe, it, expect, vi } from 'vitest';
import appReady, { registerReady, markReady } from '$lib/stores/appReady';

describe('appReady store', () => {
    it('markReady sets the store to true', () => {
        let value = false;
        const unsub = appReady.subscribe(v => value = v);
        markReady();
        expect(value).toBe(true);
        unsub();
    });

    it('registerReady waits for given promises before resolving', async () => {
        vi.useFakeTimers();
        let value = false;
        const unsub = appReady.subscribe(v => value = v);

        // create a promise that resolves after 100ms
        const p = new Promise<void>((res) => setTimeout(() => res(), 100));
        registerReady(p);

        // should not be ready immediately
        expect(value).toBe(false);

        // advance time and allow microtasks to run
        vi.advanceTimersByTime(100);
        // give a tick for promise resolution
        await Promise.resolve();

        expect(value).toBe(true);
        unsub();
        vi.useRealTimers();
    });
});
