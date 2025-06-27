import type { VizSubPanel } from "$lib/components/panels/SubPanel.svelte";
import SomeContent from "$lib/components/panels/workspace/SomeContent.svelte";
import DifferentContent from "$lib/components/panels/workspace/DifferentContent.svelte";
import { generateKeyId } from "$lib/utils";
import { DEFAULT_THEME } from "$lib/constants";
import EvenMoreDifferent from "$lib/components/panels/workspace/EvenMoreDifferent.svelte";

const theme = DEFAULT_THEME;
// this seems so..... complex?? 
// but i guess it's fine
export const panels: VizSubPanel[] = [
    {
        id: "viz-test-content",
        tabs: [
            {
                name: "Tab 1",
                component: SomeContent,
                id: 1,
                opticalCenterFix: 0.2
            },
            {
                name: "Tab 2",
                component: DifferentContent,
                id: 2,
                opticalCenterFix: 0.2
            }
        ],
        header: true,
        maxSize: 100,
        minSize: 10,
        paneKeyId: generateKeyId(),
        childs: {
            parentSubPanel: {
                id: "viz-test-content-container",
                paneKeyId: generateKeyId(16),
                smoothExpand: false,
                minSize: 10,
                size: 25
            },
            parentPanel: {
                id: "viz-internal",
                horizontal: true,
                keyId: generateKeyId(16),
                theme,
                style: "height: 100%",
                pushOtherPanes: true,
            },
            subPanel: [
                {
                    id: "viz-test-again",
                    maxSize: 100,
                    paneKeyId: generateKeyId(),
                    tabs: [
                        {
                            name: "Tab 4",
                            component: SomeContent,
                            id: 5,
                            opticalCenterFix: 0.2
                        },
                        {
                            name: "Tab 5",
                            component: EvenMoreDifferent,
                            id: 6,
                            opticalCenterFix: 0.2
                        }
                    ]
                }
            ]
        }
    },
    {
        id: "viz-test-something-else",
        tabs: [
            {
                name: "Tab 7",
                component: SomeContent,
                id: 7,
                opticalCenterFix: 0.2
            },
            {
                name: "Tab 8",
                component: DifferentContent,
                id: 8,
                opticalCenterFix: 0.2
            }
        ],
        header: true,
        maxSize: 100,
        minSize: 10,
        paneKeyId: generateKeyId()
    }
];