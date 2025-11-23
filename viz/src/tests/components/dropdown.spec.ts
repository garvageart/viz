import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Dropdown from '$lib/components/Dropdown.svelte';

describe('Dropdown', () => {
    it('shows title when no selection and displays selectedOption title', async () => {
        const options = [{ title: 'One' }, { title: 'Two' }];
        const { getByText, container } = render(Dropdown, { options, title: 'Actions' });
        expect(getByText('Actions')).toBeTruthy();

        const { getByText: getByText2 } = render(Dropdown, { options, selectedOption: options[1] });
        expect(getByText2('Two')).toBeTruthy();
    });

    it('opens context menu and triggers onSelect when an option is clicked', async () => {
        const optionClicked: any[] = [];
        const options = [{ title: 'One' }, { title: 'Two' }];
        const onSelect = (opt: any) => optionClicked.push(opt.title);

        const { container, getByRole } = render(Dropdown, { options, onSelect, title: 'Menu' });
        const button = container.querySelector('button.viz-dropdown-button') as HTMLButtonElement;
        expect(button).toBeTruthy();

        await fireEvent.click(button);

        // ContextMenu is portaled to document.body; look for .context-menu
        const menu = document.body.querySelector('.context-menu') as HTMLElement;
        expect(menu).toBeTruthy();

        const firstItem = menu.querySelector('button[data-index="0"]') as HTMLButtonElement;
        expect(firstItem).toBeTruthy();

        await fireEvent.click(firstItem);
        expect(optionClicked).toContain('One');
    });
});
