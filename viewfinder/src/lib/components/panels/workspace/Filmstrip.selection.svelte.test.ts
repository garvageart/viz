import { fireEvent, render, screen } from "@testing-library/svelte";
import type { ImageAsset } from "@viz/api";
import { describe, expect, it, vi } from "vitest";
import Filmstrip from "$lib/components/panels/workspace/Filmstrip.svelte";
import MetadataPanel from "$lib/components/ui/panels/MetadataPanel.svelte";
import { SelectionScopeNames, selectionManager } from "$lib/states/selection.svelte";

vi.mock("$app/state", () => ({
    page: { data: undefined, url: { pathname: "/" } }
}));

vi.mock("$lib/components/ui/ImageLightbox.svelte", () => ({
    default: () => ({})
}));

const makeImage = (uid: string, name: string): ImageAsset =>
    ({
        uid,
        name,
        taken_at: "2024-01-02T03:04:05.000Z",
        created_at: "2024-01-01T00:00:00.000Z",
        image_metadata: {},
        image_paths: {
            preview: `/preview/${uid}`,
            thumbnail: `/thumbnail/${uid}`,
            original: `/original/${uid}`
        },
        exif: {},
        width: 100,
        height: 100
    }) as unknown as ImageAsset;

describe("filmstrip selection -> metadata panel", () => {
    it("metadata updates when a filmstrip item is clicked", async () => {
        const scopeId = `${SelectionScopeNames.FILMSTRIP_COLLECTION_PREFIX}colA`;
        selectionManager.setActive(scopeId);
        const scope = selectionManager.getScope<ImageAsset>(scopeId);
        const a = makeImage("a", "Strip A");
        const b = makeImage("b", "Strip B");
        scope.setSource([a, b]);
        scope.select(a);

        render(MetadataPanel, {});
        render(Filmstrip, {});

        const metadata = document.querySelector(".metadata-editor");
        expect(metadata?.textContent).toContain("Strip A");

        await fireEvent.click(screen.getByLabelText("Select image Strip B"));

        expect(metadata?.textContent).toContain("Strip B");
        expect(metadata?.textContent).not.toContain("Strip A");
    });

    it("re-resolves the active scope when the active scope is removed (no stale cache)", async () => {
        const scopeId = `${SelectionScopeNames.FILMSTRIP_COLLECTION_PREFIX}stale`;
        selectionManager.setActive(scopeId);
        const scope = selectionManager.getScope<ImageAsset>(scopeId);
        const a = makeImage("a", "Stale A");
        scope.setSource([a]);
        scope.select(a);

        render(MetadataPanel, {});

        const metadata = document.querySelector(".metadata-editor");
        expect(metadata?.textContent).toContain("Stale A");

        // Simulate the collections list page dropping the scope while it is
        // still the active one. The panel must fall back to the global scope
        // rather than keep rendering a removed scope's item.
        selectionManager.removeScope(scopeId);
        await Promise.resolve();

        expect(metadata?.textContent).not.toContain("Stale A");
    });

    it("renders all multi-selected items with selected class and marks lead item as active", async () => {
        const scopeId = `${SelectionScopeNames.COLLECTION_PREFIX}colMulti`;
        selectionManager.setActive(scopeId);
        const scope = selectionManager.getScope<ImageAsset>(scopeId);
        const img1 = makeImage("1", "Image 1");
        const img2 = makeImage("2", "Image 2");
        const img3 = makeImage("3", "Image 3");
        scope.setSource([img1, img2, img3]);

        // Select all 3 items, with img3 as the active (lead) item
        scope.selectRange(img3, img1);

        const { container } = render(Filmstrip, {});

        const items = container.querySelectorAll<HTMLButtonElement>(".filmstrip-item");
        expect(items.length).toBe(3);

        for (const item of items) {
            expect(item.classList.contains("selected")).toBe(true);
            expect(item.getAttribute("aria-pressed")).toBe("true");
        }

        expect(items[0].classList.contains("active")).toBe(false);
        expect(items[1].classList.contains("active")).toBe(false);
        expect(items[2].classList.contains("active")).toBe(true);
    });
});
