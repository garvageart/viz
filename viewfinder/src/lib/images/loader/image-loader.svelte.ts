import type { ImageAsset } from "@viz/api";

export interface ImageLoaderDeps {
    get lightboxImage(): ImageAsset | undefined;
    get overriddenImages(): Record<string, string>;
    get isCropping(): boolean;
    get currentZoom(): number;
    get imageToLoad(): string;
    resetZoom(): void;
    updateImageDimensions(): void;
    restoreCrop(): void;
}

export class ImageLoader {
    private deps: ImageLoaderDeps;

    zoomedImageURL = $state("");
    lastLoadedImageUid = $state("");
    initialImageLoaded = $state(false);
    loadState = $state<"loading" | "loaded" | "error">("loading");

    // Fetch Timing States
    fetchStartTime = $state<number | null>(null);
    fetchEndTime = $state<number | null>(null);
    fetchDuration = $state<number | null>(null);
    currentFetchURL = $state("");
    fetchType = $state<"initial" | "zoom_change" | "none">("none");

    constructor(deps: ImageLoaderDeps) {
        this.deps = deps;
    }

    get displayURL() {
        const uid = this.deps.lightboxImage?.uid;
        const isCropping = this.deps.isCropping;
        const overriddenImages = this.deps.overriddenImages;

        if (uid && overriddenImages[uid] && !isCropping) {
            return overriddenImages[uid];
        }

        if (this.zoomedImageURL && this.deps.currentZoom > 1 && !isCropping) {
            return this.zoomedImageURL;
        }

        return this.deps.imageToLoad;
    }

    reset(uid: string | undefined) {
        this.zoomedImageURL = "";
        this.initialImageLoaded = false;
        this.loadState = "loading";

        // Setup initial load tracking
        this.fetchStartTime = Date.now();
        this.fetchEndTime = null;
        this.fetchDuration = null;
        this.fetchType = uid ? "initial" : "none";
        this.currentFetchURL = uid ? this.deps.imageToLoad : "";

        if (!uid) {
            this.lastLoadedImageUid = "";
        }
    }

    handleLoad() {
        const uid = this.deps.lightboxImage?.uid;
        if (this.lastLoadedImageUid !== uid) {
            this.deps.resetZoom();
            this.lastLoadedImageUid = uid || "";
        }

        // Finalize fetch timing if it was the initial load
        if (this.fetchType === "initial") {
            this.fetchEndTime = Date.now();
            if (this.fetchStartTime) {
                this.fetchDuration = this.fetchEndTime - this.fetchStartTime;
            }
        }

        this.initialImageLoaded = true;
        this.loadState = "loaded";
        this.deps.updateImageDimensions();

        if (this.deps.isCropping) {
            this.deps.restoreCrop();
        }
    }

    handleError() {
        this.loadState = "error";
    }

    triggerZoomUpgrade(url: string) {
        this.fetchStartTime = Date.now();
        this.fetchEndTime = null;
        this.fetchDuration = null;
        this.fetchType = "zoom_change";
        this.currentFetchURL = url;
    }

    completeZoomUpgrade(url: string) {
        if (this.currentFetchURL === url && this.fetchType === "zoom_change") {
            this.fetchEndTime = Date.now();
            if (this.fetchStartTime) {
                this.fetchDuration = this.fetchEndTime - this.fetchStartTime;
            }

            if (this.deps.currentZoom > 1) {
                this.zoomedImageURL = url;
            }
        }
    }
}
