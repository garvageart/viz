import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toastState } from '$lib/toast-notifcations/notif-state.svelte';

describe('toastState store', () => {
    beforeEach(() => {
        // clear existing toasts
        toastState.toasts = [];
    });

    it('adds and dismisses toasts immediately when timeout is zero', () => {
        vi.useFakeTimers();
        toastState.addToast({ message: 'hello', timeout: 0 });
        expect(toastState.toasts.length).toBeGreaterThan(0);

        const id = toastState.toasts[0].id;
        toastState.dismissToast(id);
        expect(toastState.toasts.find((t: any) => t.id === id)).toBeUndefined();

        vi.useRealTimers();
    });

    it('auto-dismisses toasts after timeout', () => {
        vi.useFakeTimers();
        toastState.toasts = [];
        toastState.addToast({ message: 'temp', timeout: 100 });
        expect(toastState.toasts.length).toBeGreaterThan(0);
        const id = toastState.toasts[0].id;

        vi.advanceTimersByTime(100);
        expect(toastState.toasts.find((t: any) => t.id === id)).toBeUndefined();

        vi.useRealTimers();
    });
});
