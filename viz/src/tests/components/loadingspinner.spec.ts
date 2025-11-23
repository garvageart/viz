import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

describe('LoadingSpinner', () => {
    it('renders with provided color', () => {
        const { container } = render(LoadingSpinner, { color: 'red' });
        const circle = container.querySelector('circle');
        expect(circle).toBeTruthy();
        expect(circle?.getAttribute('stroke')).toBe('red');
    });
});
