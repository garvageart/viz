import SplitpanesTestFixture from "#lib/third-party/svelte-splitpanes/tests/SplitpanesTestFixture.svelte";
import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";

describe("Splitpanes", () => {
    it("does not render a splitter before the first pane", () => {
        const { container } = render(SplitpanesTestFixture);
        const splitpanes = container.querySelector(".splitpanes");

        expect(splitpanes).not.toBeNull();

        const children = Array.from(splitpanes!.children);
        expect(children).toHaveLength(3);
        expect(children[0]).toHaveClass("splitpanes__pane");
        expect(children[1]).toHaveClass("splitpanes__splitter");
        expect(children[2]).toHaveClass("splitpanes__pane");
    });
});
