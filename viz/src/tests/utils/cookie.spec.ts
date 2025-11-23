import { describe, it, expect, beforeEach } from 'vitest';
import { cookieMethods } from '$lib/utils/cookie';

describe('cookie methods', () => {
    beforeEach(() => {
        // clear cookies
        Object.defineProperty(document, 'cookie', {
            writable: true,
            value: ''
        });
    });

    it('set and get cookie value', () => {
        cookieMethods.set('k', 'v', 'Thu, 01 Jan 2099 00:00:00 GMT');
        const got = cookieMethods.get('k');
        expect(got).toBe('v');
    });

    it('delete removes cookie', () => {
        cookieMethods.set('todelete', 'yes', 'Thu, 01 Jan 2099 00:00:00 GMT');
        expect(cookieMethods.get('todelete')).toBe('yes');
        cookieMethods.delete('todelete');
        // After delete the cookie string may still contain an entry but value should be empty or undefined
        const got = cookieMethods.get('todelete');
        expect(got === undefined || got === '').toBeTruthy();
    });
});
