import type { DragMimeType } from "$lib/constants";
import { DragData } from "./data";
import type { DragSourceItem, DropIntent } from "./types";

export interface DragSession {
    items: DragSourceItem[];
    primaryMimeType: DragMimeType;
    label: string | null;
    thumbnailUrl: string | null;
    coords: { x: number; y: number };
    modifiers: {
        altKey: boolean;
        shiftKey: boolean;
        ctrlKey: boolean;
        metaKey: boolean;
    };
    targetId: string | null;
    actionLabel: string | null;
    intent: DropIntent;
}

class DragCoordinator {
    session = $state<DragSession | null>(null);

    get isDragging(): boolean {
        return this.session !== null;
    }

    startDrag(items: DragSourceItem[], e: DragEvent) {
        if (!e.dataTransfer || items.length === 0) {
            return;
        }

        for (const item of items) {
            const dragData = new DragData(item.mimeType, item.payload);
            dragData.setData(e.dataTransfer);
        }

        e.dataTransfer.effectAllowed = "all";

        // Hide default browser drag ghost for custom tooltip overlay
        const blank = document.createElement("canvas");
        blank.width = 1;
        blank.height = 1;
        e.dataTransfer.setDragImage(blank, 0, 0);

        const primary = items[0];
        this.session = {
            items,
            primaryMimeType: primary.mimeType,
            label: primary.label ?? primary.mimeType,
            thumbnailUrl: primary.thumbnailUrl ?? null,
            coords: { x: e.clientX, y: e.clientY },
            modifiers: {
                altKey: e.altKey,
                shiftKey: e.shiftKey,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey
            },
            targetId: null,
            actionLabel: null,
            intent: "none"
        };

        window.addEventListener("dragover", this.handleGlobalDragOver, true);
        window.addEventListener("dragend", this.endDrag, { once: true });
        window.addEventListener("keydown", this.handleKeyModifier);
        window.addEventListener("keyup", this.handleKeyModifier);
    }

    private handleGlobalDragOver = (e: DragEvent) => {
        if (!this.session) {
            return;
        }

        this.session.coords = { x: e.clientX, y: e.clientY };
        this.session.modifiers = {
            altKey: e.altKey,
            shiftKey: e.shiftKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey
        };
    };

    private handleKeyModifier = (e: KeyboardEvent) => {
        if (!this.session) {
            return;
        }

        this.session.modifiers = {
            altKey: e.altKey,
            shiftKey: e.shiftKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey
        };
    };

    setHoverTarget(targetId: string | null, intent: DropIntent, label?: string) {
        if (!this.session) {
            return;
        }

        this.session.targetId = targetId;
        this.session.intent = intent;
        this.session.actionLabel = label ?? null;
    }

    endDrag = () => {
        this.session = null;

        DragData.clear();
        window.removeEventListener("dragover", this.handleGlobalDragOver, true);
        window.removeEventListener("keydown", this.handleKeyModifier);
        window.removeEventListener("keyup", this.handleKeyModifier);
    };
}

export const dragCoordinator = new DragCoordinator();
