import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import SliderToggle from '$lib/components/SliderToggle.svelte';

describe('SliderToggle', () => {
    it('reflects initial value and toggles on click', async () => {
        const { container } = render(SliderToggle, { label: 'Test', value: 'off' });
        const btn = container.querySelector('button[role="switch"]') as HTMLButtonElement;
        expect(btn).toBeTruthy();
        expect(btn.getAttribute('aria-checked')).toBe('false');

        await fireEvent.click(btn);
        expect(btn.getAttribute('aria-checked')).toBe('true');

        await fireEvent.click(btn);
        expect(btn.getAttribute('aria-checked')).toBe('false');
    });
});
