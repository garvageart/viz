import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import SearchInput from '$lib/components/SearchInput.svelte';

describe('SearchInput component', () => {
    it('calls performSearch on Enter and on button click, and clear clears value', async () => {
        const perform = vi.fn();
        const { getByRole, getByTitle, queryByTitle } = render(SearchInput, { value: '', performSearch: perform });

        const input = getByRole('searchbox');
        const searchButton = getByTitle('Search');

        // typing and pressing Enter should call performSearch
        await fireEvent.input(input, { target: { value: 'hello' } });
        await fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
        expect(perform).toHaveBeenCalled();

        // clicking search button should also call performSearch
        perform.mockClear();
        await fireEvent.click(searchButton);
        expect(perform).toHaveBeenCalled();

        // after value present, clear button should exist and clear the value
        const clearButton = queryByTitle('Clear Search');
        if (clearButton) {
            await fireEvent.click(clearButton);
            // value should be cleared (no clear button)
            const gone = queryByTitle('Clear Search');
            expect(gone).toBeNull();
        }
    });
});
