import { fireEvent, render } from "@testing-library/svelte";
import type { ImageAsset } from "@viz/api";
import { createRawSnippet } from "svelte";
import { describe, expect, it, vi } from "vitest";
import { createTestImageObject } from "$lib/data/test";
import type { CardVisualState } from "$lib/types/snippet";
import AssetView from "./AssetView.svelte";

const testData: ImageAsset[] = [createTestImageObject(), createTestImageObject(), createTestImageObject()];

const dummyAssetSnippet = createRawSnippet<[{ uid: string } & Record<string, ImageAsset>, CardVisualState]>(
    (getArgs) => {
        const args = getArgs();
        const item = args[0];
        return {
            render: () => `<div data-testid="card">${item?.uid ?? ""}</div>`
        };
    }
);

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

    it("does not range-select items when navigating backward with Shift+Tab", async () => {
        vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1000);

        const { container } = render(AssetView, {
            data: testData,
            type: "grid",
            assetSnippet: dummyAssetSnippet
        });

        const cards = container.querySelectorAll("[data-asset-id]");
        expect(cards.length).toBe(3);

        // Click second card to select it
        await fireEvent.click(cards[1]);
        expect(cards[1].className).toContain("selected-card");
        expect(cards[0].className).not.toContain("selected-card");

        // Press Shift+Tab on second card to navigate backward
        await fireEvent.keyDown(cards[1], { key: "Tab", shiftKey: true });

        // First card should now be selected alone (not range-selected with second card)
        expect(cards[0].className).toContain("selected-card");
        expect(cards[1].className).not.toContain("selected-card");
    });
});
