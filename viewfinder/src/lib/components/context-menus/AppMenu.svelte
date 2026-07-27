<script lang="ts">
    import { goto } from "$app/navigation";
    import { DYNAMIC_ROUTE_REGEX } from "$lib/constants";
    import ContextMenu from "$lib/context-menu/ContextMenu.svelte";
    import type { MenuItem } from "$lib/context-menu/types";
    import { views } from "$lib/layouts/views";
    import { isMobile, user } from "$lib/states/index.svelte";
    import { workspaceState } from "$lib/states/workspace.svelte";
    import { toastState } from "$lib/toast-notifcations/notif-state.svelte";
    import VizView from "$lib/views/views.svelte";

    let { isOpen = $bindable(false), anchor = $bindable() } = $props<{
        isOpen?: boolean;
        anchor?: HTMLElement | null;
    }>();

    const adminSettings: MenuItem = {
        id: "admin",
        label: "Admin",
        icon: "admin_panel_settings",
        children: [
            {
                id: "admin-system",
                label: "Dashboard",
                icon: "dashboard",
                action: () => goto("/admin")
            },
            {
                id: "admin-users",
                label: "Users",
                icon: "group",
                action: () => goto("/admin/users")
            },
            { id: "admin-jobs", label: "Jobs", icon: "work", action: () => goto("/admin/jobs") },
            {
                id: "admin-events",
                label: "Events",
                icon: "event",
                action: () => goto("/admin/events")
            },
            {
                id: "admin-cache",
                label: "Cache",
                icon: "cached",
                action: () => goto("/admin/cache")
            },
            {
                id: "admin-storage",
                label: "Storage",
                icon: "hard_drive",
                action: () => goto("/admin/storage")
            }
        ]
    };

    function buildViewMenuItems(): MenuItem[] {
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
                id: `view-${view.name}`,
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
    }

    function buildWorkspaceItem(): MenuItem {
        if (isMobile) {
            return {
                id: "views",
                label: "Views",
                icon: "view_quilt",
                children: buildViewMenuItems()
            };
        }

        return {
            id: "workspace",
            label: "Workspace",
            icon: "space_dashboard",
            action: () => goto("/")
        };
    }

    const menuItems: MenuItem[] = [
        buildWorkspaceItem(),
        { id: "divider-1", label: "", separator: true },
        { id: "photos", label: "Photos", icon: "photo", action: () => goto("/photos") },
        {
            id: "collections",
            label: "Collections",
            icon: "photo_album",
            action: () => goto("/collections")
        },
        { id: "divider-2", label: "", separator: true },
        { id: "settings", label: "Settings", icon: "settings", action: () => goto("/settings") },
        {
            id: "help",
            label: "Help & Support",
            icon: "help",
            action: () => window.open("https://github.com/garvageart/viz/issues", "_blank")
        },
        {
            id: "shortcuts",
            label: "Keyboard Shortcuts",
            shortcut: "?",
            icon: "keyboard",
            action: () => alert("Keyboard shortcuts:\n\nCtrl/Cmd + K: Search\nEsc: Close panels")
        }
    ];

    if (user.isAdmin) {
        menuItems.splice(4, 0, adminSettings);
        menuItems.splice(4, 0, { id: "divider-admin", label: "", separator: true });
    }
</script>

<ContextMenu
    htmlProps={{
        class: "app-menu"
    }}
    bind:showMenu={isOpen}
    items={menuItems}
    {anchor}
    align="left"
    offsetY={4}
/>
