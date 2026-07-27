<script lang="ts">
    import ContextMenu from "$lib/context-menu/ContextMenu.svelte";
    import type { MenuItem } from "$lib/context-menu/types";
    import { themeState } from "$lib/states/index.svelte";

    let { showMenu = $bindable(false), anchor = $bindable() } = $props<{
        showMenu?: boolean;
        anchor?: HTMLElement | { x: number; y: number } | null;
    }>();

    const menuItems: MenuItem[] = [
        {
            id: "theme-default-system",
            label: "System",
            icon: "settings_brightness",
            action: () => themeState.setPreferredTheme("system"),
            disabled: themeState.preferredTheme === "system"
        },
        {
            id: "theme-default-light",
            label: "Light",
            icon: "light_mode",
            action: () => themeState.setPreferredTheme("light"),
            disabled: themeState.preferredTheme === "light"
        },
        {
            id: "theme-default-dark",
            label: "Dark",
            icon: "dark_mode",
            action: () => themeState.setPreferredTheme("dark"),
            disabled: themeState.preferredTheme === "dark"
        }
    ];
</script>

<ContextMenu bind:showMenu items={menuItems} {anchor} align="right" offsetY={4} />
