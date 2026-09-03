import { goto } from "$app/navigation";
import {
    type Collection,
    type CollectionDetailResponse,
    type ImageAsset,
    addCollectionImages,
    deleteCollectionImages,
    deleteImagesBulk,
    getAssetImagePath,
    getDownloadUrl,
    getFullImagePath,
    signDownload,
    updateCollection,
    updateImage
} from "@viz/api";
import { DateTime } from "luxon";
import CollectionSelectionModal from "$lib/components/modals/CollectionSelectionModal.svelte";
import DeleteModal from "$lib/components/modals/DeleteModal.svelte";
import { modalsManager } from "$lib/components/modals/manager/ModalManager.svelte";
import ExportPanel, { modalOptions as exportModalOptions } from "$lib/components/ui/panels/ExportPanel.svelte";
import { DownloadFile, DownloadState } from "$lib/download/asset.svelte";
import { processDownloadQueue, waitForDownloadCompletion } from "$lib/download/manager.svelte";
import { config, download } from "$lib/states/index.svelte";
import type { SelectionScope } from "$lib/states/selection.svelte";
import { toasts } from "$lib/toast-notifcations/toasts.svelte";
import { downloadToFilesystem } from "$lib/utils/files";
import { copyToClipboard } from "$lib/utils/misc";
import { invalidateViz } from "$lib/views/views.svelte";
import type { MenuItem } from "../types";

export interface ImageMenuOptions {
    onDelete?: (deletedUIDs: string[]) => void;
    onUpdate?: (updated: ImageAsset) => void;
    collection?: Collection | CollectionDetailResponse;
    includeAddToCollection?: boolean;
    onAddToCollection?: (collection: Collection, uids: string[]) => void;
}

/**
 * Opens modal to add selected images to a collection.
 */
export function openAddToCollectionModal(
    uids: string[],
    onSelect?: (collection: Collection, newImageUids: string[]) => void
) {
    if (uids.length === 0) {
        return;
    }

    const defaultHandler = async (collection: Collection, newImageUids: string[]) => {
        if (newImageUids.length === 0) {
            toasts.add({
                type: "info",
                message: "No new images to add.",
                timeout: 3000
            });
            return;
        }

        try {
            const res = await addCollectionImages(collection.uid, {
                uids: newImageUids
            });

            if (res.status === 200) {
                const message = `Added ${newImageUids.length} image(s) to collection **${collection.name}**`;
                toasts.add({
                    type: "success",
                    message,
                    timeout: 3000,
                    actions: [
                        {
                            label: "Open Collection",
                            onClick: () => {
                                goto(`/collections/${collection.uid}`);
                            }
                        }
                    ]
                });
            } else {
                toasts.add({
                    type: "error",
                    message: res.data?.error || `Failed to add images to ${collection.name}`
                });
            }
        } catch (err) {
            toasts.add({
                type: "error",
                message: `Failed to add images: ${(err as Error).message}`
            });
        }
    };

    modalsManager.open(
        CollectionSelectionModal,
        {
            imageUidsToAdd: uids,
            onSelect: onSelect || defaultHandler
        },
        { heading: "Select a Collection" }
    );
}

/**
 * Toggles the favourite state of all selected images.
 */
export async function toggleFavouriteImages(
    selectionScope: SelectionScope<ImageAsset>,
    allImages?: ImageAsset[],
    onUpdate?: (updated: ImageAsset) => void
) {
    const itemsToUpdate = selectionScope.selectedItems;
    if (itemsToUpdate.length === 0) {
        return;
    }

    const allFavourited = itemsToUpdate.every((img) => {
        return img.favourited;
    });
    const setFavourited = !allFavourited;
    const promises = itemsToUpdate.map((img) => {
        return updateImage(img.uid, { favourited: setFavourited });
    });

    try {
        const results = await Promise.all(promises);
        const success = results.filter((r) => {
            return r.status === 200;
        });
        if (success.length > 0) {
            toasts.add({
                type: "success",
                message: `${setFavourited ? "Favourited" : "Unfavourited"} ${success.length} images`,
                timeout: 3000
            });
            for (const res of success) {
                if (allImages) {
                    selectionScope.updateItem(res.data, allImages);
                }
                if (onUpdate) {
                    onUpdate(res.data);
                }
            }
            await invalidateViz();
        }
    } catch (err) {
        toasts.add({
            type: "error",
            message: `${setFavourited ? "Favourite" : "Unfavourite"} failed: ${err}`
        });
    }
}

/**
 * Opens the Export modal for selected images.
 */
