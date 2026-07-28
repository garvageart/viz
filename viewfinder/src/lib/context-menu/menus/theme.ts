import type { MenuItem } from "$lib/context-menu/types";
import { themeState } from "$lib/states/index.svelte";

export function themeContextMenu() {
    const menuItems: MenuItem[] = [
        {
            id: "theme-default-system",
            label: "System",
            iconName: "settings_brightness",
            action: () => themeState.setPreferredTheme("system"),
            disabled: themeState.preferredTheme === "system"
        },
        {
            id: "theme-default-light",
            label: "Light",
            iconName: "light_mode",
            action: () => themeState.setPreferredTheme("light"),
            disabled: themeState.preferredTheme === "light"
        },
        {
            id: "theme-default-dark",
            label: "Dark",
            iconName: "dark_mode",
            action: () => themeState.setPreferredTheme("dark"),
            disabled: themeState.preferredTheme === "dark"
        }
    ];

    return menuItems;
}
