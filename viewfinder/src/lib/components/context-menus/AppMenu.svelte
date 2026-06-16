<script lang="ts">
    import { goto } from "$app/navigation";
    import ContextMenu from "$lib/context-menu/ContextMenu.svelte";
    import type { MenuItem } from "$lib/context-menu/types";
    import { user } from "$lib/states/index.svelte";

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
            }
        ]
    };

    const menuItems: MenuItem[] = [
        { id: "workspace", label: "Workspace", icon: "space_dashboard", action: () => goto("/") },
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
