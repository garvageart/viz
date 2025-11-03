import { describe, it, expect, beforeEach } from 'vitest';
import { buildLayoutContextMenu, buildTabContextMenu } from '$lib/components/panels/subpanel-context';
import { layoutState, layoutTree } from '$lib/third-party/svelte-splitpanes/state.svelte';
import VizView from '$lib/views/views.svelte';

describe('subpanel-context builders', () => {
    beforeEach(() => {
        // reset
        layoutState.tree = [];
        layoutTree.locked = false as any;
    });

    it('toggles layout lock when layout menu action is executed', () => {
        const items = buildLayoutContextMenu();
        expect(items.length).toBeGreaterThan(0);
        const item = items[0];
        expect(layoutTree.locked).toBe(false);
        item.action?.({} as any);
        expect(layoutTree.locked).toBe(true);
        item.action?.({} as any);
        expect(layoutTree.locked).toBe(false);
    });

    it('tab menu disables close when view is locked', () => {
        const view = new VizView({ name: 't', component: {} as any, id: 1 });
        view.locked = true as any;
        const panelViews = [view];

        const items = buildTabContextMenu(view, panelViews as any, 'key', {
            closeTab: () => { },
            closeOtherTabs: () => { },
            closeTabsToRight: () => { },
            splitRight: () => { },
            splitDown: () => { },
            moveToPanel: () => { },
            closeAllTabs: () => { },
            toggleTabLock: () => { }
        });

        const closeItem = items.find(i => i.id === 'close');
        expect(closeItem).toBeDefined();
        expect(closeItem?.disabled).toBe(true);
    });
});
