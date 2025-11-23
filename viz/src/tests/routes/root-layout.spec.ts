import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import RootLayout from '../../routes/+layout.svelte';

describe('Root layout', () => {
    it('renders children content without throwing', () => {
        const { container } = render(RootLayout, { slots: { default: '<div>child</div>' } });
        expect(container).toBeTruthy();
        expect(container.textContent).toContain('child');
    });
});
