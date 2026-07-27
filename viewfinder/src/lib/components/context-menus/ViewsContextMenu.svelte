<script lang="ts">
    import { DYNAMIC_ROUTE_REGEX } from "$lib/constants";
    import ContextMenu from "$lib/context-menu/ContextMenu.svelte";
    import type { MenuItem } from "$lib/context-menu/types";
    import { views } from "$lib/layouts/views";
    import { workspaceState } from "$lib/states/workspace.svelte";
    import { toastState } from "$lib/toast-notifcations/notif-state.svelte";
    import VizView from "$lib/views/views.svelte";

    let { showMenu = $bindable(false), anchor = $bindable() } = $props<{
        showMenu?: boolean;
        anchor?: HTMLElement | { x: number; y: number } | null;
    }>();

    const menuItems: MenuItem[] = $derived.by(() => {
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

        return views
            .filter((view) => !view.path || !DYNAMIC_ROUTE_REGEX.test(view.path))
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((view) => ({
                id: view.name,
                label: view.name,
                action: () => {
                    if (!workspace) {
                        toastState.addToast({
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
                            toastState.addToast({
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
    });
</script>

<ContextMenu bind:showMenu items={menuItems} {anchor} align="left" offsetY={4} />
