import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import AssetToolbar from '$lib/components/AssetToolbar.svelte';

describe('AssetToolbar', () => {
    it('renders children and respects stickyToolbar prop', () => {
        const { container } = render(AssetToolbar, { slots: { default: '<div>ToolbarContent</div>' }, stickyToolbar: false as any });
        expect(container.querySelector('.viz-toolbar-container')).toBeTruthy();
        // when stickyToolbar false the inline style should include 'position: relative'
        const div = container.querySelector('.viz-toolbar-container') as HTMLElement;
        expect(div.style.position === 'relative' || div.getAttribute('style')?.includes('position: relative')).toBeTruthy();
    });
});
