import { describe, it, expect } from 'vitest';
import { sortCollectionImages, sortCollections } from '$lib/sort/sort';

describe('sort utilities', () => {
    it('sortCollectionImages sorts by name', () => {
        const imgs = [
            { name: 'b' },
            { name: 'a' },
            { name: 'c' }
        ] as any[];

        const sorted = sortCollectionImages(imgs, { by: 'name', order: 'asc' } as any);
        expect(sorted.map(i => i.name)).toEqual(['a', 'b', 'c']);
    });

    it('sortCollections sorts by created_at', () => {
        const cols = [
            { name: 'one', created_at: '2020-01-02T00:00:00Z' },
            { name: 'two', created_at: '2019-01-02T00:00:00Z' }
        ] as any[];

        const sorted = sortCollections(cols, { by: 'created_at', order: 'asc' } as any);
        expect(sorted.map(c => c.name)).toEqual(['two', 'one']);
    });
});
