import { goto } from "$app/navigation";
import {
    type Collection,
    createCollection,
    deleteCollection,
    getDownloadUrl,
    listCollectionImageUiDs,
    signDownload,
    updateCollection
} from "@viz/api";
import ConfirmationModal from "$lib/components/modals/ConfirmationModal.svelte";
import { modalsManager } from "$lib/components/modals/manager/ModalManager.svelte";
import { DownloadFile, DownloadState } from "$lib/download/asset.svelte";
import { processDownloadQueue, waitForDownloadCompletion } from "$lib/download/manager.svelte";
import { download } from "$lib/states/index.svelte";
import type { SelectionScope } from "$lib/states/selection.svelte";
import { toasts } from "$lib/toast-notifcations/toasts.svelte";
import { downloadToFilesystem } from "$lib/utils/files";
import { copyToClipboard } from "$lib/utils/misc";
import { invalidateViz } from "$lib/views/views.svelte";
import type { MenuItem } from "../types";

export interface CollectionMenuOptions {
    onCollectionDuplicated?: (collection: Collection) => void;
    onCollectionDeleted?: (collection: Collection) => void;
    onCollectionsDeleted?: (collections: Collection[]) => void;
    onCollectionUpdated?: (collection: Collection) => void;
    editCollection?: (collection: Collection) => void;
    selectedCollections?: Collection[];
}

/**
 * Toggles favourite status of one or more collections.
 */
export async function toggleFavouriteCollections(
    collections: Collection[],
    selectionScope?: SelectionScope<Collection>,
    sourceArray?: Collection[],
    onUpdate?: (updated: Collection) => void
) {
    if (collections.length === 0) {
        return;
    }

    const allFavourited = collections.every((c) => {
        return c.favourited;
    });
    const nextFavourited = !allFavourited;

    const results = await Promise.all(
        collections.map((c) => {
            return updateCollection(c.uid, { favourited: nextFavourited });
        })
    );

    const success = results.filter((r) => {
        return r.status === 200;
    });
    if (success.length > 0) {
        toasts.add({
            type: "success",
            message: `${nextFavourited ? "Favourited" : "Unfavourited"} ${success.length} collection${success.length > 1 ? "s" : ""}`
        });

        for (const res of success) {
            const match = collections.find((c) => {
                return c.uid === res.data.uid;
            });
            if (match) {
                match.favourited = nextFavourited;
            }
            if (selectionScope && sourceArray) {
                selectionScope.updateItem(res.data, sourceArray);
            }
            if (onUpdate) {
                onUpdate(res.data);
            }
        }

        await invalidateViz();
    } else {
        toasts.add({
            type: "error",
            message: `Failed to ${nextFavourited ? "" : "un"}favourite collection${collections.length > 1 ? "s" : ""}`
        });
    }
}

/**
 * Toggles favourite status of a single collection (convenience wrapper).
 */
export async function toggleFavouriteCollection(
    collection: Collection,
    onCollectionUpdated?: (collection: Collection) => void
) {
    return toggleFavouriteCollections([collection], undefined, undefined, onCollectionUpdated);
}

/**
 * Duplicates a collection.
 */
export async function duplicateCollection(
    collection: Collection,
    onCollectionDuplicated?: (collection: Collection) => void
) {
    try {
        const res = await createCollection({
            name: `Copy of ${collection.name}`,
            description: collection.description ?? undefined,
            private: collection.private ?? false
        });

        if (res.status === 201) {
            if (onCollectionDuplicated) {
                onCollectionDuplicated(res.data);
            }
        } else {
            toasts.add({
                message: res.data?.error ?? `Duplicate failed (${res.status})`,
                type: "error"
            });
        }
    } catch (err) {
        toasts.add({
            message: "Duplicate failed: " + (err as Error).message,
            type: "error"
        });
    }
}

/**
 * Downloads a collection as a ZIP archive.
 */
export async function downloadCollectionZip(collection: Collection) {
    toasts.add({
        message: `Signing download request...`,
        type: "info",
        timeout: 2000
    });

    try {
        let uids: string[] = [];
        if (collection.images && collection.images.length > 0) {
            uids = collection.images.map((i) => {
                return i.uid;
            });
        } else {
            const res = await listCollectionImageUiDs(collection.uid);
            if (res.status !== 200) {
                throw new Error(`Failed to load collection image UIDs (${res.status})`);
            }
            uids = res.data;
        }

        if (uids.length === 0) {
            toasts.add({
                message: "Collection has no images",
                type: "warning"
            });
            return;
        }

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
        const zipName = `${collection.name || "collection"}-${Date.now()}.zip`;
        const url = getDownloadUrl(token);
        const task = new DownloadFile(url, zipName, "POST", { uids });

        download.files.push(task);
        download.stats.total += 1;

        processDownloadQueue();
        await waitForDownloadCompletion([task]);

        if (task.state === DownloadState.DOWNLOADED && task.data) {
            await downloadToFilesystem(zipName, task.data);
            toasts.add({
                message: `Successfully downloaded **${collection.name}**`,
                type: "success"
            });
        } else if (task.state === DownloadState.ERROR) {
            throw new Error("Download task encountered an error");
        }
    } catch (e) {
        toasts.add({
            message: `Error downloading images: ${(e as Error).message}`,
            type: "error"
        });
    }
}

