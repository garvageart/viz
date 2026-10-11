import { StandardMimeTypes, VizMimeTypes } from "#lib/constants.js";
import { type ImageAsset, type ImagePaths, getAssetImagePath } from "@viz/api";
import { dragCoordinator } from "./coordinator.svelte";
import { DragData } from "./data";
import type { DragSourceItem, DragSourceOptions, DropZoneOptions } from "./types";

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

        const related = e.relatedTarget as Node | null;
        if (related && node.contains(related)) {
            return;
        }

        node.classList.add("drop-active");
        options.onDragEnter?.(e);
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

        const related = e.relatedTarget as Node | null;
        if (related && node.contains(related)) {
            return;
        }

        node.classList.remove("drop-active");
        dragCoordinator.setHoverTarget(null, "none");
        options.onDragLeave?.(e);
    }

    async function handleDrop(e: DragEvent) {
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

/**
 * Returns an absolute URL for an asset image variant.
 */
export function getAbsoluteAssetUrl(asset: ImageAsset, variant: keyof ImagePaths = "original"): string | null {
    const path = getAssetImagePath(asset, variant) ?? asset.image_paths[variant];
    if (!path) {
        return null;
    }

    if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
    }

    return new URL(path, window.location.origin).href;
}

/**
 * Creates drag items for an image asset including internal Viz types and standard OS/web formats.
 */
export function createImageDragItems(
    primaryAsset: ImageAsset,
    selectedAssets: ImageAsset[] = [primaryAsset]
): DragSourceItem[] {
    const assets = selectedAssets.length > 0 ? selectedAssets : [primaryAsset];
    const uids = assets.map((a) => {
        return a.uid;
    });
    const count = assets.length;
    const label = count > 1 ? `${count} photos` : primaryAsset.name;
    const thumbnailUrl = getAssetImagePath(primaryAsset, "thumbnail") ?? null;

    const urls = assets
        .map((a) => {
            return getAbsoluteAssetUrl(a);
        })
        .filter((url): url is string => {
            return url !== null;
        });

    const primaryUrl = getAbsoluteAssetUrl(primaryAsset);
    const primaryFilename = primaryAsset.name || primaryAsset.image_metadata.file_name || `${primaryAsset.uid}.jpg`;
    const primaryMime = primaryAsset.image_metadata.file_type;

    const items: DragSourceItem[] = [
        {
            mimeType: VizMimeTypes.IMAGE_UIDS,
            payload: uids,
            label,
            thumbnailUrl
        }
    ];

    if (urls.length > 0) {
        items.push(
            {
                mimeType: VizMimeTypes.IMAGE_URLS,
                payload: urls,
                label,
                thumbnailUrl
            },
            {
                mimeType: StandardMimeTypes.URI_LIST,
                payload: urls.join("\r\n"),
                label,
                thumbnailUrl
            },
            {
                mimeType: StandardMimeTypes.TEXT_PLAIN,
                payload: urls.join("\n"),
                label,
                thumbnailUrl
            }
        );
    }

    if (primaryUrl) {
        items.push({
            mimeType: StandardMimeTypes.DOWNLOAD_URL,
            payload: `${primaryMime}:${primaryFilename}:${primaryUrl}`,
            label,
            thumbnailUrl
        });
    }

    return items;
}
