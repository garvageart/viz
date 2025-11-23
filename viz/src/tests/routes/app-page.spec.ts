import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import AppPage from '../../routes/(app)/+page.svelte';

describe('(app) page', () => {
    beforeEach(() => {
        // provide a header element for clientHeight access
        const existing = document.querySelector('header');
        if (!existing) {
            const h = document.createElement('header');
            h.style.height = '40px';
            document.body.appendChild(h);
        }
    });

    it('renders main content without throwing', () => {
        const { container } = render(AppPage);
        expect(container).toBeTruthy();
        // Ensure main element exists
        expect(container.querySelector('main')).toBeTruthy();
    });
});
