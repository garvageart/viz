import { describe, it, expect } from 'vitest';
import { parseExifDate, convertEXIFDateTime, formatBytes, getTakenAt } from '$lib/utils/images';

describe('images utils', () => {
    it('convertEXIFDateTime converts simple EXIF string', () => {
        const d = convertEXIFDateTime('2006:01:02 15:04:05');
        expect(d.toISOString()).toContain('2006-01-02T15:04:05');
    });

    it('parseExifDate handles multiple formats', () => {
        const a = parseExifDate('2006:01:02 15:04:05');
        expect(a).toBeDefined();
        expect(a?.toISOString()).toContain('2006-01-02T15:04:05');

        const b = parseExifDate('2006-01-02 15:04:05');
        expect(b).toBeDefined();

        const c = parseExifDate('2006:01:02');
        expect(c).toBeDefined();
    });

    it('formatBytes formats numbers sensibly', () => {
        expect(formatBytes(0)).toBe('0 B');
        expect(formatBytes(1024)).toBe('1 KB');
        expect(formatBytes(1536)).toBe('1.50 KB');
        expect(formatBytes(undefined)).toBeNull();
    });

    it('getTakenAt prefers EXIF fields when present', () => {
        const img = {
            created_at: '2020-01-01T00:00:00Z',
            exif: { date_time_original: '2000:01:02 03:04:05' },
            image_metadata: {}
        } as any;

        const d = getTakenAt(img);
        expect(d.toISOString()).toContain('2000-01-02T03:04:05');
    });
});
