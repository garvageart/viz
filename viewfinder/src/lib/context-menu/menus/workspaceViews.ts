import { DYNAMIC_ROUTE_REGEX } from "#lib/constants.js";
import type { MenuItem } from "#lib/context-menu/types.js";
import { views } from "#lib/layouts/views.js";
import { workspaceState } from "#lib/states/workspace.svelte.js";
import { toasts } from "#lib/toast-notifcations/toasts.svelte.js";
import VizView from "#lib/views/views.svelte.js";

export function createWorkspaceViewsMenu() {
    const workspace = workspaceState.workspace;

    const activeViewNames = new Set<string>();
    if (workspace) {
        const groups = workspace.getAllTabGroups();
        for (const group of groups) {
            for (const view of group.views) {
                if (view && view.name) {
                    activeViewNames.add(view.name);
                }
            }
        }
    }

    const menuItems: MenuItem[] = views
        .filter((view) => !view.path || !DYNAMIC_ROUTE_REGEX.test(view.path))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((view) => ({
            id: view.name,
            label: view.name,
            action: () => {
                if (!workspace) {
                    toasts.add({
                        title: "No Workspace",
                        type: "error",
                        message: "No workspace available."
                    });
                    return;
                }

                let targetGroup = workspace.activeGroup;

                if (!targetGroup) {
                    targetGroup = workspace.getAllTabGroups()[0];
                    if (!targetGroup) {
                        toasts.add({
                            title: "No Panels Available",
                            type: "error",
                            message: "There are no panels to add the view to."
                        });
                        return;
                    }
                    workspace.setActiveGroup(targetGroup.id);
                }

                const existingView = targetGroup.views.find((v) => v.name === view.name);

                if (existingView) {
                    targetGroup.setActive(existingView.id);
                } else {
                    const newView = VizView.fromJSON(view.toJSON(), view.component);
                    targetGroup.addTab(newView);
                }
            },
            disabled: activeViewNames.has(view.name)
        }));

    return menuItems;
}
