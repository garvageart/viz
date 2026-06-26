import { describe, expect, it } from "vitest";
import VizView from "$lib/views/views.svelte";
import { SplitNode, TabGroup, Workspace } from "./model.svelte";

describe("Workspace.splitGroup", () => {
    it("should split right on a tab in a nested layout without collapsing", () => {
        // Build the user's exact layout programmatically.
        // Components are undefined since we're testing model logic, not rendering.
        const clockView = new VizView({ name: "Clock", id: 1, isActive: true });
        const filterView = new VizView({ name: "Filter", id: 7, isActive: true });
        const collectionsView = new VizView({
            name: "Collections",
            id: 5,
            isActive: true,
            path: "/collections"
        });
        const ponaView = new VizView({
            name: "Pona x NKLY Milk and Cookies 2026",
            id: 12,
            isActive: false,
            locked: false,
            path: "/collections/06xTWgHoSuB9vttFOVWle8H1"
        });
        const filmstripView = new VizView({ name: "Filmstrip", id: 8, isActive: true });

        // Left vertical split: Clock (top) | Filter (bottom) — size 25% of root
        const clockGroup = new TabGroup({
            id: "sp-u0tEcKKSnx",
            size: 50,
            views: [clockView],
            activeViewId: 1
        });
        const filterGroup = new TabGroup({
            id: "sp-7HjeQT2KzD",
            size: 50,
            views: [filterView],
            activeViewId: 7
        });
        const leftVert = new SplitNode({
            id: "sp-AKDfipgqvU",
            orientation: "vertical",
            size: 25,
            children: [clockGroup, filterGroup]
        });

        // Right vertical split: Collections+Pona (top, ~75.6%) | Filmstrip (bottom, ~24.4%) — size 75% of root
        const collectionsGroup = new TabGroup({
            id: "sp-aXIgcpJ5S0",
            size: 75.62049556244945,
            views: [collectionsView, ponaView],
            activeViewId: 5
        });
        const filmstripGroup = new TabGroup({
            id: "sp-zFGEpNSmoV",
            size: 24.37950443755055,
            views: [filmstripView],
            activeViewId: 8
        });
        const rightVert = new SplitNode({
            id: "sp-RupEdKFOer",
            orientation: "vertical",
            size: 75,
            children: [collectionsGroup, filmstripGroup]
        });

        // Root horizontal split
        const root = new SplitNode({
            id: "sp-ovB2YokRKP",
            orientation: "horizontal",
            size: 100,
            children: [leftVert, rightVert]
        });

        const registry = [clockView, filterView, collectionsView, ponaView, filmstripView];
        const workspace = new Workspace(root, registry);
        workspace.setActiveGroup("sp-aXIgcpJ5S0");

        // Verify initial tree structure
        expect(root.children.length).toBe(2);
        expect(leftVert.children.length).toBe(2);
        expect(rightVert.children.length).toBe(2);
        expect(collectionsGroup.views.length).toBe(2);
        expect(collectionsGroup.views[1].name).toBe("Pona x NKLY Milk and Cookies 2026");

        // --- Perform the split: split RIGHT on collectionsGroup, moving ponaView ---
        workspace.splitGroup("sp-aXIgcpJ5S0", ponaView, "right");

        // --- Post-split verification ---
        // Expected tree:
        // root (horiz)
        //   left-vert (25%)
        //     Clock (50%)
        //     Filter (50%)
        //   right-vert (75%)
        //     newSplit (horiz, 75.62% — inherited from collectionsGroup)
        //       Collections (50% of newSplit)
        //       Pona (50% of newSplit)
        //     Filmstrip (24.38%)

        // 1. Root should still have 2 children
        expect(root.children.length).toBe(2);

        // 2. RightVert should still have 2 children (newSplit + Filmstrip)
        expect(rightVert.children.length).toBe(2);

        // 3. The first child of rightVert should be a SplitNode (the new horizontal split)
        const newSplit = rightVert.children[0] as SplitNode;
        expect(newSplit).toBeInstanceOf(SplitNode);
        expect(newSplit.type).toBe("split");
        expect(newSplit.orientation).toBe("horizontal");

        // 4. newSplit should inherit the size of the replaced collectionsGroup
        expect(newSplit.size).toBeCloseTo(75.62049556244945, 2);

        // 5. newSplit should have 2 children
        expect(newSplit.children.length).toBe(2);

        // 6. First child of newSplit should be the original collectionsGroup (now only Collections)
        const innerLeft = newSplit.children[0] as TabGroup;
        expect(innerLeft.id).toBe("sp-aXIgcpJ5S0");
        expect(innerLeft.views.length).toBe(1);
        expect(innerLeft.views[0].name).toBe("Collections");

        // 7. Second child should be a new group with just Pona
        const innerRight = newSplit.children[1] as TabGroup;
        expect(innerRight.type).toBe("tab-group");
        expect(innerRight.views.length).toBe(1);
        expect(innerRight.views[0].name).toBe("Pona x NKLY Milk and Cookies 2026");

        // 8. Both children of newSplit should have size 50 (normalized)
        expect(innerLeft.size).toBe(50);
        expect(innerRight.size).toBe(50);

        // 9. Second child of rightVert should still be filmstripGroup, unchanged
        expect(rightVert.children[1].id).toBe("sp-zFGEpNSmoV");
        expect((rightVert.children[1] as TabGroup).views[0].name).toBe("Filmstrip");
        expect((rightVert.children[1] as TabGroup).size).toBeCloseTo(24.37950443755055, 2);

        // 10. Parent pointers must be correct
        expect(rightVert.parent?.id).toBe("sp-ovB2YokRKP");
        expect(newSplit.parent?.id).toBe("sp-RupEdKFOer");
        expect(innerLeft.parent?.id).toBe(newSplit.id);
        expect(innerRight.parent?.id).toBe(newSplit.id);
        expect((rightVert.children[1] as TabGroup).parent?.id).toBe("sp-RupEdKFOer");

        // 11. Source group should still be in the tree (it still has Collections tab)
        const foundCollections = workspace.findNode("sp-aXIgcpJ5S0");
        expect(foundCollections).not.toBeNull();
        expect((foundCollections as TabGroup).views[0].name).toBe("Collections");

        // 12. Pona group should exist and be active
        const ponaGroup = workspace.findGroupWithView(12);
        expect(ponaGroup).not.toBeNull();
        expect(ponaGroup?.views.length).toBe(1);
        expect(ponaGroup?.activeView?.name).toBe("Pona x NKLY Milk and Cookies 2026");
        expect(workspace.activeGroupId).toBe(ponaGroup?.id);

        // 13. Filmstrip should still be findable
        const foundFilmstrip = workspace.findGroupWithView(8);
        expect(foundFilmstrip).not.toBeNull();

        // 14. All tab groups should be findable
        const allGroups = workspace.getAllTabGroups();
        // 5 groups: Clock, Filter, Collections, Pona, Filmstrip
        expect(allGroups.length).toBe(5);

        // 15. Verify serialization round-trips correctly
        const json = workspace.toJSON();
        expect(json.root.type).toBe("split");
        const splitRoot = json.root as any;
        expect(splitRoot.children.length).toBe(2);

        // Navigate: root > rightVert(1) > newSplit(0) > [Collections(0), Pona(1)]
        const rightVertJson = splitRoot.children[1];
        expect(rightVertJson.children.length).toBe(2);
        const newSplitJson = rightVertJson.children[0];
        expect(newSplitJson.orientation).toBe("horizontal");
        expect(newSplitJson.children.length).toBe(2);
        expect(newSplitJson.children[0].views.length).toBe(1);
        expect(newSplitJson.children[0].views[0].name).toBe("Collections");
        expect(newSplitJson.children[1].views.length).toBe(1);
        expect(newSplitJson.children[1].views[0].name).toBe("Pona x NKLY Milk and Cookies 2026");
    });
});
