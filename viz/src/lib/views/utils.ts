import type { VizSubPanel, SubPanelChilds } from "$lib/components/panels/SubPanel.svelte";
import type { TabData } from "./tabs.svelte";

/**
 * Finds the index of a panel in the given layout by its pane key ID.
 *
 * @param {VizSubPanel[]} layout The layout to search in.
 * @param {string|undefined} paneKeyId The pane key ID to search for.
 * @returns {number} The index of the panel in the layout, or -1 if not found.
 */
export function findPanelIndex(layout: VizSubPanel[], paneKeyId: string | undefined): number {
    return layout.findIndex((panel) => panel.paneKeyId === paneKeyId);
}

/**
 * Finds the index of a child subpanel in the given child structure by its pane key ID.
 *
 * @param {SubPanelChilds} childs The child structure to search in.
 * @param {string|undefined} paneKeyId The pane key ID to search for.
 * @returns {number} The index of the child subpanel in the child structure, or -1 if not found.
 */
export function findChildIndex(
    childs: SubPanelChilds,
    paneKeyId: string | undefined
): number {
    return childs.content.findIndex((sub) => sub.paneKeyId === paneKeyId) ?? -1;
}


/**
 * Retrieves the pane key ID of the parent panel for a given subpanel identified by its pane key ID.
 *
 * @param {VizSubPanel[]} layout - The layout containing panels and their subpanels.
 * @param {string | undefined} paneKeyId - The pane key ID of the subpanel to find the parent for.
 * @returns {string | null} The pane key ID of the parent panel, or null if not found.
 */
export function getSubPanelParent(layout: VizSubPanel[], paneKeyId: string | undefined): string | null {
    if (!paneKeyId) {
        return null;
    }

    for (const panel of layout) {
        if (!panel.childs.content) {
            continue;
        }

        for (const sub of panel.childs.content) {
            if (sub.paneKeyId === paneKeyId) {
                return panel.paneKeyId ?? null;;
            }
        }
    }

    return null;
}

export function cleanupSubPanels(layout: VizSubPanel[], state: TabData, keyId: string) {
    let srcParentIdx = layout.findIndex((panel) =>
        panel.childs.content?.some((sub) => sub.paneKeyId === state.view.parent)
    );
    let srcChildIdx = -1;

    if (srcParentIdx !== -1) {
        srcChildIdx = findChildIndex(layout[srcParentIdx].childs, state.view.parent);
    }

    const srcChild = layout[srcParentIdx].childs.content[srcChildIdx];

    // Remove the source child subpanel if it is now empty
    if (srcChild.views.length === 0) {
        if (window.debug === true) {
            console.log(`empty subpanel ${srcChild.paneKeyId}. removing it`);
        }

        layout[srcParentIdx].childs.content.splice(srcChildIdx, 1);
    }

    if (layout[srcParentIdx].childs.content.length === 0) {
        layout.splice(srcParentIdx, 1);

        if (window.debug === true) {
            console.log(`one panel ${layout[0].paneKeyId} left, setting maximum size to 100`);
        }

        layout[0].childs.internalSubPanelContainer.size = 100;
    }
}