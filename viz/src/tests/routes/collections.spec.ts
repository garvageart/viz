import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import CollectionsPage from '../../routes/(app)/collections/+page.svelte';
import CollectionPage from '../../routes/(app)/collections/[uid]/+page.svelte';

describe('collections pages', () => {
    it('renders collections list page', () => {
        const { container } = render(CollectionsPage);
        expect(container).toBeTruthy();
    });

    it('renders collection uid page without throwing', () => {
        const { container } = render(CollectionPage);
        expect(container).toBeTruthy();
    });
});
