import type { MenuItem } from "$lib/context-menu/types";
import { viewSettings } from "$lib/states/index.svelte";

export function getImageGridDisplay() {
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
            { id: "display-separator", label: "", separator: true },
            {
                id: "display-show-dates",
                label: "Show Dates",
                iconName: viewSettings.showDates ? "check_box" : "check_box_outline_blank",
                action: () => {
                    viewSettings.toggleShowDates();
                }
            }
        );
    }

    if (viewSettings.current === "grid") {
        baseItems.push(
            { id: "display-separator", label: "", separator: true },
            {
                id: "display-show-simple",
                label: "Simple",
                iconName: viewSettings.simple ? "check_box" : "check_box_outline_blank",
                action: () => {
                    console.log("hello?");
                    viewSettings.toggleShowSimple();
                }
            }
        );
    }

    return baseItems;
}
