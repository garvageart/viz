import { load } from '../../routes/(app)/collections/+page';
import { describe, it, expect, vi } from 'vitest';

// Mock the listCollections API to return predictable data
const mockData = { items: [{ uid: 'c1', name: 'C1' }], count: 1 };
vi.mock('$lib/api', () => ({
    listCollections: async () => ({ status: 200, data: mockData })
}));


describe('collections page load', () => {
    it('returns data from API', async () => {
        const res = await load({ url: new URL('http://localhost/') } as any);
        expect(res).toEqual(mockData);
    });
});
