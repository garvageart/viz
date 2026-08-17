import { DragData } from "./data";

export interface MakeDraggableConfig {
    type: string;
    payload: () => unknown;
    source?: string;
    dragImageSelector?: string;
}

export function makeDraggable(node: HTMLElement, config: MakeDraggableConfig) {
    node.draggable = true;

    function onDragStart(e: DragEvent) {
        if (!e.dataTransfer) {
            return;
        }

        const payload = config.payload();
        const dragData = new DragData(config.type, payload);
        dragData.setData(e.dataTransfer, config.source);
        e.dataTransfer.effectAllowed = "copy";

        if (config.dragImageSelector) {
            const img = node.querySelector(config.dragImageSelector) as HTMLImageElement | null;
            if (img) {
                e.dataTransfer.setDragImage(img, 0, 0);
            }
        }
    }

    function onDragEnd() {
        DragData.clear();
    }

    node.addEventListener("dragstart", onDragStart);
    node.addEventListener("dragend", onDragEnd);

    return {
        destroy() {
            node.removeEventListener("dragstart", onDragStart);
            node.removeEventListener("dragend", onDragEnd);
            node.draggable = false;
        }
    };
}

export interface MakeDropTargetConfig {
    type: string | string[];
    dropEffect?: "none" | "copy" | "link" | "move";
    activeClass?: string;
    onDrop: (payload: unknown, e: DragEvent) => void | Promise<void>;
}

export function makeDropTarget(node: HTMLElement, config: MakeDropTargetConfig) {
    const types = Array.isArray(config.type) ? config.type : [config.type];
    let depth = 0;

    function matchesAnyType(dt: DataTransfer): boolean {
        return types.some((t) => DragData.isType(dt, t));
    }

    function onDragEnter(e: DragEvent) {
        if (!e.dataTransfer || !matchesAnyType(e.dataTransfer)) {
            return;
        }

        depth++;
        if (depth === 1 && config.activeClass) {
            node.classList.add(config.activeClass);
        }
    }

    function onDragOver(e: DragEvent) {
        if (!e.dataTransfer || !matchesAnyType(e.dataTransfer)) {
            return;
        }

        e.preventDefault();
        e.dataTransfer.dropEffect = config.dropEffect || "copy";
    }

    function onDragLeave() {
        depth--;
        if (depth <= 0) {
            depth = 0;
            if (config.activeClass) {
                node.classList.remove(config.activeClass);
            }
        }
    }

    async function onDrop(e: DragEvent) {
        depth = 0;
        if (config.activeClass) {
            node.classList.remove(config.activeClass);
        }

        if (!e.dataTransfer) {
            return;
        }

        for (const t of types) {
            if (DragData.isType(e.dataTransfer, t)) {
                e.preventDefault();
                e.stopPropagation();

                const dragData = DragData.getData(e.dataTransfer, t);
                if (dragData) {
                    await config.onDrop(dragData.payload, e);
                }
                return;
            }
        }
    }

    node.addEventListener("dragenter", onDragEnter);
    node.addEventListener("dragover", onDragOver);
    node.addEventListener("dragleave", onDragLeave);
    node.addEventListener("drop", onDrop);

    return {
        destroy() {
            node.removeEventListener("dragenter", onDragEnter);
            node.removeEventListener("dragover", onDragOver);
            node.removeEventListener("dragleave", onDragLeave);
            node.removeEventListener("drop", onDrop);
        }
    };
}
