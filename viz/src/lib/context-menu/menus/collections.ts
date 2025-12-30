import { goto } from "$app/navigation";
import { type Collection, createCollection, deleteCollection } from "$lib/api";
import { toastState } from "$lib/toast-notifcations/notif-state.svelte";
import { copyToClipboard } from "$lib/utils/misc";
import type { MenuItem } from "../types";

interface CollectionMenuOptions {
    onCollectionDuplicated?: (collection: Collection) => void;
    onCollectionDeleted?: (collection: Collection) => void;
    editCollection?: (collection: Collection) => void;
}

export function createCollectionMenu(collection: Collection, opts: CollectionMenuOptions) {
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
                            message:
                                res.data.error ??
                                `Duplicate failed (${res.status})`,
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
            label: "Delete",
            icon: "delete",
            danger: true,
            action: async () => {
                if (
                    !confirm(
                        `Delete collection "${collection.name}"? This cannot be undone.`
                    )
                ) {
                    return;
                }

                try {
                    const res = await deleteCollection(collection.uid);
                    if (res.status === 204) {
                        opts.onCollectionDeleted?.(collection);
                    } else {
                        toastState.addToast({
                            message: res.data.error ?? "Failed to delete",
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
        }
    ];

    return items;
}