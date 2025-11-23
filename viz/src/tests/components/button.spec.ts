import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Button from '$lib/components/Button.svelte';

describe('Button component', () => {
    let originalComputed: any;

    beforeEach(() => {
        // Mock computedStyleMap used in onMount
        originalComputed = (HTMLElement.prototype as any).computedStyleMap;
        (HTMLElement.prototype as any).computedStyleMap = function () {
            return { get: (_: string) => ({ toString: () => 'var(--imag-10)' }) };
        };
    });

    afterEach(() => {
        (HTMLElement.prototype as any).computedStyleMap = originalComputed;
    });

    it('changes background color on hover and restores on leave', async () => {
        const { container } = render(Button, { hoverColor: 'var(--imag-20)', $$slots: { default: ['span'] }, $$scope: {} });
        const btn = container.querySelector('button') as HTMLButtonElement;
        expect(btn).toBeTruthy();

        await fireEvent.mouseEnter(btn);
        expect(btn.style.getPropertyValue('background-color')).toBe('var(--imag-20)');

        await fireEvent.mouseLeave(btn);
        // after leave should restore to default background (we mocked to var(--imag-10))
        expect(btn.style.getPropertyValue('background-color')).toBe('var(--imag-10)');
    });
});