export function exportSelectedImages(selectionScope: SelectionScope<ImageAsset>) {
    const items = selectionScope.selectedItems;
    if (items.length === 0) {
        return;
    }
    modalsManager.open(ExportPanel, { assets: items }, exportModalOptions);
}

/**
 * Copies the full URL of a selected image to clipboard.
 */
export function copySelectedImageUrl(image: ImageAsset) {
    const path = getAssetImagePath(image, "original");
    if (!path) {
        toasts.add({
            type: "error",
            message: "Image URL not available"
        });
        return;
    }
    const url = `${location.origin}${path}`;
    copyToClipboard(url);
    toasts.add({
        type: "info",
        message: "Image URL copied to clipboard"
    });
}

/**
 * Downloads selected images (single direct download or bulk ZIP).
 */
export async function downloadSelectedImages(selectionScope: SelectionScope<ImageAsset>) {
    const items = selectionScope.selectedItems;
    if (items.length === 0) {
        return;
    }

    try {
        if (items.length === 1) {
            toasts.add({
                type: "info",
                message: "Starting download...",
                timeout: 3000
            });

            const img = items[0];
            const url = getAssetImagePath(img, "original") || getFullImagePath(img.image_paths.original);
            const filename = img.image_metadata?.file_name
                ? img.image_metadata.file_name.split("/").pop()!
                : `${img.name || img.uid}.jpg`;

            const task = new DownloadFile(url, filename, "GET");
            download.files.push(task);
            download.stats.total += 1;

            processDownloadQueue();
            await waitForDownloadCompletion([task]);

            if (task.state === DownloadState.DOWNLOADED && task.data) {
                await downloadToFilesystem(task.filename, task.data);
            }
        } else {
            toasts.add({
                type: "info",
                message: `Zipping ${items.length} images for download`,
                timeout: 3000
            });

            const uids = items.map((img) => {
                return img.uid;
            });
            const signRes = await signDownload({
                uids,
                expires_in: 300,
                allow_download: true,
                allow_embed: false,
                show_metadata: true
            });

            if (signRes.status !== 200) {
                throw new Error(signRes.data?.error ?? "Failed to sign download request");
            }

            const token = signRes.data.uid;
            const zipName = `${config.data?.download?.zip_export_name}-${DateTime.now().toFormat("yyyyLLdd_HHmmss")}.zip`;
            const url = getDownloadUrl(token);
            const task = new DownloadFile(url, zipName, "POST", { uids });

            download.files.push(task);
            download.stats.total += 1;

            processDownloadQueue();
            await waitForDownloadCompletion([task]);

            if (task.state === DownloadState.DOWNLOADED && task.data) {
                await downloadToFilesystem(zipName, task.data);
                toasts.add({
                    title: zipName,
                    message: `Successfully downloaded ZIP file`,
                    type: "success"
                });
            } else if (task.state === DownloadState.ERROR) {
                throw new Error("ZIP download encountered an error");
            }
        }
    } catch (e) {
        toasts.add({
            type: "error",
            message: `Error downloading: ${(e as Error).message}`
        });
    }
}

/**
 * Removes selected images from a collection.
 */
export async function removeImagesFromCollection(
    collection: Collection | CollectionDetailResponse,
    selectionScope: SelectionScope<ImageAsset>,
    onDelete?: (deletedUIDs: string[]) => void
) {
    const items = selectionScope.selectedItems;
    if (items.length === 0) {
        return;
    }
    const uids = items.map((i) => {
        return i.uid;
    });
    try {
        const res = await deleteCollectionImages(collection.uid, {
            uids
        });
        if (res.status === 200) {
            toasts.add({
                type: "success",
                message: `Removed ${uids.length} images from ${collection.name}`,
                timeout: 3000
            });
            if (onDelete) {
                onDelete(uids);
            }
            selectionScope.clear();
            await invalidateViz();
        }
    } catch (err) {
        toasts.add({
            type: "error",
            message: `Remove failed: ${err}`
        });
    }
}

/**
 * Sets an image as the thumbnail for a collection.
 */
export async function setCollectionThumbnail(collection: Collection | CollectionDetailResponse, asset: ImageAsset) {
    try {
        const res = await updateCollection(collection.uid, {
            thumbnailUID: asset.uid
        });
        if (res.status === 200) {
            toasts.add({
                type: "success",
                message: "Collection thumbnail updated",
                timeout: 3000
            });
            await invalidateViz();
        }
    } catch (err) {
        toasts.add({
            type: "error",
            message: `Update failed: ${err}`
        });
    }
}

