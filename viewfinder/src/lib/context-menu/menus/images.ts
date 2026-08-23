import {
    type Collection,
    type CollectionDetailResponse,
    type ImageAsset,
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
import DeleteModal from "$lib/components/modals/DeleteModal.svelte";
import { modalsManager } from "$lib/components/modals/manager/ModalManager.svelte";
import ExportPanel, { modalOptions as exportModalOptions } from "$lib/components/ui/panels/ExportPanel.svelte";
import { download } from "$lib/states/index.svelte";
import type { SelectionScope } from "$lib/states/selection.svelte";
import { toasts } from "$lib/toast-notifcations/toasts.svelte";
import { DownloadFile, DownloadState } from "$lib/upload/asset.svelte";
import { processDownloadQueue, waitForDownloadCompletion } from "$lib/upload/manager.svelte";
import { downloadToFilesystem } from "$lib/utils/files";
import { copyToClipboard } from "$lib/utils/misc";
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
            iconName: allFavourited ? { iconName: "star", fill: true } : { iconName: "star", fill: false },
            disabled: selectionScope.size === 0,
            action: async () => {
                const itemsToUpdate = selectionScope.selectedItems;
                const setFavourited = !allFavourited;
                const promises = itemsToUpdate.map((img) => updateImage(img.uid, { favourited: setFavourited }));
                try {
                    const results = await Promise.all(promises);
                    const success = results.filter((r) => r.status === 200);
                    if (success.length > 0) {
                        toasts.add({
                            type: "success",
                            message: `${setFavourited ? "Favourited" : "Unfavourited"} ${success.length} images`,
                            timeout: 3000
                        });
                        for (const res of success) {
                            selectionScope.updateItem(res.data, allImages);
                            onUpdate?.(res.data);
                        }
                        await invalidateViz({ delay: 200, skipInvalidateAll: true });
                    }
                } catch (err) {
                    toasts.add({
                        type: "error",
                        message: `${setFavourited ? "Favourite" : "Unfavourite"} failed: ${err}`
                    });
                }
            }
        },
        {
            id: "act-export",
            label: "Export",
            iconName: "ios_share",
            disabled: selectionScope.size === 0,
            action: () => {
                modalsManager.open(ExportPanel, { assets: items }, exportModalOptions);
            }
        },
        {
            id: "divider-1",
            separator: true
        },
        {
            id: "act-copy-path",
            label: `Copy URL`,
            iconName: "content_copy",
            disabled: selectionScope.size === 0,
            action: () => {
                const items = selectionScope.selectedItems;
                const paths = items
                    .map((img) => getAssetImagePath(img, "original") || getFullImagePath(img.image_paths.original))
                    .join("\n");
                copyToClipboard(paths);
                toasts.add({
                    type: "info",
                    message: "URL(s) copied to clipboard"
                });
            }
        },
        {
            id: "act-download",
            label: items.length > 1 ? "Download as ZIP" : "Download Original",
            iconName: "download",
            disabled: selectionScope.size === 0,
            action: async () => {
                const items = selectionScope.selectedItems;

                try {
                    if (items.length === 0) {
                        return;
                    }

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

                        const uids = items.map((img) => img.uid);
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
                        const zipName = `viz-bulk_export-${DateTime.now().toFormat("yyyyLLdd_HHmmss")}.zip`;
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
        },
        {
            id: "divider-2",
            separator: true
        }
    ];

    if (collection) {
        actionMenuItems.push({
            id: "act-remove-from-collection",
            label: "Remove from Collection",
            iconName: "layers_clear",
            disabled: selectionScope.size === 0,
            action: async () => {
                const items = selectionScope.selectedItems;
                const uids = items.map((i) => i.uid);
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
                        onDelete?.(uids);
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
        });

        actionMenuItems.push({
            id: "act-set-as-thumbnail",
            label: "Set as Collection Thumbnail",
            iconName: "image",
            disabled: selectionScope.size !== 1,
            action: async () => {
                const asset = selectionScope.selectedItems[0];
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
                    toasts.add({
                        type: "success",
                        message: `${isPermanent ? "Permanently deleted" : "Moved to Trash"} ${uids.length} image${uids.length === 1 ? "" : "s"}`,
                        timeout: 3000
                    });
                    onDelete?.(uids);
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
    });

    return actionMenuItems;
}
