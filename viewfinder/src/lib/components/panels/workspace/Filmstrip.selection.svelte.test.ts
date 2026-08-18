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
});
