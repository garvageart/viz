import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';

import PhotoAssetGrid from '$lib/components/PhotoAssetGrid.svelte';

let originalComputed: any;
let originalAtob: any;

const makeAsset = (uid: string, name = 'n') => ({
    uid,
    name,
    created_at: '2020-01-01T00:00:00Z',
    image_paths: { thumbnail: 'https://example.com/t.jpg' },
    image_metadata: { file_name: `${name}.jpg` },
    width: 400,
    height: 300
});

describe('PhotoAssetGrid selection behavior (headless DOM)', () => {
    beforeAll(() => {
        // Mock computedStyleMap used by some components
        originalComputed = (HTMLElement.prototype as any).computedStyleMap;
        (HTMLElement.prototype as any).computedStyleMap = function () {
            return { get: (_: string) => ({ toString: () => 'var(--imag-10)' }) };
        };

        if (!(global as any).atob) {
            originalAtob = (global as any).atob;
            (global as any).atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
        }
    });

    afterAll(() => {
        (HTMLElement.prototype as any).computedStyleMap = originalComputed;
        if (originalAtob !== undefined) (global as any).atob = originalAtob;
    });

    it('selects an asset on click and toggles with ctrl/shift', async () => {
        const assets = [makeAsset('a1', 'one'), makeAsset('a2', 'two'), makeAsset('a3', 'three')];

        // Render in 'cards' mode so the test does not rely on virtualized grid layout
        const { container } = render(PhotoAssetGrid, { data: assets, allData: assets, view: 'cards' });

        // PhotoAssetGrid renders photo tiles with class 'asset-photo' and selection uses 'selected-photo'
        const cards = Array.from(container.querySelectorAll('.asset-photo')) as HTMLElement[];
        expect(cards.length).toBeGreaterThanOrEqual(3);

        // Click first card -> should become selected
        await fireEvent.click(cards[0]);
        expect(cards[0].classList.contains('selected-photo')).toBe(true);

        // Ctrl-click second card -> toggle selection, both should be selected
        await fireEvent.click(cards[1], { ctrlKey: true } as MouseEventInit);
        expect(cards[1].classList.contains('selected-photo')).toBe(true);

        // Shift-click third card -> should select range from first to third
        // Ensure singleSelectedAsset is present by clicking first again to set single selection
        await fireEvent.click(cards[0]);
        await fireEvent.click(cards[2], { shiftKey: true } as MouseEventInit);

        // After shift selection, indices 0..2 should be selected
        const selected = cards.filter((c) => c.classList.contains('selected-photo'));
        expect(selected.length).toBeGreaterThanOrEqual(3);
    });
});
