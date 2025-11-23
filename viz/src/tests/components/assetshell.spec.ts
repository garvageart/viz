import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { SvelteSet } from 'svelte/reactivity';

import AssetsShell from '$lib/components/AssetsShell.svelte';
import AssetGrid from '$lib/components/AssetGrid.svelte';

let originalComputed: any;

const makeAsset = (uid: string, name = 'n') => ({
    uid,
    name,
    created_at: '2020-01-01T00:00:00Z',
    image_paths: { thumbnail: 'https://example.com/t.jpg' },
    image_metadata: { file_name: `${name}.jpg` }
});

describe('AssetsShell toolbar and empty state', () => {
    beforeAll(() => {
        originalComputed = (HTMLElement.prototype as any).computedStyleMap;
        (HTMLElement.prototype as any).computedStyleMap = function () {
            return { get: (_: string) => ({ toString: () => 'var(--imag-10)' }) };
        };
    });

    afterAll(() => {
        (HTMLElement.prototype as any).computedStyleMap = originalComputed;
    });

    it('shows no-assets message when grid data is empty', () => {
        const gridProp = { data: [] };
        const { container } = render(AssetsShell, { grid: gridProp, gridComponent: AssetGrid });

        const noAssets = container.querySelector('#viz-no_assets');
        expect(noAssets).toBeTruthy();
        expect(noAssets?.textContent?.trim()).toMatch(/No assets to display/);
    });

    it('renders selection toolbar when grid.selectedAssets size > 1 and clear button clears selection', async () => {
        const assets = [makeAsset('c1'), makeAsset('c2'), makeAsset('c3')];
        const sset = new SvelteSet<any>();
        sset.add(assets[0]);
        sset.add(assets[1]);

        const gridProp = { data: assets, selectedAssets: sset };
        const { container, getByRole } = render(AssetsShell, { grid: gridProp, gridComponent: AssetGrid });

        const selectionToolbar = container.querySelector('.selection-toolbar');
        expect(selectionToolbar).toBeTruthy();

        const clearBtn = container.querySelector('#coll-clear-selection') as HTMLButtonElement | null;
        expect(clearBtn).toBeTruthy();

        await fireEvent.click(clearBtn!);
        // SvelteSet is mutated by the component click handler
        expect(sset.size).toBe(0);
    });
});
