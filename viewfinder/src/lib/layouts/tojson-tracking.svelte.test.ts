import { render } from "@testing-library/svelte";
import { tick } from "svelte";
import { describe, expect, it, vi } from "vitest";
import ToJsonTrackingHarness from "$lib/components/tests/harnesses/ToJsonTrackingHarness.svelte";
import VizView from "$lib/views/views.svelte";
import { SplitNode, TabGroup, Workspace } from "./model.svelte";

describe("toJSON dependency tracking", () => {
    function build() {
        const a = new VizView({ name: "A", id: 1 });
        const b = new VizView({ name: "B", id: 2 });
        const c = new VizView({ name: "C", id: 3 });

        const g1 = new TabGroup({ id: "g1", size: 50, views: [a, b], activeViewId: 1 });
        const g2 = new TabGroup({ id: "g2", size: 50, views: [c], activeViewId: 3 });
        const root = new SplitNode({ id: "root", orientation: "horizontal", children: [g1, g2] });
        const ws = new Workspace(root, [a, b, c]);

        return { ws, root, g1, g2, a, b, c };
    }

    it("re-runs when only toJSON() is read and nested fields mutate", async () => {
        const { ws, g1, g2, root } = build();
        const fn = vi.fn();
        const { unmount } = render(ToJsonTrackingHarness, { props: { workspace: ws, onRerun: fn } });

        expect(fn).toHaveBeenCalledTimes(1);

        g1.activeViewId = 2;
        await tick();
        expect(fn).toHaveBeenCalledTimes(2);

        g1.size = 40;
        await tick();
        expect(fn).toHaveBeenCalledTimes(3);

        root.orientation = "vertical";
        await tick();
        expect(fn).toHaveBeenCalledTimes(4);

        g2.views.push(new VizView({ name: "D", id: 4 }));
        await tick();
        expect(fn).toHaveBeenCalledTimes(5);

        g1.setActive(1);
        await tick();
        expect(fn).toHaveBeenCalledTimes(6);

        ws.maximizedGroupId = g2.id;
        await tick();
        expect(fn).toHaveBeenCalledTimes(7);

        ws.activeGroupId = g2.id;
        await tick();
        expect(fn).toHaveBeenCalledTimes(8);

        unmount();
    });
});
