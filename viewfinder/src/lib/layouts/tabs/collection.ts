import { goto } from "$app/navigation";
import { addCollectionImages } from "$lib/api";
import type { CollectionDetailResponse } from "$lib/api";
import { VizMimeTypes } from "$lib/constants";
import type { MenuItem } from "$lib/context-menu/types";
import type { TabGroup } from "$lib/layouts/model.svelte";
import { workspaceState } from "$lib/states/workspace.svelte";
import { toasts } from "$lib/toast-notifcations/toasts.svelte";
import VizView, { type TabActions, invalidateViz } from "$lib/views/views.svelte";
import type CollectionPage from "../../../routes/(app)/collections/[uid]/+page.svelte";

export const collectionRoutePath = "/collections/[uid]";

function extractCollectionUid(path: string | undefined): string | null {
    if (!path) {
        return null;
    }

    const match = path.match(/\/collections\/([^/?]+)/);
    if (!match || !match[1] || match[1] === "[uid]") {
        return null;
    }

    return match[1];
}

function openCollectionView(v: VizView) {
    const workspace = workspaceState.workspace;
    const group = workspace?.findGroupWithView(v.id);
    if (!workspace || !group) {
        return;
    }

    group.setActive(v.id);
    workspace.setActiveGroup(group.id);
}

export const collectionTabMenuItems: MenuItem[] = [
    {
        id: "open-collection",
        label: "Open Collection",
        iconName: "open_in_new",
        action: function (this: VizView) {
            if (this.path) {
                goto(this.path);
            }
        }
    }
];

export const collectionTabDropHandlers: Map<
    string,
    TabActions<CollectionDetailResponse, typeof CollectionPage>
> = new Map([
    [
        VizMimeTypes.IMAGE_UIDS,
        {
            label: "Add to Collection",
            dropHandler: async (data: string[], v) => {
                const collectionUid = extractCollectionUid(v.path);
                if (!collectionUid) {
                    return;
                }

                const existingUIDs = v.viewData?.data.images.items.map((i) => i.image.uid);
                const newUIDs = data.filter((uid) => !existingUIDs?.includes(uid));

                if (newUIDs.length === 0) {
                    toasts.add({
                        type: "success",
                        message: `No new images to add to **${v.name}**`,
                        actions: [{ label: "Open Collection", onClick: () => openCollectionView(v) }]
                    });
                    return;
                }

                const skippedUidLength = data.length - newUIDs.length;
                const res = await addCollectionImages(collectionUid, { uids: newUIDs });

                if (res.status !== 200 || !res.data.added) {
                    toasts.add({
                        type: "error",
                        message: `Failed to add images: ${res.data?.error || "Unknown error"}`
                    });
                    return;
                }

                const skippedMessage = skippedUidLength ? `Skipped ${skippedUidLength} images.` : "";
                const toastMessage = [`Added ${newUIDs.length} image(s) to **${v.name}**`, skippedMessage]
                    .filter(Boolean)
                    .join(". ");

                toasts.add({
                    type: "success",
                    message: toastMessage,
                    actions: [{ label: "Open Collection", onClick: () => openCollectionView(v) }]
                });
                await invalidateViz();
            }
        }
    ]
]);

export function createCollectionView(uid: string, name: string) {
    const collectionPath = `/collections/${uid}`;
    const template = workspaceState.workspace?.registry.find((v) => v.path === collectionRoutePath);

    return new VizView({
        name,
        component: template?.component,
        path: collectionPath,
        menuItems: template?.menuItems,
        tabDropHandlers: template?.tabDropHandlers
    });
}

export function openCollectionTab(group: TabGroup, uid: string, name: string) {
    const collectionPath = `/collections/${uid}`;

    const existingView = group.views.find((v) => v.path === collectionPath);
    if (existingView) {
        group.setActive(existingView.id);
        return;
    }

    group.addTab(createCollectionView(uid, name));
}
