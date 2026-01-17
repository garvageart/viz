import type { MaterialSymbol } from "$lib/types/MaterialSymbol";

export type MenuItem = {
    id: string;
    label: string;
    action?: (event: MouseEvent | KeyboardEvent) => void;
    disabled?: boolean;
    danger?: boolean;
    separator?: boolean;
    icon?: MaterialSymbol; // optional icon name/class
    shortcut?: string; // optional keyboard shortcut label
    children?: MenuItem[]; // optional submenu
};