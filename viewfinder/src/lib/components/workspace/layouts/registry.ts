import { SplitNode, TabGroup, Workspace } from "$lib/layouts/model.svelte";
import { views as viewRegistry } from "$lib/layouts/views";

export function createDefaultLayout(): Workspace {
    const collectionsView = viewRegistry.find((v) => v.path === "/collections");
    const filterView = viewRegistry.find((v) => v.name === "Filter");
    const clockView = viewRegistry.find((v) => v.name === "Clock");
    const filmstripView = viewRegistry.find((v) => v.name === "Filmstrip");

    const root = new SplitNode({
        orientation: "horizontal",
        children: [
            new SplitNode({
                size: 20,
                orientation: "vertical",
                children: [
                    new TabGroup({
                        size: 50,
                        views: clockView ? [clockView] : []
                    }),
                    new TabGroup({
                        size: 50,
                        views: filterView ? [filterView] : []
                    })
                ]
            }),
            new SplitNode({
                size: 80,
                orientation: "vertical",
                children: [
                    new TabGroup({
                        size: 75,
                        views: collectionsView ? [collectionsView] : []
                    }),
                    new TabGroup({
                        size: 25,
                        views: filmstripView ? [filmstripView] : []
                    })
                ]
            })
        ]
    });

    return new Workspace(root);
}
