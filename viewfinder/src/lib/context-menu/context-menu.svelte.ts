import { modalsManager } from "$lib/components/modals/manager/ModalManager.svelte";
import { ZIndex } from "$lib/constants/z-index";
import type { MenuItem } from "./types";

export type ContextMenuAnchor = MouseEvent | HTMLElement | { x: number; y: number } | null;

export interface ContextMenuOptions {
    align?: "left" | "right";
    offsetX?: number;
    offsetY?: number;
    zIndex?: number;
    onClose?: () => void;
    onSelect?: (detail: { item: MenuItem; index: number; event: MouseEvent | KeyboardEvent }) => void;
}

export class ContextMenuManager {
    isOpen = $state(false);
    items = $state<MenuItem[]>([]);
    anchor = $state<HTMLElement | { x: number; y: number } | null>(null);
    options = $state<ContextMenuOptions>({});

    get zIndex(): number {
        if (this.options.zIndex !== undefined) {
            return this.options.zIndex;
        }

        if (modalsManager.modals.length > 0) {
            return modalsManager.baseZIndex + modalsManager.modals.length * 10 + 10;
        }

        return ZIndex.Popover;
    }

    open(items: MenuItem[], anchor: ContextMenuAnchor, options: ContextMenuOptions = {}) {
        if (!items || items.length === 0) {
            this.close();
            return;
        }

        if (anchor instanceof MouseEvent) {
            anchor.preventDefault();
            this.anchor = { x: anchor.clientX, y: anchor.clientY };
        } else {
            this.anchor = anchor;
        }

        this.items = items;
        this.options = options;
        this.isOpen = true;
    }

    close() {
        if (this.isOpen) {
            const onClose = this.options.onClose;

            this.isOpen = false;
            this.items = [];
            this.anchor = null;
            this.options = {};

            if (onClose) {
                onClose();
            }
        }
    }
}

export const contextMenu = new ContextMenuManager();