/**
 * Copies the collection URL to clipboard.
 */
export function copyCollectionLink(collection: Collection) {
    try {
        const url = `${location.origin}/collections/${collection.uid}`;
        copyToClipboard(url);
        toasts.add({
            message: "Link copied to clipboard",
            type: "success"
        });
    } catch (err) {
        toasts.add({
            message: "Failed to copy link",
            type: "error"
        });
    }
}

/**
 * Deletes one or more collections with confirmation.
 */
export function deleteSelectedCollections(
    targets: Collection[],
    onDeleted?: (collection: Collection) => void,
    onMultipleDeleted?: (collections: Collection[]) => void
) {
    if (targets.length === 0) {
        return;
    }

    const title = targets.length > 1 ? "Delete Collections" : "Delete Collection";
    const message =
        targets.length > 1
            ? `Delete ${targets.length} collections? This cannot be undone.`
            : `Delete collection "${targets[0].name}"? This cannot be undone.`;

    modalsManager.open(
        ConfirmationModal,
        {
            title,
            confirmText: title,
            message,
            buttonVariant: "danger",
            onConfirm: async () => {
                try {
                    const deleted: Collection[] = [];

                    for (const c of targets) {
                        const res = await deleteCollection(c.uid);
                        if (res.status === 204) {
                            deleted.push(c);
                            if (onDeleted) {
                                onDeleted(c);
                            }
                        }
                    }

                    if (deleted.length === targets.length) {
                        if (onMultipleDeleted) {
                            onMultipleDeleted(deleted);
                        }
                        return;
                    }

                    if (deleted.length > 0) {
                        if (onMultipleDeleted) {
                            onMultipleDeleted(deleted);
                        }
                        toasts.add({
                            message: "Some collections could not be deleted",
                            type: "warning"
                        });
                        return;
                    }

                    toasts.add({
                        message: "Failed to delete collections",
                        type: "error"
                    });
                } catch (err) {
                    toasts.add({
                        message: `Failed to delete: ${err}`,
                        type: "error"
                    });
                }
            }
        },
        { heading: title }
    );
}

/**
 * Builds the canonical collection context menu items.
 */
export function createCollectionMenu(collection: Collection | undefined, opts: CollectionMenuOptions): MenuItem[] {
    if (!collection) {
        return [];
    }

    const items: MenuItem[] = [
        {
            id: `open-${collection.uid}`,
            label: "Open",
            iconName: "open_in_new",
            action: () => {
                goto(`/collections/${collection.uid}`);
            }
        },
        {
            id: `edit-${collection.uid}`,
            label: "Edit",
            iconName: "edit",
            action: () => {
                if (opts.editCollection) {
                    opts.editCollection(collection);
                }
            }
        },
        {
            id: `favourite-${collection.uid}`,
            label: collection.favourited ? "Unfavourite" : "Favourite",
            iconName: "star",
            action: () => {
                const targets =
                    opts.selectedCollections && opts.selectedCollections.length > 1
                        ? opts.selectedCollections
                        : [collection];
                return toggleFavouriteCollections(targets, undefined, undefined, opts.onCollectionUpdated);
            }
        },
        {
            id: `duplicate-${collection.uid}`,
            label: "Duplicate",
            iconName: "folder_copy",
            action: () => {
                return duplicateCollection(collection, opts.onCollectionDuplicated);
            }
        },
        { separator: true, id: `sep-1-${collection.uid}` },
        {
            id: `download-collection-${collection.uid}`,
            label: "Download",
            iconName: "download",
            disabled: (collection.image_count ?? collection.images?.length ?? 0) === 0,
            action: () => {
                return downloadCollectionZip(collection);
            }
        },
        { separator: true, id: `sep-2-${collection.uid}` },
        {
            id: `copylink-${collection.uid}`,
            label: "Copy link",
            iconName: "link",
            action: () => {
                copyCollectionLink(collection);
            }
        },
        {
            id: `delete-${collection.uid}`,
            label:
                opts.selectedCollections && opts.selectedCollections.length > 1
                    ? `Delete ${opts.selectedCollections.length} collections`
                    : "Delete",
            iconName: "delete",
            danger: true,
            action: () => {
                const targets =
                    opts.selectedCollections && opts.selectedCollections.length > 1
                        ? opts.selectedCollections
                        : [collection];
                deleteSelectedCollections(targets, opts.onCollectionDeleted, opts.onCollectionsDeleted);
            }
        }
    ];

    return items;
}
