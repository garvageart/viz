import { describe, it, expect } from 'vitest';
import { getURLParams } from '$lib/utils/url';

describe('url utils', () => {
    it('parses query params into an object', () => {
        const url = 'https://example.com/path?foo=bar&num=42&empty=';
        const params = getURLParams(url);

        expect(params).toEqual({ foo: 'bar', num: '42', empty: '' });
    });
});
