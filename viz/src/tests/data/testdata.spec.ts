import { describe, it, expect } from 'vitest';
import { createTestUser, createTestImageObject, createTestCollection } from '$lib/data/test';

describe('test data factories', () => {
    it('createTestUser returns required fields', () => {
        const u = createTestUser();
        expect(u).toHaveProperty('uid');
        expect(u).toHaveProperty('email');
        expect(u).toHaveProperty('username');
    });

    it('createTestImageObject returns image object with paths', () => {
        const img = createTestImageObject();
        expect(img).toHaveProperty('uid');
        expect(img.image_paths).toBeDefined();
        expect(img.image_metadata).toBeDefined();
    });

    it('createTestCollection returns a collection with thumbnail image', () => {
        const c = createTestCollection();
        expect(c).toHaveProperty('uid');
        expect(c).toHaveProperty('name');
        expect(c.thumbnail).toBeDefined();
        expect(c.image_count).toBeGreaterThanOrEqual(0);
    });
});
