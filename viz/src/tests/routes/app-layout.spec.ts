import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render } from '@testing-library/svelte';

// mock runtime loader so onMount registerReady resolves quickly
vi.mock('$lib/runtime-config', () => ({ loadRuntimeConfig: () => Promise.resolve({}) }));

import AppLayout from '../../routes/(app)/+layout.svelte';

describe('(app) layout', () => {
    let origImport: any;
    beforeAll(() => {
        // avoid registering actual readiness side-effects
        origImport = (global as any).document?.fonts;
        if (typeof document !== 'undefined') {
            (document as any).fonts = { load: () => Promise.resolve() } as any;
        }
    });

    afterAll(() => {
        if (typeof document !== 'undefined') {
            (document as any).fonts = origImport;
        }
    });

    it('renders header and children without throwing', () => {
        const { container } = render(AppLayout, { slots: { default: '<div>appchild</div>' } });
        expect(container).toBeTruthy();
        expect(container.textContent).toContain('appchild');
    });
});
