import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import PhotosPage from '../../routes/(app)/photos/+page.svelte';

describe('photos page', () => {
    it('renders photos page without throwing', () => {
        const { container } = render(PhotosPage);
        expect(container).toBeTruthy();
    });
});
