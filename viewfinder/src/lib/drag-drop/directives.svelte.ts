import { dragCoordinator } from "./coordinator.svelte";
import { DragData } from "./data";
import type { DragSourceOptions, DropZoneOptions } from "./types";

export function draggable(node: HTMLElement, options: DragSourceOptions) {
    function handleDragStart(e: DragEvent) {
        if (options.disabled) {
            e.preventDefault();
            return;
        }

        const items = typeof options.items === "function" ? options.items() : options.items;
        if (!items || items.length === 0) {
            e.preventDefault();
            return;
        }

        dragCoordinator.startDrag(items, e);
        node.classList.add("is-dragged");
        options.onDragStart?.(e);
    }

    function handleDragEnd(e: DragEvent) {
        node.classList.remove("is-dragged");
        dragCoordinator.endDrag();
        options.onDragEnd?.(e);
    }

    node.setAttribute("draggable", options.disabled ? "false" : "true");
    node.addEventListener("dragstart", handleDragStart);
    node.addEventListener("dragend", handleDragEnd);

    return {
        update(newOptions: DragSourceOptions) {
            options = newOptions;
            node.setAttribute("draggable", options.disabled ? "false" : "true");
        },
        destroy() {
            node.removeEventListener("dragstart", handleDragStart);
            node.removeEventListener("dragend", handleDragEnd);
        }
    };
}

export function dropZone(node: HTMLElement, options: DropZoneOptions) {
    let enterCounter = 0;

    function acceptsType(dataTransfer: DataTransfer): boolean {
        if (!options.types) {
            return false;
        }

        if (typeof options.types === "function") {
            return Array.from(dataTransfer.types).some(options.types);
        }

        const expected = Array.isArray(options.types) ? options.types : [options.types];
        return expected.some((t) => {
            return dataTransfer.types.includes(t);
        });
    }

    function isFilesDrag(dataTransfer: DataTransfer): boolean {
        return Boolean(options.files) && dataTransfer.types.includes("Files");
    }

    function handleDragEnter(e: DragEvent) {
        if (!e.dataTransfer || options.disabled) {
            return;
        }

        if (!acceptsType(e.dataTransfer) && !isFilesDrag(e.dataTransfer)) {
            return;
        }

        enterCounter++;
        if (enterCounter === 1) {
            node.classList.add("drop-active");
            options.onDragEnter?.(e);
        }
    }

    function handleDragOver(e: DragEvent) {
        if (!e.dataTransfer || options.disabled) {
            return;
        }

        const hasMatchingType = acceptsType(e.dataTransfer);
        const hasFiles = isFilesDrag(e.dataTransfer);
        if (!hasMatchingType && !hasFiles) {
            return;
        }

        e.preventDefault();
        e.dataTransfer.dropEffect = e.altKey ? "copy" : "move";

        if (options.onDragOver) {
            const result = options.onDragOver({
                types: e.dataTransfer.types,
                modifiers: {
                    altKey: e.altKey,
                    shiftKey: e.shiftKey,
                    ctrlKey: e.ctrlKey,
                    metaKey: e.metaKey
                },
                event: e
            });

            if (result) {
                dragCoordinator.setHoverTarget(options.id ?? null, result.intent ?? "none", result.label);
            }
        }
    }

    function handleDragLeave(e: DragEvent) {
        if (options.disabled) {
            return;
        }

        enterCounter--;
        if (enterCounter <= 0) {
            enterCounter = 0;
            node.classList.remove("drop-active");
            dragCoordinator.setHoverTarget(null, "none");
            options.onDragLeave?.(e);
        }
    }

    async function handleDrop(e: DragEvent) {
        enterCounter = 0;
        node.classList.remove("drop-active");
        dragCoordinator.setHoverTarget(null, "none");

        if (!e.dataTransfer || options.disabled) {
            return;
        }

        // 1. Process OS Files when files handler is defined
        if (options.files && e.dataTransfer.types.includes("Files") && e.dataTransfer.files.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            const files = Array.from(e.dataTransfer.files);
            await options.files.onDrop(files, e);
            return;
        }

        // 2. Process internal MIME types
        if (options.types && options.onDrop) {
            const types = Array.isArray(options.types)
                ? options.types
                : typeof options.types === "string"
                  ? [options.types]
                  : Array.from(e.dataTransfer.types).filter(options.types);

            for (const type of types) {
                const data = DragData.getData(e.dataTransfer, type);
                if (data) {
                    e.preventDefault();
                    e.stopPropagation();
                    await options.onDrop(data, e);
                    return;
                }
            }
        }
    }

    node.addEventListener("dragenter", handleDragEnter);
    node.addEventListener("dragover", handleDragOver);
    node.addEventListener("dragleave", handleDragLeave);
    node.addEventListener("drop", handleDrop);

    return {
        update(newOptions: DropZoneOptions) {
            options = newOptions;
        },
        destroy() {
            node.removeEventListener("dragenter", handleDragEnter);
            node.removeEventListener("dragover", handleDragOver);
            node.removeEventListener("dragleave", handleDragLeave);
            node.removeEventListener("drop", handleDrop);
        }
    };
}
