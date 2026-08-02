import type { Snippet } from "svelte";
import type { MenuItem } from "$lib/context-menu/types";
import { viewSettings } from "$lib/states/index.svelte";

export interface ImageGridDisplayRenderers {
    showDates?: Snippet<[]>;
    showSimple?: Snippet<[]>;
}

export function getImageGridDisplay(renderers: ImageGridDisplayRenderers = {}): MenuItem[] {
    const baseItems: MenuItem[] = [
        {
            id: "display-custom",
            label: "Grid",
            iconName: viewSettings.current === "custom" ? "check" : undefined,
            action: () => {
                viewSettings.setView("custom");
            }
        },
        {
            id: "display-grid",
            label: "Thumbnails",
            iconName: viewSettings.current === "grid" ? "check" : undefined,
            action: () => {
                viewSettings.setView("grid");
            }
        },
        {
            id: "display-list",
            label: "List",
            iconName: viewSettings.current === "list" ? "check" : undefined,
            action: () => {
                viewSettings.setView("list");
            }
        }
    ];

    if (viewSettings.current === "custom") {
        baseItems.push(
            { id: "display-separator", separator: true },
            {
                id: "display-show-dates",
                label: "Show Dates",
                content: renderers.showDates,
                action: () => {
                    viewSettings.toggleShowDates();
                }
            }
        );
    }

    if (viewSettings.current === "grid") {
        baseItems.push(
            { id: "display-separator", separator: true },
            {
                id: "display-show-simple",
                label: "Simple",
                content: renderers.showSimple,
                action: () => {
                    viewSettings.toggleShowSimple();
                }
            }
        );
    }

    return baseItems;
}
