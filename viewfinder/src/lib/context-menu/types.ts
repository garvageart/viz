import type { Snippet } from "svelte";
import type { IconProps } from "$lib/components/ui/MaterialIcon.svelte";
import type { MaterialSymbol } from "$lib/types/MaterialSymbol";

export type MenuItem<T = any> = {
    id: string;
    label?: string;
    action?: (event: MouseEvent | KeyboardEvent) => void;
    disabled?: boolean;
    danger?: boolean;
    separator?: boolean;
    iconName?: MaterialSymbol | IconProps; // optional icon name/class or icon props
    shortcut?: string; // optional keyboard shortcut label
    children?: MenuItem<T>[]; // optional submenu
    content?: Snippet<[item: MenuItem<T>, index?: number]>; // optional custom content rendered instead of the icon/label row
    data?: T;
};
