import { describe, expect, it } from "vitest";
import DevWelcomeText from "$lib/components/misc/DevWelcomeText.svelte";
import VizView from "$lib/views/views.svelte";
import { type SerializedWorkspace, SplitNode, TabGroup, Workspace } from "./model.svelte";

describe("Workspace Layout System", () => {
    // ----------------------------------------------------
    // TabGroup Unit Tests
    // ----------------------------------------------------
    describe("TabGroup", () => {
        it("should handle adding and removing tabs correctly", () => {
            const viewA = new VizView({ name: "A", id: 1 });
            const viewB = new VizView({ name: "B", id: 2 });
            const group = new TabGroup({ views: [viewA] });

            expect(group.views.length).toBe(1);
            expect(group.activeViewId).toBe(1);

            // Add tab B
            group.addTab(viewB);
            expect(group.views.length).toBe(2);
            expect(group.activeViewId).toBe(2); // Automatically set active

            // Add tab at index
            const viewC = new VizView({ name: "C", id: 3 });
            group.addTab(viewC, 1);
            expect(group.views[1].id).toBe(3);

            // Remove tab B
            group.removeTab(2);
            expect(group.views.length).toBe(2);
            expect(group.activeViewId).toBe(3); // Switches active to remaining tab C

            // Remove non-existent tab does nothing
            group.removeTab(999);
            expect(group.views.length).toBe(2);
        });

        it("should manage active views and lock status correctly", () => {
            const viewA = new VizView({ name: "A", id: 1 });
            const viewB = new VizView({ name: "B", id: 2 });
            const group = new TabGroup({ views: [viewA, viewB] });

            group.setActive(2);
            expect(group.activeViewId).toBe(2);
            expect(viewB.isActive).toBe(true);
            expect(viewA.isActive).toBe(false);

            // Setting active to non-existent tab does nothing
            group.setActive(999);
            expect(group.activeViewId).toBe(2);

            // Lock group
            group.locked = true;
            expect(group.locked).toBe(true);
        });

        it("should support JSON serialization round-tripping", () => {
            const viewA = new VizView({ name: "A", id: 1, path: "/path-a", component: DevWelcomeText });
            const group = new TabGroup({ id: "t-1", views: [viewA] });

            const json = group.toJSON();
            expect(json.id).toBe("t-1");
            expect(json.views[0].name).toBe("A");

            const registry = [viewA];
            const resurrected = TabGroup.fromJSON(json, registry);
            expect(resurrected.id).toBe("t-1");
            expect(resurrected.views.length).toBe(1);
            expect(resurrected.views[0].name).toBe("A");
            expect(resurrected.views[0].path).toBe("/path-a");
        });
    });

    // ----------------------------------------------------
    // SplitNode Unit Tests
    // ----------------------------------------------------
    describe("SplitNode", () => {
        it("should handle child management and size normalization", () => {
            const group1 = new TabGroup({ id: "g1" });
            const group2 = new TabGroup({ id: "g2" });
            const split = new SplitNode({ orientation: "horizontal", children: [group1] });

            expect(split.children.length).toBe(1);
            expect(group1.parent).toBe(split);
            expect(group1.size).toBe(100);

            // Add child
            split.addChild(group2);
            expect(split.children.length).toBe(2);
            expect(group2.parent).toBe(split);
            // Normalized sizes: 50% each
            expect(group1.size).toBe(50);
            expect(group2.size).toBe(50);

            // Remove child
            split.removeChild(group1);
            expect(split.children.length).toBe(1);
            expect(group1.parent).toBeNull();
            expect(group2.size).toBe(100); // Normalized size
        });

        it("should replace children correctly", () => {
            const group1 = new TabGroup({ id: "g1", size: 60 });
            const group2 = new TabGroup({ id: "g2", size: 40 });
            const group3 = new TabGroup({ id: "g3" });
            const split = new SplitNode({ children: [group1, group2] });

            split.replaceChild(group1, group3);
            expect(split.children[0]).toBe(group3);
            expect(group3.parent).toBe(split);
            expect(group3.size).toBe(60); // Inherit size
            expect(group1.parent).toBeNull();
        });
    });

    // ----------------------------------------------------
    // Workspace Searching & Hierarchy Tests
    // ----------------------------------------------------
    describe("Workspace Searching and Hierarchy", () => {
        it("should query groups, nodes, and views by path or viewId", () => {
            const viewA = new VizView({ name: "A", id: 1, path: "/a" });
            const viewB = new VizView({ name: "B", id: 2, path: "/b/123" });
            const viewC = new VizView({ name: "C", id: 3, path: "/collections/[uid]" });

            const group1 = new TabGroup({ id: "g1", views: [viewA] });
            const group2 = new TabGroup({ id: "g2", views: [viewB, viewC] });
            const root = new SplitNode({ children: [group1, group2] });
            const workspace = new Workspace(root);

            // Find node
            expect(workspace.findNode("g2")).toBe(group2);
            expect(workspace.findNode("non-existent")).toBeNull();

            // Find group with view
            expect(workspace.findGroupWithView(1)).toBe(group1);
            expect(workspace.findGroupWithView(3)).toBe(group2);
            expect(workspace.findGroupWithView(999)).toBeNull();

            // Find group with path
            expect(workspace.findGroupWithPath("/a")).toBe(group1);
            expect(workspace.findGroupWithPath("/b/123")).toBe(group2);

            // Find view with path
            expect(workspace.findViewWithPath("/a")).toBe(viewA);
            expect(workspace.findViewWithPath("/collections/[uid]")).toBe(viewC);
            expect(workspace.findViewWithPath("/non-existent")).toBeNull();

            // Active / maximized group toggles
            workspace.setActiveGroup("g2");
            expect(workspace.activeGroup).toBe(group2);

            workspace.toggleMaximize("g2");
            expect(workspace.maximizedGroup).toBe(group2);
            workspace.toggleMaximize("g2");
            expect(workspace.maximizedGroup).toBeNull();
        });
    });

    // ----------------------------------------------------
    // Workspace moveTab (Left/Right Swapping) Tests
    // ----------------------------------------------------
    describe("Workspace.moveTab (Left / Right Swapping)", () => {
        function setup(numTabs = 3) {
            const viewA = new VizView({ name: "Tab A", id: 101 });
            const viewB = new VizView({ name: "Tab B", id: 102 });
            const viewC = new VizView({ name: "Tab C", id: 103 });

            const views = [viewA, viewB, viewC].slice(0, numTabs);
            const group = new TabGroup({ views });
            const workspace = new Workspace(group);
            return { viewA, viewB, viewC, group, workspace };
        }

        it("should move tab to the left (swap with left sibling)", () => {
            const { group, workspace } = setup(3);

            // Move B to the left (index 1 -> index 0)
            workspace.moveTab(102, "left");

            expect(group.views[0].id).toBe(102);
            expect(group.views[1].id).toBe(101);
            expect(group.views[2].id).toBe(103);
        });

        it("should move tab to the right (swap with right sibling)", () => {
            const { group, workspace } = setup(3);

            // Move B to the right (index 1 -> index 2)
            workspace.moveTab(102, "right");

            expect(group.views[0].id).toBe(101);
            expect(group.views[1].id).toBe(103);
            expect(group.views[2].id).toBe(102);
        });

        it("should do nothing when moving first tab to the left", () => {
            const { group, workspace } = setup(2);

            // Try to move A left
            workspace.moveTab(101, "left");

            expect(group.views[0].id).toBe(101);
            expect(group.views[1].id).toBe(102);
        });

        it("should do nothing when moving last tab to the right", () => {
            const { group, workspace } = setup(2);

            // Try to move B right
            workspace.moveTab(102, "right");

            expect(group.views[0].id).toBe(101);
            expect(group.views[1].id).toBe(102);
        });

        it("should do nothing when group only has one tab", () => {
            const { group, workspace } = setup(1);

            workspace.moveTab(101, "left");
            expect(group.views[0].id).toBe(101);

            workspace.moveTab(101, "right");
            expect(group.views[0].id).toBe(101);
        });

        it("should do nothing for non-existent viewId or invalid direction", () => {
            const { group, workspace } = setup(2);

            // Invalid viewId
            workspace.moveTab(999, "left");
            expect(group.views[0].id).toBe(101);

            // Invalid direction
            workspace.moveTab(102, "up");
            expect(group.views[1].id).toBe(102);
        });
    });

    // ----------------------------------------------------
    // Workspace moveTabToGroup & Layout Cleanup Tests
    // ----------------------------------------------------
    describe("Workspace.moveTabToGroup & Layout Cleanup", () => {
        it("should move a tab to a different group and handle clean up if empty", () => {
            const viewA = new VizView({ name: "Tab A", id: 101 });
            const viewB = new VizView({ name: "Tab B", id: 102 });

            const group1 = new TabGroup({ id: "group-1", views: [viewA] });
            const group2 = new TabGroup({ id: "group-2", views: [viewB] });

            const root = new SplitNode({
                orientation: "horizontal",
                children: [group1, group2]
            });

            const workspace = new Workspace(root);

            // Move A to group-2
            workspace.moveTabToGroup(101, "group-2");

            expect(group2.views.length).toBe(2);
            expect(group2.views[1].id).toBe(101);

            // group-1 is empty and should be cleaned up from the root split
            expect(root.children.length).toBe(1);
            expect(workspace.root.id).toBe("group-2"); // Root collapsed to group-2
        });

        it("should refuse to move a locked tab or move out of/into a locked group", () => {
            const viewA = new VizView({ name: "Tab A", id: 101, locked: true });
            const viewB = new VizView({ name: "Tab B", id: 102 });

            const group1 = new TabGroup({ id: "group-1", views: [viewA] });
            const group2 = new TabGroup({ id: "group-2", views: [viewB] });
            const root = new SplitNode({ children: [group1, group2] });
            const workspace = new Workspace(root);

            // 1. Move locked tab A to group-2
            workspace.moveTabToGroup(101, "group-2");
            expect(group1.views.length).toBe(1); // Locked tab didn't move

            // 2. Lock group-1, unlock tab A, try to move
            viewA.locked = false;
            group1.locked = true;
            workspace.moveTabToGroup(101, "group-2");
            expect(group1.views.length).toBe(1); // Didn't move from locked group

            // 3. Unlock group-1, lock target group-2, try to move
            group1.locked = false;
            group2.locked = true;
            workspace.moveTabToGroup(101, "group-2");
            expect(group1.views.length).toBe(1); // Didn't move to locked group
        });
    });

    // ----------------------------------------------------
    // Workspace.splitGroup Tests
    // ----------------------------------------------------
    describe("Workspace.splitGroup", () => {
        it("should split right on a tab in a nested layout without collapsing", () => {
            // Build the user's exact layout programmatically.
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
            expect(root.children.length).toBe(2);
            expect(rightVert.children.length).toBe(2);

            const newSplit = rightVert.children[0] as SplitNode;
            expect(newSplit).toBeInstanceOf(SplitNode);
            expect(newSplit.type).toBe("split");
            expect(newSplit.orientation).toBe("horizontal");
            expect(newSplit.size).toBeCloseTo(75.62049556244945, 2);
            expect(newSplit.children.length).toBe(2);

            const innerLeft = newSplit.children[0] as TabGroup;
            expect(innerLeft.id).toBe("sp-aXIgcpJ5S0");
            expect(innerLeft.views.length).toBe(1);
            expect(innerLeft.views[0].name).toBe("Collections");

            const innerRight = newSplit.children[1] as TabGroup;
            expect(innerRight.type).toBe("tab-group");
            expect(innerRight.views.length).toBe(1);
            expect(innerRight.views[0].name).toBe("Pona x NKLY Milk and Cookies 2026");

            expect(innerLeft.size).toBe(50);
            expect(innerRight.size).toBe(50);

            expect(rightVert.children[1].id).toBe("sp-zFGEpNSmoV");
            expect((rightVert.children[1] as TabGroup).views[0].name).toBe("Filmstrip");
            expect((rightVert.children[1] as TabGroup).size).toBeCloseTo(24.37950443755055, 2);
        });
    });

    // ----------------------------------------------------
    // Serialization & Hydration Tests
    // ----------------------------------------------------
    describe("Workspace Serialization and Hydration", () => {
        it("should load and resurrect workspace configurations from JSON correctly", () => {
            const viewA = new VizView({ name: "Clock", id: 1, path: "/clock", component: DevWelcomeText });
            const viewB = new VizView({ name: "Filter", id: 2, path: "/filter", component: DevWelcomeText });
            const registry = [viewA, viewB];

            const json: SerializedWorkspace = {
                root: {
                    type: "split",
                    id: "root-split",
                    orientation: "vertical",
                    size: 100,
                    locked: false,
                    children: [
                        {
                            type: "tab-group",
                            id: "tg-1",
                            size: 50,
                            locked: false,
                            activeViewId: 1,
                            views: [{ name: "Clock", id: 1, path: "/clock", isActive: true, locked: false }]
                        },
                        {
                            type: "tab-group",
                            id: "tg-2",
                            size: 50,
                            locked: false,
                            activeViewId: 2,
                            views: [{ name: "Filter", id: 2, path: "/filter", isActive: true, locked: false }]
                        }
                    ]
                },
                activeGroupId: "tg-1"
            };

            const workspace = Workspace.fromJSON(json, registry);
            expect(workspace.root).toBeInstanceOf(SplitNode);
            expect(workspace.activeGroupId).toBe("tg-1");

            const rootSplit = workspace.root as SplitNode;
            expect(rootSplit.children.length).toBe(2);
            expect(rootSplit.children[0]).toBeInstanceOf(TabGroup);
            expect(rootSplit.children[1]).toBeInstanceOf(TabGroup);

            const tg1 = rootSplit.children[0] as TabGroup;
            expect(tg1.views.length).toBe(1);
            expect(tg1.views[0].name).toBe("Clock");
        });
    });
});