/**
 * Opens delete confirmation modal and deletes selected images.
 */
export async function deleteSelectedImages(
    selectionScope: SelectionScope<ImageAsset>,
    onDelete?: (deletedUIDs: string[]) => void
) {
    const items = selectionScope.selectedItems;
    if (items.length === 0) {
        return;
    }
    const uids = items.map((i) => {
        return i.uid;
    });

    const action = await modalsManager.open<
        { id: string; itemCount: number; itemName?: string },
        "delete" | "permanent"
    >(
        DeleteModal,
        { itemCount: items.length, itemName: items[0]?.name },
        { heading: "Delete Images", width: "40%", closeOnOverlayClick: true }
    );

    if (action === undefined) {
        return;
    }

    try {
        const isPermanent = action === "permanent";
        const res = await deleteImagesBulk({ uids, force: isPermanent });
        if (res.status === 200) {
            toasts.add({
                type: "success",
                message: `${isPermanent ? "Permanently deleted" : "Moved to Trash"} ${uids.length} image${uids.length === 1 ? "" : "s"}`,
                timeout: 3000
            });
            if (onDelete) {
                onDelete(uids);
            }
            selectionScope.clear();
            await invalidateViz();
        }
    } catch (err) {
        toasts.add({
            type: "error",
            message: `Delete failed: ${err}`
        });
    }
}

/**
 * Builds the canonical image context/toolbar menu items.
 */
export function createImageMenu(
    allImages: ImageAsset[],
    selectionScope: SelectionScope<ImageAsset>,
    options: ImageMenuOptions = {}
): MenuItem[] {
    const { onDelete, onUpdate, collection, includeAddToCollection = true, onAddToCollection } = options;
    const items = selectionScope.selectedItems;
    const allFavourited =
        items.length > 0 &&
        items.every((img) => {
            return img.favourited;
        });

    const actionMenuItems: MenuItem[] = [];

    if (includeAddToCollection) {
        actionMenuItems.push({
            id: "act-add-to-collection",
            label: "Add to Collection",
            iconName: "collections_bookmark",
            disabled: selectionScope.size === 0,
            action: () => {
                openAddToCollectionModal(
                    items.map((img) => {
                        return img.uid;
                    }),
                    onAddToCollection
                );
            }
        });
    }

    actionMenuItems.push(
        {
            id: "act-toggle-favourite",
            label: allFavourited ? "Unfavourite" : "Favourite",
            iconName: allFavourited ? { iconName: "star", fill: true } : { iconName: "star", fill: false },
            disabled: selectionScope.size === 0,
            action: () => {
                return toggleFavouriteImages(selectionScope, allImages, onUpdate);
            }
        },
        {
            id: "act-export",
            label: "Export",
            iconName: "ios_share",
            disabled: selectionScope.size === 0,
            action: () => {
                exportSelectedImages(selectionScope);
            }
        },
        {
            id: "divider-1",
            separator: true
        },
        {
            id: "act-copy-path",
            label: "Copy URL",
            iconName: "content_copy",
            disabled: items.length !== 1,
            action: () => {
                if (items[0]) {
                    copySelectedImageUrl(items[0]);
                }
            }
        },
        {
            id: "act-download",
            label: items.length > 1 ? "Download as ZIP" : "Download Original",
            iconName: "download",
            disabled: selectionScope.size === 0,
            action: () => {
                return downloadSelectedImages(selectionScope);
            }
        },
        {
            id: "divider-2",
            separator: true
        }
    );

    if (collection) {
        actionMenuItems.push({
            id: "act-remove-from-collection",
            label: "Remove from Collection",
            iconName: "layers_clear",
            disabled: selectionScope.size === 0,
            action: () => {
                return removeImagesFromCollection(collection, selectionScope, onDelete);
            }
        });

        actionMenuItems.push({
            id: "act-set-as-thumbnail",
            label: "Set as Collection Thumbnail",
            iconName: "image",
            disabled: selectionScope.size !== 1,
            action: () => {
                const asset = selectionScope.selectedItems[0];
                if (asset) {
                    setCollectionThumbnail(collection, asset);
                }
            }
        });

        actionMenuItems.push({
            id: "divider-3",
            separator: true
        });
    }

    actionMenuItems.push({
        id: "act-delete",
        label: "Delete",
        iconName: "delete",
        danger: true,
        disabled: selectionScope.size === 0,
        action: () => {
            return deleteSelectedImages(selectionScope, onDelete);
        }
    });

    return actionMenuItems;
}
