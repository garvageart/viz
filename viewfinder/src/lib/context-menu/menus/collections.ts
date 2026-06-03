import { goto } from "$app/navigation";
import { type Collection, createCollection, deleteCollection, updateCollection } from "$lib/api";
import { toastState } from "$lib/toast-notifcations/notif-state.svelte";
import { copyToClipboard } from "$lib/utils/misc";
import { invalidateViz } from "$lib/views/views.svelte";
import type { MenuItem } from "../types";
import { modalsManager } from "$lib/components/modals/manager/ModalManager.svelte";
import ConfirmationModal from "$lib/components/modals/ConfirmationModal.svelte";

interface CollectionMenuOptions {
    onCollectionDuplicated?: (collection: Collection) => void;
    onCollectionDeleted?: (collection: Collection) => void;
    onCollectionsDeleted?: (collections: Collection[]) => void;
    onCollectionUpdated?: (collection: Collection) => void;
    editCollection?: (collection: Collection) => void;
    selectedCollections?: Collection[];
}

export function createCollectionMenu(
    collection: Collection | undefined,
    opts: CollectionMenuOptions
) {
    if (!collection) {
        return [];
    }

    const items: MenuItem[] = [
        {
            id: `open-${collection.uid}`,
            label: "Open",
            icon: "open_in_new",
            action: () => goto(`/collections/${collection.uid}`)
        },
        {
            id: `edit-${collection.uid}`,
            label: "Edit",
            icon: "edit",
            action: () => {
                opts.editCollection?.(collection);
            }
        },
        {
            id: `favourite-${collection.uid}`,
            label: collection.favourited ? "Unfavourite" : "Favourite",
            icon: "favorite",
            action: async () => {
                const res = await updateCollection(collection.uid, {
                    favourited: collection.favourited ? false : true
                });

                if (res.status === 200) {
                    toastState.addToast({
                        type: "success",
                        message: `Collection ${collection.favourited ? "un" : ""}favourited`
                    });
                    opts.onCollectionUpdated?.(res.data);
                    await invalidateViz({ delay: 200, skipInvalidateAll: true });
                } else {
                    toastState.addToast({
                        type: "error",
                        message:
                            res.data.error ??
                            `Failed to ${collection.favourited ? "un" : ""}favourite`
                    });
                }
            }
        },
        {
            id: `duplicate-${collection.uid}`,
            label: "Duplicate",
            icon: "content_copy",
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
                        toastState.addToast({
                            message: res.data.error ?? `Duplicate failed (${res.status})`,
                            type: "error"
                        });
                    }
                } catch (err) {
                    toastState.addToast({
                        message: "Duplicate failed: " + (err as Error).message,
                        type: "error"
                    });
                }
            }
        },
        { separator: true, id: `sep-${collection.uid}`, label: "" },
        {
            id: `copylink-${collection.uid}`,
            label: "Copy link",
            icon: "link",
            action: async () => {
                try {
                    const url = `${location.origin}/collections/${collection.uid}`;
                    copyToClipboard(url);
                    toastState.addToast({
                        message: "Link copied to clipboard",
                        type: "success"
                    });
                } catch (err) {
                    toastState.addToast({
                        message: "Failed to copy link",
                        type: "error"
                    });
                }
            }
        },
        {
            id: `delete-${collection.uid}`,
            label: opts.selectedCollections && opts.selectedCollections.length > 1
                ? `Delete ${opts.selectedCollections.length} collections`
                : "Delete",
            icon: "delete",
            danger: true,
            action: () => {
                const targets = opts.selectedCollections && opts.selectedCollections.length > 1
                    ? opts.selectedCollections
                    : [collection];

                const confirmMsg = targets.length > 1
                    ? `Delete ${targets.length} collections? This cannot be undone.`
                    : `Delete collection "${collection.name}"? This cannot be undone.`;

                modalsManager.open(
                    ConfirmationModal,
                    {
                        title: targets.length > 1 ? "Delete Collections" : "Delete Collection",
                        confirmText: targets.length > 1 ? "Delete Collections" : "Delete Collection",
                        message: confirmMsg,
                        onConfirm: async () => {
                            try {
                                const results = await Promise.all(
                                    targets.map(async (c) => {
                                        const res = await deleteCollection(c.uid);
                                        return { collection: c, res };
                                    })
                                );

                                const successes = results.filter(r => r.res.status === 204);
                                const failures = results.filter(r => r.res.status !== 204);

                                if (successes.length > 0) {
                                    if (opts.onCollectionsDeleted) {
                                        opts.onCollectionsDeleted(successes.map(s => s.collection));
                                    } else {
                                        for (const success of successes) {
                                            opts.onCollectionDeleted?.(success.collection);
                                        }
                                    }
                                }

                                if (failures.length > 0) {
                                    const errorMsg = failures.map(f => {
                                        if (f.res.status !== 204) {
                                            return `${f.collection.name}: ${f.res.data.error || f.res.status}`;
                                        }
                                        return `${f.collection.name}: status ${f.res.status}`;
                                    }).join('; ');
                                    toastState.addToast({
                                        message: `Failed to delete some collections: ${errorMsg}`,
                                        type: "error"
                                    });
                                }
                            } catch (err) {
                                toastState.addToast({
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
