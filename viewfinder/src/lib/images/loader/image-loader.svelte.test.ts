import { describe, expect, it, vi } from "vitest";
import type { ImageAsset } from "@viz/api";
import { ImageLoader } from "./image-loader.svelte";

describe("ImageLoader", () => {
    function createMockDeps(overrides: Partial<{
        lightboxImage: ImageAsset | undefined;
        overriddenImages: Record<string, string>;
        isCropping: boolean;
        currentZoom: number;
        imageToLoad: string | undefined;
        resetZoom: () => void;
        updateImageDimensions: () => void;
    }> = {}) {
        const resetZoom = overrides.resetZoom || vi.fn();
        const updateImageDimensions = overrides.updateImageDimensions || vi.fn();

        const state: {
            lightboxImage: ImageAsset | undefined;
            overriddenImages: Record<string, string>;
            isCropping: boolean;
            currentZoom: number;
            imageToLoad: string | undefined;
            resetZoom: () => void;
            updateImageDimensions: () => void;
        } = {
            lightboxImage: overrides.lightboxImage ?? ({ uid: "img-123" } as ImageAsset),
            overriddenImages: overrides.overriddenImages ?? {},
            isCropping: overrides.isCropping ?? false,
            currentZoom: overrides.currentZoom ?? 1.0,
            imageToLoad: overrides.imageToLoad ?? "/api/images/img-123/full",
            resetZoom,
            updateImageDimensions
        };

        return {
            deps: {
                get lightboxImage() {
                    return state.lightboxImage;
                },
                get overriddenImages() {
                    return state.overriddenImages;
                },
                get isCropping() {
                    return state.isCropping;
                },
                get currentZoom() {
                    return state.currentZoom;
                },
                get imageToLoad() {
                    return state.imageToLoad;
                },
                resetZoom: state.resetZoom,
                updateImageDimensions: state.updateImageDimensions
            },
            state
        };
    }

    it("resolves displayURL with appropriate priority", () => {
        const { deps, state } = createMockDeps({
            lightboxImage: { uid: "img-1" } as ImageAsset,
            overriddenImages: { "img-1": "/overridden-preview.jpg" },
            isCropping: false,
            imageToLoad: "/default-image.jpg"
        });

        const loader = new ImageLoader(deps);

        // 1. Overridden preview has highest priority when not cropping
        expect(loader.displayURL).toBe("/overridden-preview.jpg");

        // 2. In crop mode, overridden preview is skipped, zoomedImageURL or imageToLoad used
        state.isCropping = true;
        expect(loader.displayURL).toBe("/default-image.jpg");

        // 3. Zoomed high-res URL is preferred over default imageToLoad, even when cropping
        loader.zoomedImageURL = "/zoomed-highres.jpg";
        expect(loader.displayURL).toBe("/zoomed-highres.jpg");

        // 4. Zoomed URL also retained when not cropping (if no crop preview override)
        state.overriddenImages = {};
        state.isCropping = false;
        expect(loader.displayURL).toBe("/zoomed-highres.jpg");

        // 5. Fallback to imageToLoad if zoomedImageURL is cleared
        loader.zoomedImageURL = "";
        expect(loader.displayURL).toBe("/default-image.jpg");

        // 6. Fallback to undefined if imageToLoad is undefined
        state.imageToLoad = undefined;
        expect(loader.displayURL).toBeUndefined();
    });

    it("resets state and initializes fetch timing", () => {
        const { deps } = createMockDeps({
            lightboxImage: { uid: "img-reset" } as ImageAsset,
            imageToLoad: "/image-reset.jpg"
        });

        const loader = new ImageLoader(deps);
        loader.zoomedImageURL = "/zoomed.jpg";
        loader.highestLoadedSize = 4000;
        loader.initialImageLoaded = true;
        loader.loadState = "loaded";

        loader.reset("img-reset");

        expect(loader.zoomedImageURL).toBe("");
        expect(loader.highestLoadedSize).toBe(0);
        expect(loader.initialImageLoaded).toBe(false);
        expect(loader.loadState).toBe("loading");
        expect(loader.fetchStartTime).not.toBeNull();
        expect(loader.fetchType).toBe("initial");
        expect(loader.currentFetchURL).toBe("/image-reset.jpg");

        // Reset with undefined UID
        loader.reset(undefined);
        expect(loader.fetchType).toBe("none");
        expect(loader.currentFetchURL).toBe("");
        expect(loader.lastLoadedImageUid).toBe("");
    });

    it("handles load lifecycle and only resets zoom when image UID changes", () => {
        const { deps, state } = createMockDeps({
            lightboxImage: { uid: "img-alpha" } as ImageAsset
        });

        const loader = new ImageLoader(deps);
        loader.reset("img-alpha");

        // First load for img-alpha -> should reset zoom because lastLoadedImageUid is empty
        loader.handleLoad(2000, 1500);

        expect(state.resetZoom).toHaveBeenCalledTimes(1);
        expect(loader.lastLoadedImageUid).toBe("img-alpha");
        expect(loader.highestLoadedSize).toBe(2000);
        expect(loader.initialImageLoaded).toBe(true);
        expect(loader.loadState).toBe("loaded");
        expect(loader.fetchDuration).not.toBeNull();
        expect(state.updateImageDimensions).toHaveBeenCalledTimes(1);

        // Second load for same img-alpha (e.g. high-res upgrade) -> must NOT reset zoom
        loader.handleLoad(4000, 3000);

        expect(state.resetZoom).toHaveBeenCalledTimes(1);
        expect(loader.highestLoadedSize).toBe(4000);
        expect(state.updateImageDimensions).toHaveBeenCalledTimes(2);

        // Switching image UID to img-beta -> should reset zoom on next load
        state.lightboxImage = { uid: "img-beta" } as ImageAsset;
        loader.reset("img-beta");
        loader.handleLoad(1920, 1080);

        expect(state.resetZoom).toHaveBeenCalledTimes(2);
        expect(loader.lastLoadedImageUid).toBe("img-beta");
    });

    it("handles error state correctly", () => {
        const { deps } = createMockDeps();
        const loader = new ImageLoader(deps);

        loader.handleError();
        expect(loader.loadState).toBe("error");
    });

    it("manages zoom upgrade lifecycle and timing", () => {
        const { deps } = createMockDeps();
        const loader = new ImageLoader(deps);

        const zoomUrl = "/api/images/img-123/full?size=4096";

        // Trigger zoom upgrade
        loader.triggerZoomUpgrade(zoomUrl);
        expect(loader.fetchType).toBe("zoom_change");
        expect(loader.currentFetchURL).toBe(zoomUrl);
        expect(loader.fetchStartTime).not.toBeNull();

        // Complete zoom upgrade with matching URL
        loader.completeZoomUpgrade(zoomUrl, 4096);
        expect(loader.zoomedImageURL).toBe(zoomUrl);
        expect(loader.highestLoadedSize).toBe(4096);
        expect(loader.fetchDuration).not.toBeNull();

        // Calling complete with mismatched URL should be ignored
        loader.triggerZoomUpgrade("/next-url.jpg");
        loader.completeZoomUpgrade("/stale-url.jpg", 8000);
        expect(loader.zoomedImageURL).toBe(zoomUrl);
        expect(loader.highestLoadedSize).toBe(4096);
    });
});
