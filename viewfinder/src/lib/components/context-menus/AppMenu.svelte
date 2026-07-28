<script lang="ts">
    import { goto } from "$app/navigation";
    import ContextMenu from "$lib/context-menu/ContextMenu.svelte";
    import { createWorkspaceViewsMenu } from "$lib/context-menu/menus/workspaceViews";
    import type { MenuItem } from "$lib/context-menu/types";
    import { isMobile, user } from "$lib/states/index.svelte";

    let { isOpen = $bindable(false), anchor = $bindable() } = $props<{
        isOpen?: boolean;
        anchor?: HTMLElement | null;
    }>();

    const adminSettings: MenuItem = {
        id: "admin",
        label: "Admin",
        iconName: "admin_panel_settings",
        children: [
            {
                id: "admin-system",
                label: "Dashboard",
                iconName: "dashboard",
                action: () => goto("/admin")
            },
            {
                id: "admin-users",
                label: "Users",
                iconName: "group",
                action: () => goto("/admin/users")
            },
            { id: "admin-jobs", label: "Jobs", iconName: "work", action: () => goto("/admin/jobs") },
            {
                id: "admin-events",
                label: "Events",
                iconName: "event",
                action: () => goto("/admin/events")
            },
            {
                id: "admin-cache",
                label: "Cache",
                iconName: "cached",
                action: () => goto("/admin/cache")
            },
            {
                id: "admin-storage",
                label: "Storage",
                iconName: "hard_drive",
                action: () => goto("/admin/storage")
            }
        ]
    };

    function buildWorkspaceItem(): MenuItem {
        if (isMobile) {
            return {
                id: "views",
                label: "Views",
                iconName: "view_quilt",
                children: createWorkspaceViewsMenu()
            };
        }

        return {
            id: "workspace",
            label: "Workspace",
            iconName: "space_dashboard",
            action: () => goto("/")
        };
    }

    const menuItems: MenuItem[] = [
        buildWorkspaceItem(),
        { id: "divider-1", label: "", separator: true },
        { id: "photos", label: "Photos", iconName: "photo", action: () => goto("/photos") },
        {
            id: "collections",
            label: "Collections",
            iconName: "photo_album",
            action: () => goto("/collections")
        },
        { id: "divider-2", label: "", separator: true },
        { id: "settings", label: "Settings", iconName: "settings", action: () => goto("/settings") },
        {
            id: "help",
            label: "Help & Support",
            iconName: "help",
            // TODO: Change this (configurable via build injection __VIZ_CONFIG__)
            action: () => {
                location.href = "https://github.com/garvageart/viz/issues";
            }
        },
        {
            id: "shortcuts",
            label: "Keyboard Shortcuts",
            shortcut: "?",
            iconName: "keyboard",
            // TODO: Centralise keyboard shortcuts in a manager
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
