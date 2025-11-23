import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateRandomString, debounce, VizLocalStorage, arrayHasDuplicates, swapArrayElements, normalizeBase64 } from '$lib/utils/misc';

describe('misc utils', () => {
    it('generateRandomString produces the requested length', () => {
        const s = generateRandomString(10);
        expect(s).toHaveLength(10);
    });

    it('debounce delays function invocation', () => {
        vi.useFakeTimers();
        const fn = vi.fn();
        const d = debounce(fn, 100);

        d();
        expect(fn).not.toHaveBeenCalled();

        vi.advanceTimersByTime(100);
        expect(fn).toHaveBeenCalled();

        vi.useRealTimers();
    });

    it('VizLocalStorage set/get/delete works with strings and objects', () => {
        const s = new VizLocalStorage<string>('test-key');
        s.delete();
        s.set('hello');
        expect(s.get()).toBe('hello');
        s.delete();
        expect(s.get()).toBeNull();

        const o = new VizLocalStorage<object>('obj-key');
        o.set({ a: 1 });
        expect(o.get()).toEqual({ a: 1 });
        o.delete();
        expect(o.get()).toBeNull();
    });

    it('array helpers behave as expected', () => {
        const arr = [1, 2, 3];
        swapArrayElements(arr, 0, 2);
        expect(arr).toEqual([3, 2, 1]);

        const { hasDuplicates, duplicates } = arrayHasDuplicates([1, 2, 2, 3, 3, 3]);
        expect(hasDuplicates).toBe(true);
        expect(duplicates.sort()).toEqual([2, 3]);

        const noDup = arrayHasDuplicates([1, 2, 3]);
        expect(noDup.hasDuplicates).toBe(false);
    });

    it('normalizeBase64 fixes URL-safe base64 and padding', () => {
        const s = 'abcd-_/';
        const normalized = normalizeBase64(s);
        expect(normalized).toContain('+');
    });
});
