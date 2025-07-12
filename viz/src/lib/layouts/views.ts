import DifferentContent from "$lib/components/panels/workspace/generic/DifferentContent.svelte";
import SomeContent from "$lib/components/panels/workspace/generic/SomeContent.svelte";
import EvenMoreDifferent from "$lib/components/panels/workspace/generic/EvenMoreDifferent.svelte";
import DevWelcomeText from "$lib/components/DevWelcomeText.svelte";
import VizView from "$lib/views/views.svelte";
import Collections from "../../routes/collections/+page.svelte";
import type { Collection } from "$lib/types/images";

// Only one instance of a view/panel and its component
// can exist in the layout so we declare all of them here
export const views: VizView[] = [
    new VizView({
        name: "Clock",
        component: SomeContent as any
    }),
    new VizView({
        name: "What Day Is It?",
        component: DifferentContent as any
    }),
    new VizView({
        name: "Timezone",
        component: EvenMoreDifferent as any
    }),
    new VizView({
        name: "Welcome Text",
        component: DevWelcomeText as any
    }),
    new VizView<Collection[]>({
        name: "Collections",
        component: Collections as any,
        path: "/collections"
    })
];