import {
    deleteCollectionImages,
    deleteImagesBulk,
    getFullImagePath,
    updateCollection,
    updateImage,
    type Collection,
    type CollectionDetailResponse,
    type ImageAsset
} from "$lib/api";
import ExportPanel from "$lib/components/ExportPanel.svelte";
import DeleteModal from "$lib/components/modals/DeleteModal.svelte";
import { modalsManager } from "$lib/components/modals/manager/ModalManager.svelte";
import type { SelectionScope } from "$lib/states/selection.svelte";
import { toastState } from "$lib/toast-notifcations/notif-state.svelte";
import { invalidateViz } from "$lib/views/views.svelte";
import type { MenuItem } from "../types";

export interface ImageMenuOptions {
    onDelete?: (deletedUIDs: string[]) => void;
    onUpdate?: (updated: ImageAsset) => void;
    collection?: Collection | CollectionDetailResponse;
}

export function createImageMenu(
    allImages: ImageAsset[],
    selectionScope: SelectionScope<ImageAsset>,
    options: ImageMenuOptions = {}
): MenuItem[] {
    const { onDelete, onUpdate, collection } = options;
    const items = selectionScope.selectedItems;
    const allFavourited = items.length > 0 && items.every((img) => img.favourited);

    const actionMenuItems: MenuItem[] = [
        {
            id: "act-toggle-favourite",
            label: allFavourited ? "Unfavourite" : "Favourite",
            icon: allFavourited ? "favorite_border" : "favorite",
            action: async () => {
                const itemsToUpdate = selectionScope.selectedItems;
                const setFavourited = !allFavourited;
                const promises = itemsToUpdate.map((img) =>
                    updateImage(img.uid, { favourited: setFavourited })
                );
                try {
                    const results = await Promise.all(promises);
                    const success = results.filter((r) => r.status === 200);
                    if (success.length > 0) {
                        toastState.addToast({
                            type: "success",
                            message: `${setFavourited ? "Favourited" : "Unfavourited"} ${success.length} images`,
                            timeout: 3000
                        });
                        for (const res of success) {
                            selectionScope.updateItem(res.data, allImages);
                            onUpdate?.(res.data);
                        }
                        await invalidateViz({ delay: 200 });
                    }
                } catch (err) {
                    toastState.addToast({
                        type: "error",
                        message: `${setFavourited ? "Favourite" : "Unfavourite"} failed: ${err}`,
                        timeout: 5000
                    });
                }
            }
        },
        {
            id: "act-export",
            label: "Export",
            icon: "ios_share",
            action: () => {
                modalsManager.open(
                    ExportPanel,
                    { assets: items },
                    { height: "80%", applyPadding: false, closeOnOverlayClick: true }
                );
            }
        },
        {
            id: "divider-1",
            label: "",
            separator: true
        },
        {
            id: "act-copy-path",
            label: "Copy Path",
            icon: "content_copy",
            action: () => {
                const items = selectionScope.selectedItems;
                const paths = items
                    .map((img) => getFullImagePath(img.image_paths.original))
                    .join("\n");
                navigator.clipboard.writeText(paths);
                toastState.addToast({
                    type: "info",
                    message: "Paths copied to clipboard",
                    timeout: 2000
                });
            }
        },
        {
            id: "act-download",
            label: "Download Original",
            icon: "download",
            action: () => {
                const items = selectionScope.selectedItems;
                for (const img of items) {
                    const link = document.createElement("a");
                    link.href = getFullImagePath(img.image_paths.original);
                    link.download = img.name || img.uid;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            }
        },
        {
            id: "divider-2",
            label: "",
            separator: true
        }
    ];

    if (collection) {
        actionMenuItems.push({
            id: "act-remove-from-collection",
            label: "Remove from Collection",
            icon: "layers_clear",
            action: async () => {
                const items = selectionScope.selectedItems;
                const uids = items.map((i) => i.uid);
                try {
                    const res = await deleteCollectionImages(collection.uid, {
                        uids
                    });
                    if (res.status === 200) {
                        toastState.addToast({
                            type: "success",
                            message: `Removed ${uids.length} images from ${collection.name}`,
                            timeout: 3000
                        });
                        onDelete?.(uids);
                        selectionScope.clear();
                        await invalidateViz({ delay: 200 });
                    }
                } catch (err) {
                    toastState.addToast({
                        type: "error",
                        message: `Remove failed: ${err}`,
                        timeout: 5000
                    });
                }
            }
        });

        actionMenuItems.push({
            id: "act-set-as-thumbnail",
            label: "Set as Collection Thumbnail",
            icon: "image",
            disabled: selectionScope.size !== 1,
            action: async () => {
                const asset = selectionScope.selectedItems[0];
                try {
                    const res = await updateCollection(collection.uid, {
                        thumbnailUID: asset.uid
                    });
                    if (res.status === 200) {
                        toastState.addToast({
                            type: "success",
                            message: "Collection thumbnail updated",
                            timeout: 3000
                        });
                        await invalidateViz({ delay: 200 });
                    }
                } catch (err) {
                    toastState.addToast({
                        type: "error",
                        message: `Update failed: ${err}`,
                        timeout: 5000
                    });
                }
            }
        });
    }

    actionMenuItems.push({
        id: "act-delete",
        label: "Delete",
        icon: "delete",
        danger: true,
        action: async () => {
            const items = selectionScope.selectedItems;
            const uids = items.map((i) => i.uid);

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
                    toastState.addToast({
                        type: "success",
                        message: `${isPermanent ? "Permanently deleted" : "Moved to Trash"} ${uids.length} image${uids.length === 1 ? "" : "s"}`,
                        timeout: 3000
                    });
                    onDelete?.(uids);
                    selectionScope.clear();
                    await invalidateViz({ delay: 200 });
                }
            } catch (err) {
                toastState.addToast({
                    type: "error",
                    message: `Delete failed: ${err}`,
                    timeout: 5000
                });
            }
        }
    });

    return actionMenuItems;
}
