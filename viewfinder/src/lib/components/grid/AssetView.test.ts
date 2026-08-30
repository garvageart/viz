import { render } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import type { CardVisualState } from "$lib/types/snippet";
import AssetView from "./AssetView.svelte";

interface TestItem {
    uid: string;
    name: string;
}

const testData: TestItem[] = [
    { uid: "1", name: "Item 1" },
    { uid: "2", name: "Item 2" }
];

const dummyAssetSnippet = createRawSnippet<[{ uid: string } & Record<string, any>, CardVisualState]>((getArgs) => {
    const args = getArgs();
    const item = args[0];
    return {
        render: () => `<div data-testid="card">${item.uid}</div>`
    };
});

describe("AssetView", () => {
    it("renders grid container when type is 'grid'", () => {
        const { container } = render(AssetView, {
            data: testData,
            type: "grid",
            assetSnippet: dummyAssetSnippet
        });

        expect(container.querySelector(".viz-asset-grid-container")).toBeInTheDocument();
        expect(container.querySelector(".viz-asset-table-container")).not.toBeInTheDocument();
    });

    it("renders table container when type is 'list'", () => {
        const { container } = render(AssetView, {
            data: testData,
            type: "list",
            assetSnippet: dummyAssetSnippet
        });

        expect(container.querySelector(".viz-asset-table-container")).toBeInTheDocument();
        expect(container.querySelector(".viz-asset-grid-container")).not.toBeInTheDocument();
    });

    it("reacts when the type prop is updated", async () => {
        const { container, rerender } = render(AssetView, {
            data: testData,
            type: "grid",
            assetSnippet: dummyAssetSnippet
        });

        expect(container.querySelector(".viz-asset-grid-container")).toBeInTheDocument();

        await rerender({
            data: testData,
            type: "list",
            assetSnippet: dummyAssetSnippet
        });

        expect(container.querySelector(".viz-asset-table-container")).toBeInTheDocument();
        expect(container.querySelector(".viz-asset-grid-container")).not.toBeInTheDocument();
    });
});
