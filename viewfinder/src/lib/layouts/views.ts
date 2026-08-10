import type { CollectionDetailResponse } from "$lib/api/client.gen";
import DevWelcomeText from "$lib/components/misc/DevWelcomeText.svelte";
import FavouritesPanel from "$lib/components/panels/workspace/FavouritesPanel.svelte";
import Filmstrip from "$lib/components/panels/workspace/Filmstrip.svelte";
import FilterPanel from "$lib/components/panels/workspace/FilterPanel.svelte";
import HistogramPanel from "$lib/components/panels/workspace/HistogramPanel.svelte";
import ImagePreview from "$lib/components/panels/workspace/ImagePreview.svelte";
import Print from "$lib/components/panels/workspace/Print.svelte";
import DifferentContent from "$lib/components/panels/workspace/generic/DifferentContent.svelte";
import SomeContent from "$lib/components/panels/workspace/generic/SomeContent.svelte";
import MetadataPanel from "$lib/components/ui/panels/MetadataPanel.svelte";
import { collectionRoutePath, collectionTabDropHandlers, collectionTabMenuItems } from "$lib/layouts/tabs/collection";
import VizView from "$lib/views/views.svelte";
import Collections from "../../routes/(app)/collections/+page.svelte";
import CollectionPage from "../../routes/(app)/collections/[uid]/+page.svelte";
import PhotosPage from "../../routes/(app)/photos/+page.svelte";

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
        name: "Print",
        component: Print
    }),
    new VizView({
        name: "Welcome Text",
        component: DevWelcomeText
    }),
    new VizView({
        name: "Photos",
        component: PhotosPage,
        path: "/photos"
    }),
    new VizView({
        name: "Collections",
        component: Collections,
        path: "/collections"
    }),
    new VizView<typeof CollectionPage, CollectionDetailResponse>({
        name: "Collection",
        component: CollectionPage,
        path: collectionRoutePath,
        menuItems: collectionTabMenuItems,
        tabDropHandlers: collectionTabDropHandlers
    }),
    new VizView({
        name: "Filter",
        component: FilterPanel
    }),
    new VizView({
        name: "Filmstrip",
        component: Filmstrip
    }),
    new VizView({
        name: "Preview",
        component: ImagePreview
    }),
    new VizView({
        name: "Metadata",
        component: MetadataPanel
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
