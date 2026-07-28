import type { IconProps } from "$lib/components/ui/MaterialIcon.svelte";
import type { MaterialSymbol } from "$lib/types/MaterialSymbol";

export type MenuItem = {
    id: string;
    label: string;
    action?: (event: MouseEvent | KeyboardEvent) => void;
    disabled?: boolean;
    danger?: boolean;
    separator?: boolean;
    iconName?: MaterialSymbol | IconProps; // optional icon name/class or icon props
    shortcut?: string; // optional keyboard shortcut label
    children?: MenuItem[]; // optional submenu
};
