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
import { toasts } from "$lib/toast-notifcations/toasts.svelte";
import { downloadToFilesystem } from "$lib/utils/files";
import { copyToClipboard } from "$lib/utils/misc";
import { invalidateViz } from "$lib/views/views.svelte";
import type { MenuItem } from "../types";

interface CollectionMenuOptions {
    onCollectionDuplicated?: (collection: Collection) => void;
    onCollectionDeleted?: (collection: Collection) => void;
    onCollectionsDeleted?: (collections: Collection[]) => void;
    onCollectionUpdated?: (collection: Collection) => void;
    editCollection?: (collection: Collection) => void;
    selectedCollections?: Collection[];
}

export function createCollectionMenu(collection: Collection | undefined, opts: CollectionMenuOptions) {
    if (!collection) {
        return [];
    }

    const items: MenuItem[] = [
        {
            id: `open-${collection.uid}`,
            label: "Open",
            iconName: "open_in_new",
            action: () => goto(`/collections/${collection.uid}`)
        },
        {
            id: `edit-${collection.uid}`,
            label: "Edit",
            iconName: "edit",
            action: () => {
                opts.editCollection?.(collection);
            }
        },
        {
            id: `favourite-${collection.uid}`,
            label: collection.favourited ? "Unfavourite" : "Favourite",
            iconName: "star",
            action: async () => {
                const res = await updateCollection(collection.uid, {
                    favourited: collection.favourited ? false : true
                });

                if (res.status === 200) {
                    toasts.add({
                        type: "success",
                        message: `Collection ${collection.favourited ? "un" : ""}favourited`
                    });
                    opts.onCollectionUpdated?.(res.data);
                    await invalidateViz({ delay: 200, skipInvalidateAll: true });
                } else {
                    toasts.add({
                        type: "error",
                        message: res.data.error ?? `Failed to ${collection.favourited ? "un" : ""}favourite`
                    });
                }
            }
        },
        {
            id: `duplicate-${collection.uid}`,
            label: "Duplicate",
            iconName: "content_copy",
            action: async () => {
                try {
                    const res = await createCollection({
                        name: `Copy of ${collection.name}`,
                        description: collection.description ?? undefined,
                        private: collection.private ?? false
                    });

                    if (res.status === 201) {
                        opts.onCollectionDuplicated?.(res.data);
                    } else {
                        toasts.add({
                            message: res.data.error ?? `Duplicate failed (${res.status})`,
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
        },
        { separator: true, id: `sep-1-${collection.uid}` },
        {
            id: `download-collection-${collection.uid}`,
            label: "Download",
            iconName: "download",
            disabled: (collection.image_count ?? collection.images?.length ?? 0) === 0,
            action: async () => {
                toasts.add({
                    message: `Signing download request...`,
                    type: "info",
                    timeout: 2000
                });

                try {
                    let uids: string[] = [];
                    if (collection.images && collection.images.length > 0) {
                        uids = collection.images.map((i) => i.uid);
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
        },
        { separator: true, id: `sep-2-${collection.uid}` },
        {
            id: `copylink-${collection.uid}`,
            label: "Copy link",
            iconName: "link",
            action: async () => {
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

                const confirmMsg =
                    targets.length > 1
                        ? `Delete ${targets.length} collections? This cannot be undone.`
                        : `Delete collection "${collection.name}"? This cannot be undone.`;

                modalsManager.open(
                    ConfirmationModal,
                    {
                        title: targets.length > 1 ? "Delete Collections" : "Delete Collection",
                        confirmText: targets.length > 1 ? "Delete Collections" : "Delete Collection",
                        message: confirmMsg,
                        buttonVariant: "danger",
                        onConfirm: async () => {
                            try {
                                const results = await Promise.all(
                                    targets.map(async (c) => {
                                        const res = await deleteCollection(c.uid);
                                        return { collection: c, res };
                                    })
                                );

                                const successes = results.filter((r) => r.res.status === 204);
                                const failures = results.filter((r) => r.res.status !== 204);

                                if (successes.length > 0) {
                                    if (opts.onCollectionsDeleted) {
                                        opts.onCollectionsDeleted(successes.map((s) => s.collection));
                                    } else {
                                        for (const success of successes) {
                                            opts.onCollectionDeleted?.(success.collection);
                                        }
                                    }
                                }

                                if (failures.length > 0) {
                                    const errorMsg = failures
                                        .map((f) => {
                                            if (f.res.status !== 204) {
                                                return `${f.collection.name}: ${f.res.data.error || f.res.status}`;
                                            }
                                            return `${f.collection.name}: status ${f.res.status}`;
                                        })
                                        .join("; ");
                                    toasts.add({
                                        message: `Failed to delete some collections: ${errorMsg}`,
                                        type: "error"
                                    });
                                }
                            } catch (err) {
                                toasts.add({
                                    message: `Failed to delete: ${err}`,
                                    type: "error"
                                });
                            }
                        }
                    },
                    {
                        heading: targets.length > 1 ? "Delete Collections" : "Delete Collection"
                    }
                );
            }
        }
    ];

    return items;
}
