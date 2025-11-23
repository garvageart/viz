import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import SidebarCloseIcon from '$lib/components/SidebarCloseIcon.svelte';
import { sidebar } from '$lib/states/index.svelte';

describe('SidebarCloseIcon', () => {
    it('shows different chevron depending on sidebar.open', () => {
        sidebar.open = false as any;
        const { getByText, rerender } = render(SidebarCloseIcon);
        // when closed, should show chevron_right text
        expect(getByText('chevron_right')).toBeTruthy();

        sidebar.open = true as any;
        // re-render component to pick up state change
        rerender({});
        expect(getByText('chevron_left')).toBeTruthy();
    });
});
