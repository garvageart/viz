import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render } from '@testing-library/svelte';
import MaterialIcon from '$lib/components/MaterialIcon.svelte';

let origFonts: any;

describe('MaterialIcon', () => {
    beforeAll(() => {
        // ensure document.fonts exists for code paths that check it
        origFonts = (document as any).fonts;
        (document as any).fonts = { load: () => Promise.resolve() };
    });

    afterAll(() => {
        (document as any).fonts = origFonts;
    });

    it('renders ligature text when generated component not present', () => {
        const { getByText } = render(MaterialIcon, { iconName: 'search', iconStyle: 'sharp' });
        expect(getByText('search')).toBeTruthy();
    });
});
