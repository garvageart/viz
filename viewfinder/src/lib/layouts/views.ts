import { addCollectionImages } from "$lib/api";
import type { CollectionDetailResponse } from "$lib/api/client.gen";
import DevWelcomeText from "$lib/components/DevWelcomeText.svelte";
import FavouritesPanel from "$lib/components/panels/workspace/FavouritesPanel.svelte";
import Filmstrip from "$lib/components/panels/workspace/Filmstrip.svelte";
import FilterPanel from "$lib/components/panels/workspace/FilterPanel.svelte";
import DifferentContent from "$lib/components/panels/workspace/generic/DifferentContent.svelte";
import EvenMoreDifferent from "$lib/components/panels/workspace/generic/EvenMoreDifferent.svelte";
import SomeContent from "$lib/components/panels/workspace/generic/SomeContent.svelte";
import HistogramPanel from "$lib/components/panels/workspace/HistogramPanel.svelte";
import ImagePreview from "$lib/components/panels/workspace/ImagePreview.svelte";
import { VizMimeTypes } from "$lib/constants";
import { workspaceState } from "$lib/states/workspace.svelte";
import { toastState } from "$lib/toast-notifcations/notif-state.svelte";
import VizView, { invalidateViz } from "$lib/views/views.svelte";
import Collections from "../../routes/(app)/collections/+page.svelte";
import CollectionPage from "../../routes/(app)/collections/[uid]/+page.svelte";

// Only one instance of a view/panel and its component
// can exist in the layout so we declare all of them here
export const views: VizView<any, any>[] = [
    new VizView({
        name: "Clock",
        component: SomeContent
    }),
    new VizView({
        name: "What Day Is It?",
        component: DifferentContent
    }),
    new VizView({
        name: "Timezone",
        component: EvenMoreDifferent
    }),
    new VizView({
        name: "Welcome Text",
        component: DevWelcomeText
    }),
    new VizView({
        name: "Collections",
        component: Collections,
        path: "/collections"
    }),
    new VizView<typeof CollectionPage, CollectionDetailResponse>({
        name: "Collection",
        component: CollectionPage,
        path: "/collections/[uid]",
        tabDropHandlers: new Map([
            [VizMimeTypes.IMAGE_UIDS, {
                label: "Add to Collection",
                dropHandler: async (data: string[], v) => {
                    if (!v.path) {
                        return;
                    }

                    const existingUIDs = (v.viewData?.data.images.items.map(i => i.image.uid));
                    const newUIDs = data.filter(uid => !existingUIDs?.includes(uid));

                    if (newUIDs.length === 0) {
                        toastState.addToast({
                            type: "success",
                            message: `No new images to add to **${v.name}**`,
                            timeout: 5000,
                            actions: [
                                {
                                    label: "Open Collection",
                                    onClick: () => {
                                        const workspace = workspaceState.workspace;
                                        if (!workspace) {
                                            return;
                                        }

                                        const group = workspace.findGroupWithView(v.id);
                                        if (group) {
                                            group.setActive(v.id);
                                            workspace.setActiveGroup(group.id);
                                        }
                                    }
                                }
                            ]
                        });
                        return;
                    }

                    const skippedUidLength = data.length - newUIDs.length;

                    const match = v.path.match(/\/collections\/([^\/?]+)/);
                    if (match && match[1] && match[1] !== "[uid]") {
                        const collectionUid = match[1];
                        const res = await addCollectionImages(collectionUid, { uids: newUIDs });

                        if (res.status === 200 && res.data.added) {
                            let skippedMessage = skippedUidLength ? `Skipped ${skippedUidLength} images.` : "";
                            let toastMessage = `Added ${newUIDs.length} image(s) to **${v.name}**`;

                            if (skippedMessage) {
                                toastMessage += `. ${skippedMessage}`;
                            }

                            toastState.addToast({
                                type: "success",
                                message: toastMessage,
                                timeout: 5000,
                                actions: [
                                    {
                                        label: "Open Collection",
                                        onClick: () => {
                                            const workspace = workspaceState.workspace;
                                            if (!workspace) {
                                                return;
                                            }

                                            const group = workspace.findGroupWithView(v.id);
                                            if (group) {
                                                group.setActive(v.id);
                                                workspace.setActiveGroup(group.id);
                                            }
                                        }
                                    }
                                ]
                            });
                            await invalidateViz({ delay: 200 });
                        } else {
                            toastState.addToast({
                                type: "error",
                                message: `Failed to add images: ${res.data?.error || "Unknown error"}`
                            });
                        }
                    }
                }
            }]
        ])
    }),
    new VizView({
        name: "Filter",
        component: FilterPanel,
    }),
    new VizView({
        name: "Filmstrip",
        component: Filmstrip,
    }),
    new VizView({
        name: "Preview",
        component: ImagePreview,
    }),
    new VizView({
        name: "Histogram",
        component: HistogramPanel
    }),
    new VizView({
        name: "Favourites",
        component: FavouritesPanel
    })
];