import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import CollectionCard from '$lib/components/CollectionCard.svelte';

describe('CollectionCard', () => {
    it('renders collection metadata', () => {
        const collection = { uid: 'c1', name: 'My collection', created_at: '2020-01-02T00:00:00Z', image_count: 2 } as any;
        const { getByText, container } = render(CollectionCard, { collection });
        expect(getByText('My collection')).toBeTruthy();
        // collection renders a human-friendly image count like "2 images"
        expect(getByText(/2\s*images?/i)).toBeTruthy();
        expect(container.querySelector('.coll-card')?.getAttribute('data-asset-id')).toBe('c1');
    });
});
