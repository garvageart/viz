import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import InputText from '$lib/components/dom/InputText.svelte';

describe('InputText', () => {
    it('renders and updates value on input events', async () => {
        const { getByRole } = render(InputText, { placeholder: 'Name' });
        const input = getByRole('textbox') as HTMLInputElement;
        expect(input).toBeTruthy();

        await fireEvent.input(input, { target: { value: 'Alice' } });
        expect((input as HTMLInputElement).value).toBe('Alice');
    });
});
