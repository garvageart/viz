<script lang="ts">
    import { dev } from "$app/env";
    import { type ImageAsset, getAssetImagePath, updateImage } from "@viz/api";
    import { untrack } from "svelte";
    import type { MouseEventHandler } from "svelte/elements";
    import { slide } from "svelte/transition";
    import { hideAll } from "tippy.js";
    import CropOverlay from "#lib/components/image-tools/CropOverlay.svelte";
    import CropTools from "#lib/components/image-tools/CropTools.svelte";
    import { lightboxManager } from "#lib/components/lightbox/lightbox-manager.svelte.js";
    import Filmstrip from "#lib/components/panels/workspace/Filmstrip.svelte";
    import Button from "#lib/components/ui/Button.svelte";
    import StatusIndicator from "#lib/components/ui/StatusIndicator.svelte";
    import ExportPanel from "#lib/components/ui/panels/ExportPanel.svelte";
    import MetadataPanel from "#lib/components/ui/panels/MetadataPanel.svelte";
    import { ImageLoader } from "#lib/images/loader/image-loader.svelte.js";
    import type { ActiveCropLayout, CropRect } from "#lib/images/zoom/crop-utils.js";
    import { ImageZoomState } from "#lib/images/zoom/zoom-utils.svelte.js";
    import { KbdShortcutTier, KeybindAction, keyboardManager } from "#lib/keyboard/keyboard.svelte.js";
    import { settings } from "#lib/settings/client/settings.svelte.ts";
    import { isMobile } from "#lib/states/index.svelte.js";
    import { selectionManager } from "#lib/states/selection.svelte.js";
    import Pane from "#lib/third-party/svelte-splitpanes/Pane.svelte";
    import Splitpanes from "#lib/third-party/svelte-splitpanes/Splitpanes.svelte";
    import { toasts } from "#lib/toast-notifcations/toasts.svelte.js";
    import { downloadOriginalImageFile } from "#lib/utils/http.js";
    import { isAssetImage } from "#lib/utils/images.js";
    import AssetImage from "./AssetImage.svelte";
    import FloatingPanel from "./FloatingPanel.svelte";

    interface Props {
        id?: string;
        lightboxImage: ImageAsset;
        images?: ImageAsset[];
        show?: boolean;
        onClose?: () => void;
        prevLightboxImage?: () => void;
        nextLightboxImage?: () => void;
        onImageUpdated?: (image: ImageAsset) => void;
    }

    let {
        id,
        lightboxImage = $bindable(),
        images = [],
        show = $bindable(true),
        onClose,
        prevLightboxImage,
        nextLightboxImage,
        onImageUpdated
    }: Props = $props();

    function closeLightbox() {
        show = false;
        onClose?.();
        if (id) {
            lightboxManager.dismiss(id);
        } else {
            lightboxManager.pop();
        }
    }

    $effect(() => {
        if (show) {
            hideAll();
        }
    });

    let focusedAsset = $derived(isAssetImage(selectionManager.focusedItem) ? selectionManager.focusedItem : undefined);

    $effect(() => {
        if (focusedAsset && focusedAsset.uid !== lightboxImage.uid) {
            lightboxImage = focusedAsset;
        }
    });

    $effect(() => {
        if (!lightboxImage) {
            return;
        }

        const activeScope = selectionManager.getActiveScope();
        if (activeScope && activeScope.active?.uid !== lightboxImage.uid) {
            activeScope.select(lightboxImage);
        }
    });

    let imageToLoad = $derived(lightboxImage ? getAssetImagePath(lightboxImage, "preview") : undefined);

    // Element Bindings
    let imageEl = $state<HTMLImageElement>();
    let viewportEl = $state<HTMLDivElement>();
    let showImageStateDebugPanel = $state(false);
    let currentPreloadImg = $state<HTMLImageElement | null>(null);
    let lastImageUid = $state<string | undefined>(undefined);

    // Crop State
    let isCropping = $state(false);
    let cropAspectRatio = $state<number>();
    let currentCrop = $state<CropRect>({ x: 0, y: 0, width: 1, height: 1 });
    let cropMenuPosition = $state<{ x: number; y: number }>();

    let viewportDimensions = $state({ width: 0, height: 0 });
    const imageObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            viewportDimensions = {
                width: entry.contentRect.width,
                height: entry.contentRect.height
            };
        }
    });

    const zoomState = new ImageZoomState({
        getImageEl: () => imageEl,
        getContainerEl: () => viewportEl,
        getActiveCropDimensions: () => activeCropDimensions,
        getEffectiveWidthFraction: () => (activeCrop && activeCrop.width > 0 ? activeCrop.width : 1)
    });

    $effect(() => {
        const currentUid = lightboxImage.uid;
        if (currentUid !== lastImageUid) {
            zoomState.reset();
            lastImageUid = currentUid;
        }
    });

    $effect(() => {
        if (!viewportEl) {
            return;
        }

        imageObserver.observe(viewportEl);

        return () => {
            imageObserver.disconnect();
        };
    });

    let renderedImageDimensions = $derived.by(() => {
        if (!imageEl) {
            return { width: 0, height: 0 };
        }

        const nw = imageEl.naturalWidth;
        const nh = imageEl.naturalHeight;
        const cw = viewportDimensions.width;
        const ch = viewportDimensions.height;

        if (nw <= 0 || nh <= 0 || cw <= 0 || ch <= 0) {
            return { width: 0, height: 0 };
        }

        const imageAspect = nw / nh;
        const containerAspect = cw / ch;

        if (containerAspect > imageAspect) {
            return {
                width: ch * imageAspect,
                height: ch
            };
        } else {
            return {
                width: cw,
                height: cw / imageAspect
            };
        }
    });

    // Store crop edits (normalized 0..1 coordinates) to restore them when re-entering crop mode
    let cropEdits = $state<Record<string, CropRect>>({});

    let activeCrop = $derived.by(() => {
        if (!lightboxImage.uid || isCropping) {
            return null;
        }

        return cropEdits[lightboxImage.uid] || null;
    });

    let activeCropDimensions = $derived.by<ActiveCropLayout | undefined>(() => {
        if (!activeCrop || !imageEl) {
            return undefined;
        }

        const nw = imageEl.naturalWidth;
        const nh = imageEl.naturalHeight;
        const cw = viewportDimensions.width;
        const ch = viewportDimensions.height;

        if (nw <= 0 || nh <= 0 || cw <= 0 || ch <= 0) {
            return undefined;
        }

        if (activeCrop.width <= 0 || activeCrop.height <= 0) {
            return undefined;
        }

        const cropPixelWidth = nw * activeCrop.width;
        const cropPixelHeight = nh * activeCrop.height;
        const cropAspect = cropPixelWidth / cropPixelHeight;
        const containerAspect = cw / ch;

        let frameWidth: number;
        let frameHeight: number;

        if (containerAspect > cropAspect) {
            frameHeight = ch;
            frameWidth = ch * cropAspect;
        } else {
            frameWidth = cw;
            frameHeight = cw / cropAspect;
        }

        const imageWidth = frameWidth / activeCrop.width;
        const imageHeight = frameHeight / activeCrop.height;
        const offsetX = -(frameWidth * activeCrop.x) / activeCrop.width;
        const offsetY = -(frameHeight * activeCrop.y) / activeCrop.height;

        return {
            frame: {
                width: frameWidth,
                height: frameHeight
            },
            image: {
                width: imageWidth,
                height: imageHeight,
                offsetX,
                offsetY
            }
        };
    });

    let cropStyle = $derived.by(() => {
        if (!activeCropDimensions) {
            return undefined;
        }

        const { width, height, offsetX, offsetY } = activeCropDimensions.image;
        return `width: ${width.toFixed(2)}px !important; height: ${height.toFixed(2)}px !important; position: absolute !important; left: ${offsetX.toFixed(2)}px !important; top: ${offsetY.toFixed(2)}px !important; max-width: none !important; max-height: none !important;`;
    });

    function handleCropApply() {
        if (!currentCrop || !lightboxImage.uid) {
            return;
        }

        // TODO: replace once backend cropping is implemented
        cropEdits[lightboxImage.uid] = { ...currentCrop };

        toasts.add({
            type: "success",
            title: "Crop Applied",
            message: "Crop applied to view.",
            timeout: 4000
        });

        // Exit mode
        isCropping = false;
        currentCrop = { x: 0, y: 0, width: 1, height: 1 };
        cropMenuPosition = undefined;
    }

    function handleCropReset() {
        if (!lightboxImage.uid) {
            return;
        }

        delete cropEdits[lightboxImage.uid];
        currentCrop = {
            x: 0,
            y: 0,
            width: 1,
            height: 1
        };
        cropAspectRatio = undefined;
    }

    let overriddenImages = $state<Record<string, string>>({});

    const loader = new ImageLoader({
        get lightboxImage() {
            return lightboxImage;
        },
        get overriddenImages() {
            return overriddenImages;
        },
        get isCropping() {
            return isCropping;
        },
        get currentZoom() {
            return zoomState.value;
        },
        get imageToLoad() {
            return imageToLoad;
        },
        resetZoom() {
            zoomState.value = 1;
            zoomState.posX = 0;
            zoomState.posY = 0;
        },
        updateImageDimensions() {}
    });

    // Reset zoomed URL and load states when image changes or is closed
    let lastLoaderImageUid = $state<string | undefined>(undefined);

    $effect(() => {
        const uid = lightboxImage.uid;
        if (uid !== lastLoaderImageUid) {
            untrack(() => {
                loader.reset(uid);
            });
            lastLoaderImageUid = uid;
        }
    });

    $effect(() => {
        const currentImage = lightboxImage;
        if (!currentImage?.uid) {
            return;
        }

        const currentZoom = zoomState.value;
        const originalPath = currentImage.image_paths?.original;

        // Only trigger high-resolution zoom upgrade when actively zoomed to a considerable level (>= 2.0x)
        if (currentZoom < 2.0 || !originalPath) {
            return;
        }

        // Debounce the resolution upgrade so we don't spam requests during active zooming
        const timeoutId = setTimeout(() => {
            const viewportWidth = viewportDimensions.width || viewportEl?.clientWidth || 0;
            const viewportHeight = viewportDimensions.height || viewportEl?.clientHeight || 0;
            if (viewportWidth <= 0 || viewportHeight <= 0) {
                return;
            }

            const containerLongestEdge = Math.max(viewportWidth, viewportHeight);

            // Snap the zoom factor to discrete steps to prevent intermediate spammed requests during pinch/scroll
            const snappedZoom = currentZoom > 10.0 ? 16.0 : currentZoom > 5.0 ? 8.0 : currentZoom > 2.5 ? 4.0 : 2.0;

            const targetSize = Math.round(containerLongestEdge * snappedZoom);

            // Snap to the next multiple of 256px to maximize cache hits on resizes/monitor variances
            const snappedSize = Math.ceil(targetSize / 256) * 256;

            // Clamp to the image's original longest edge
            const originalLongestEdge = Math.max(currentImage.width || 0, currentImage.height || 0);
            const size = Math.min(originalLongestEdge, snappedSize);

            // Clamp to highest loaded resolution: do NOT fetch if target size is <= currently loaded resolution
            const loadedLongestEdge = Math.max(
                loader.highestLoadedSize,
                imageEl?.naturalWidth || 0,
                imageEl?.naturalHeight || 0
            );

            if (loadedLongestEdge > 0 && size <= loadedLongestEdge) {
                return;
            }

            // Request both w and h to let the backend scale the longest edge to `size`
            const transformParams = `?w=${size}&h=${size}&quality=90&format=webp`;
            const fullURL = getAssetImagePath(currentImage, "original", transformParams) || "";

            if (loader.zoomedImageURL === fullURL) {
                return;
            }

            loader.triggerZoomUpgrade(fullURL);

            // Load high-resolution image in background to avoid flicker
            const preloadImg = new Image();
            currentPreloadImg = preloadImg;
            preloadImg.onload = () => {
                const loadedSize = Math.max(preloadImg.naturalWidth || 0, preloadImg.naturalHeight || 0) || size;
                loader.completeZoomUpgrade(fullURL, loadedSize);
                currentPreloadImg = null;
            };
            preloadImg.onerror = () => {
                currentPreloadImg = null;
            };
            preloadImg.src = fullURL;
        }, 300);

        return () => {
            clearTimeout(timeoutId);
            // Abort any pending preload
            if (currentPreloadImg) {
                currentPreloadImg.src = "";
                currentPreloadImg.remove();
            }
        };
    });

    // Lightbox view state
    const lightboxState = settings.get("imageLightbox");

    // 🫨🫨🫨🫨🫨
    let lightboxMainSnippets = $derived(
        lightboxState.filmstrip.visible
            ? lightboxState.filmstrip.position === "bottom"
                ? [imagePane, filmstripPane]
                : [filmstripPane, imagePane]
            : [imagePane]
    );

    function goToPrev() {
        if (isCropping) {
            return;
        }

        if (prevLightboxImage) {
            prevLightboxImage();
            return;
        }

        if (images.length > 0) {
            const idx = images.findIndex((i) => i.uid === lightboxImage.uid);
            if (idx !== -1) {
                const nextIdx = (idx - 1 + images.length) % images.length;
                const nextImage = images[nextIdx];
                lightboxImage = nextImage;
                const activeScope = selectionManager.getActiveScope();
                activeScope?.select(nextImage);
            }
        }
    }

    function goToNext() {
        if (isCropping) {
            return;
        }

        if (nextLightboxImage) {
            nextLightboxImage();
            return;
        }

        if (images.length > 0) {
            const idx = images.findIndex((i) => i.uid === lightboxImage.uid);
            if (idx !== -1) {
                const nextIdx = (idx + 1) % images.length;
                const nextImage = images[nextIdx];
                lightboxImage = nextImage;
                const activeScope = selectionManager.getActiveScope();
                activeScope?.select(nextImage);
            }
        }
    }

    function restoreCrop() {
        const saved = lightboxImage.uid ? cropEdits[lightboxImage.uid] : undefined;
        if (saved) {
            currentCrop = { ...saved };
        } else {
            currentCrop = {
                x: 0,
                y: 0,
                width: 1,
                height: 1
            };
        }
    }

    function toggleCropMode() {
        if (!isCropping) {
            isCropping = true;
            restoreCrop();
        } else {
            isCropping = false;
            cropMenuPosition = undefined;
        }
    }

    function handleContainerClick() {
        if (isCropping && cropMenuPosition) {
            // Close floating crop menu if open, otherwise do not exit crop mode
            cropMenuPosition = undefined;
        }
    }

    function handleAspectRatioChange(ratio: number | "original" | undefined) {
        if (!imageEl) {
            return;
        }

        const naturalW = imageEl.naturalWidth || 1;
        const naturalH = imageEl.naturalHeight || 1;
        const imageAspect = naturalW / naturalH;

        let targetRatio: number | undefined;
        if (ratio === "original") {
            targetRatio = imageAspect;
        } else {
            targetRatio = ratio;
        }

        cropAspectRatio = targetRatio;

        if (targetRatio) {
            const normRatio = targetRatio / imageAspect;
            let newWidth = currentCrop.width;
            let newHeight = newWidth / normRatio;

            if (newHeight > 1) {
                newHeight = 1;
                newWidth = newHeight * normRatio;
            }
            if (newWidth > 1) {
                newWidth = 1;
                newHeight = newWidth / normRatio;
            }

            const dx = (currentCrop.width - newWidth) / 2;
            const dy = (currentCrop.height - newHeight) / 2;

            currentCrop = {
                x: Math.max(0, Math.min(1 - newWidth, currentCrop.x + dx)),
                y: Math.max(0, Math.min(1 - newHeight, currentCrop.y + dy)),
                width: newWidth,
                height: newHeight
            };
        }
    }
    const handleContextMenu: MouseEventHandler<HTMLElement> = (e) => {
        if (isCropping) {
            e.preventDefault();
            cropMenuPosition = { x: e.clientX, y: e.clientY };
        }
    };

    let statusIndicator: ReturnType<typeof StatusIndicator> | undefined = $state();

    function handleWheel(event: WheelEvent) {
        zoomState.handleWheel(event);
        if (!zoomState.isAtFit) {
            statusIndicator?.showStatusIndicator(`Zoom: ${zoomState.nativeZoomPercentage}%`);
        }
    }

    function handleDoubleClick(event: MouseEvent) {
        zoomState.handleDoubleClick(event);
        if (!zoomState.isAtFit) {
            statusIndicator?.showStatusIndicator(`Zoom: ${zoomState.nativeZoomPercentage}%`);
        }
    }

    $effect(() => {
        if (!isCropping) {
            return;
        }

        const unregisterEscape = keyboardManager.registerEscape({
            tier: KbdShortcutTier.Transient,
            handler: () => {
                toggleCropMode();
            }
        });

        return unregisterEscape;
    });

    $effect(() => {
        if (!show) {
            return;
        }

        const scope = keyboardManager.scope("lightbox");

        scope.register([
            {
                action: KeybindAction.LightboxNavigate,
                handler: (_e, handler) => {
                    if (isCropping) {
                        return;
                    }

                    if (handler.key === "left") {
                        goToPrev();
                    } else if (handler.key === "right") {
                        goToNext();
                    }
                }
            },
            {
                action: KeybindAction.ApplyCrop,
                handler: () => {
                    if (!isCropping) {
                        return;
                    }

                    handleCropApply();
                }
            }
        ]);

        scope.registerEscape({
            action: KeybindAction.LightboxClose,
            tier: KbdShortcutTier.Overlay,
            handler: () => {
                if (isCropping) {
                    toggleCropMode();
                    return;
                }

                closeLightbox();
            }
        });

        return scope.destroy;
    });
</script>

<!--
  @component ImageLightbox
  
  Core reminder for myself and everyone:
  At the fundamental core of this component, its primary role is to load and display an image's data and 
  the image itself cleanly, immediately, and accurately within the viewport.
  
  All additional features and behaviors—such as zoom, panning, crop mode, photo editing, metadata sidebars, 
  or action overlays—are secondary layers built strictly ON TOP of this base display. This idea is the foundation. 
  
  No future feature, edit tool, state calculation, or overlay logic must interfere with, delay, 
  or distort the underlying core principle of displaying the base image cleanly and instantly upon loading 
  or navigation. Base 1x viewing relies on clean native CSS bounds (max-width: 100%, max-height: 100%, object-fit: contain).
-->

{#snippet zoomStateDebug()}
    <div class="lightbox-debug-panel">
        <h3>Zoom & Loader State</h3>
        <div class="debug-grid">
            <span class="debug-label">Initial Load:</span>
            <span class="debug-val" class:loaded={loader.initialImageLoaded}>
                {loader.initialImageLoaded ? "Loaded" : "Loading"}
            </span>

            <span class="debug-label">Load State:</span>
            <span
                class="debug-val"
                class:loaded-state={loader.loadState === "loaded"}
                class:loading-state={loader.loadState === "loading"}
                class:error-state={loader.loadState === "error"}
            >
                {loader.loadState}
            </span>

            <span class="debug-label">UID:</span>
            <span class="debug-val mono">
                {lightboxImage.uid || "none"}
            </span>

            <span class="debug-label">Last UID:</span>
            <span class="debug-val mono">
                {loader.lastLoadedImageUid || "none"}
            </span>

            <span class="debug-label">Current Zoom:</span>
            <span class="debug-val">
                {zoomState.value.toFixed(4)}x ({Math.round(zoomState.value * 100)}%)
            </span>

            <span class="debug-label">Coords:</span>
            <span class="debug-val mono">
                X: {Math.round(zoomState.posX)}px, Y: {Math.round(zoomState.posY)}px
            </span>

            <span class="debug-label">Display URL:</span>
            <span class="debug-val url" title={loader.displayURL}>
                {loader.displayURL ? loader.displayURL.substring(loader.displayURL.lastIndexOf("/") + 1) : "none"}
            </span>

            <span class="debug-label">Zoomed URL:</span>
            <span class="debug-val url" title={loader.zoomedImageURL}>
                {loader.zoomedImageURL
                    ? loader.zoomedImageURL.substring(loader.zoomedImageURL.lastIndexOf("/") + 1)
                    : "none"}
            </span>

            <span class="debug-label">Highest Loaded:</span>
            <span class="debug-val mono">
                {loader.highestLoadedSize > 0 ? `${loader.highestLoadedSize}px` : "none"}
            </span>

            <span class="debug-label">Fetch Type:</span>
            <span class="debug-val mono">
                {loader.fetchType}
            </span>

            <span class="debug-label">Fetch Status:</span>
            <span
                class="debug-val"
                class:loaded-state={loader.fetchEndTime !== null}
                class:loading-state={loader.fetchStartTime !== null && loader.fetchEndTime === null}
            >
                {loader.fetchEndTime !== null
                    ? `Completed (${loader.fetchDuration}ms)`
                    : loader.fetchStartTime !== null
                      ? "Pending"
                      : "Idle"}
            </span>

            <span class="debug-label">Fetch URL:</span>
            <span class="debug-val url" title={loader.currentFetchURL}>
                {loader.currentFetchURL
                    ? loader.currentFetchURL.substring(loader.currentFetchURL.lastIndexOf("/") + 1)
                    : "none"}
            </span>
        </div>
    </div>
{/snippet}

{#snippet imagePane()}
    <Pane minSize={20}>
        <div
            class="image-viewport"
            class:can-pan={zoomState.canPan}
            class:is-panning={zoomState.isDragging}
            bind:this={viewportEl}
            role="presentation"
            onwheel={handleWheel}
            ondblclick={handleDoubleClick}
            onpointerdown={zoomState.handlePointerDown}
            onpointermove={zoomState.handlePointerMove}
            onpointerup={zoomState.handlePointerUp}
            onpointercancel={zoomState.handlePointerUp}
            onclick={(e) => {
                if (zoomState.wasDragging) {
                    return;
                }
                // Only close on clicking the viewport background or stage target, not on image or buttons
                if (
                    e.target === e.currentTarget ||
                    (e.target as HTMLElement)?.classList.contains("image-viewport") ||
                    (e.target as HTMLElement)?.classList.contains("image-stage")
                ) {
                    handleContainerClick();
                }
            }}
        >
            {#if dev && showImageStateDebugPanel}
                {@render zoomStateDebug()}
            {/if}
            <div
                class="lightbox-header-bar"
                role="toolbar"
                aria-label="Lightbox toolbar"
                tabindex={0}
                onpointerdown={(e) => e.stopPropagation()}
            >
                <div class="lightbox-header-left">
                    <Button
                        id="lightbox-icon-close"
                        class="lightbox-button-icon"
                        title="Close"
                        iconName="close"
                        onclick={() => {
                            if (isCropping) {
                                toggleCropMode();
                            } else {
                                closeLightbox();
                            }
                        }}
                    />
                    {#if !isCropping}
                        <span class="lightbox-image-name" title={lightboxImage.name}>
                            {lightboxImage.name}
                        </span>
                    {/if}
                </div>
                <div class="image-icon-buttons">
                    {#if lightboxState.filmstrip.visible}
                        <Button
                            id="act-move-filmstrip"
                            class="lightbox-button-icon"
                            title="Move Filmstrip"
                            iconName={lightboxState.filmstrip.position === "bottom"
                                ? "bottom_panel_open"
                                : "left_panel_open"}
                            onclick={() => {
                                lightboxState.filmstrip.position =
                                    lightboxState.filmstrip.position === "bottom" ? "side" : "bottom";
                            }}
                        />
                    {/if}
                    <Button
                        id="act-expand-lightbox"
                        class="lightbox-button-icon"
                        title="Toggle Filmstrip"
                        iconName="view_sidebar"
                        // i didn't like that the "sidebar" part of the icon was showing the wrong side
                        style="transform: rotateY(180deg);"
                        onclick={() => {
                            lightboxState.filmstrip.visible = !lightboxState.filmstrip.visible;
                        }}
                    />
                    <div class="image-icon-button-separator"></div>
                    {#if !isCropping}
                        {#if dev}
                            <Button
                                class="lightbox-button-icon"
                                title="Toggle Zoom & Image State Debug"
                                iconName="report"
                                onclick={() => {
                                    showImageStateDebugPanel = !showImageStateDebugPanel;
                                }}
                            />
                        {/if}
                        <Button
                            class="lightbox-button-icon {lightboxImage.favourited ? 'favourited' : ''}"
                            title={lightboxImage.favourited ? "Unfavourite" : "Favourite"}
                            iconName="star"
                            fill={lightboxImage.favourited}
                            onclick={async () => {
                                if (!lightboxImage) {
                                    return;
                                }

                                const newFav = !lightboxImage.favourited;
                                try {
                                    await updateImage(lightboxImage.uid, { favourited: newFav });
                                } catch (err) {
                                    toasts.add({
                                        type: "error",
                                        message: `Failed to update favourite status: ${err}`
                                    });
                                }
                            }}
                        />
                        <Button
                            id="act-crop"
                            class="lightbox-button-icon"
                            title="Crop"
                            iconName="crop"
                            onclick={toggleCropMode}
                        />
                        <Button
                            class="lightbox-button-icon"
                            title="Download Original"
                            iconName="download"
                            onclick={() => {
                                downloadOriginalImageFile(lightboxImage);
                            }}
                        />
                        <Button
                            class="lightbox-button-icon"
                            title="Export"
                            iconName="ios_share"
                            onclick={(e) => {
                                e.stopPropagation();

                                lightboxManager
                                    .open(ExportPanel, {
                                        assets: [lightboxImage]
                                    })
                                    .then(() => {
                                        closeLightbox();
                                    });
                            }}
                        />
                    {/if}
                    <Button
                        id="lightbox-toggle-info"
                        class="lightbox-button-icon"
                        // TODO: Make i18n safe
                        title={`${lightboxState.sidePanel.visible ? "Hide" : "Show"} Info`}
                        onclick={(e) => {
                            e.stopPropagation();
                            lightboxState.sidePanel.visible = !lightboxState.sidePanel.visible;
                        }}
                        iconName="info"
                    />
                </div>
            </div>
            <div
                class="image-stage"
                class:has-crop={!!activeCrop}
                class:can-pan={zoomState.canPan}
                class:is-panning={zoomState.isDragging}
                data-zoom={zoomState.value}
                data-pos-x={zoomState.posX}
                data-pos-y={zoomState.posY}
                oncontextmenu={handleContextMenu}
                role="presentation"
                style="{activeCropDimensions
                    ? `width: ${activeCropDimensions.frame.width.toFixed(2)}px; height: ${activeCropDimensions.frame.height.toFixed(2)}px;`
                    : ''} transform: translate({zoomState.posX}px, {zoomState.posY}px) scale({zoomState.value}); transform-origin: center center;"
            >
                <AssetImage
                    naked={true}
                    bind:imageElement={imageEl}
                    asset={lightboxImage}
                    objectFit="contain"
                    priority={true}
                    placeholder="none"
                    src={loader.displayURL}
                    class="lightbox-image main {isCropping ? 'is-crop' : ''}"
                    style={cropStyle}
                    crossorigin="use-credentials"
                    data-image-id={lightboxImage.uid}
                    onload={() => {
                        loader.handleLoad(imageEl?.naturalWidth, imageEl?.naturalHeight);
                    }}
                    onerror={() => loader.handleError()}
                    ondragstart={(e) => e.preventDefault()}
                    oncontextmenu={handleContextMenu}
                />

                {#if isCropping && renderedImageDimensions.width > 0 && renderedImageDimensions.height > 0}
                    <CropOverlay
                        width={renderedImageDimensions.width}
                        height={renderedImageDimensions.height}
                        bind:crop={currentCrop}
                        scale={zoomState.value}
                        aspectRatio={cropAspectRatio}
                    />
                {/if}
            </div>

            <!-- TODO: Change this to a general action status indicator to support all actions -->
            <!-- e.g. "Date Change: 11-06-2026, 20:42:01" -->
            <div class="status-indicator-container">
                <StatusIndicator bind:this={statusIndicator} />
            </div>

            {#if (images.length > 1 || (prevLightboxImage && nextLightboxImage)) && !isCropping}
                <div
                    class="lightbox-nav"
                    role="toolbar"
                    aria-label="Lightbox navigation"
                    tabindex={0}
                    onpointerdown={(e) => e.stopPropagation()}
                >
                    <Button
                        iconName="arrow_back"
                        class="lightbox-nav-btn prev lightbox-button-icon"
                        title="Previous image"
                        onclick={(e) => {
                            e.stopPropagation();
                            goToPrev();
                        }}
                    />
                    <Button
                        iconName="arrow_forward"
                        class="lightbox-nav-btn next lightbox-button-icon"
                        title="Next image"
                        onclick={(e) => {
                            e.stopPropagation();
                            goToNext();
                        }}
                    />
                </div>
            {/if}
            {#if isCropping && cropMenuPosition}
                <FloatingPanel x={cropMenuPosition.x} y={cropMenuPosition.y}>
                    <CropTools
                        onApply={handleCropApply}
                        onReset={handleCropReset}
                        onCancel={() => {
                            cropMenuPosition = undefined;
                        }}
                        onAspectRatioChange={handleAspectRatioChange}
                    />
                </FloatingPanel>
            {/if}
        </div>
    </Pane>
{/snippet}

{#snippet filmstripPane()}
    <Pane
        size={lightboxState.filmstrip.position === "bottom" ? 20 : 15}
        minSize={lightboxState.filmstrip.position === "bottom" ? 20 : 15}
    >
        <div class="lightbox-filmstrip-container" class:side={lightboxState.filmstrip.position === "side"}>
            <Filmstrip />
        </div>
    </Pane>
{/snippet}

<div
    class="lightbox-layout"
    role="presentation"
    onclick={() => {
        if (zoomState.wasDragging) {
            return;
        }
        handleContainerClick();
    }}
>
    <Splitpanes id="image-lightbox-splitpanes" class="image-lightbox-splitpanes">
        <Pane>
            <div
                class="lightbox-main"
                class:filmstrip-side={lightboxState.filmstrip.position === "side"}
                onclick={(e) => {
                    if (zoomState.wasDragging) {
                        // e.stopPropagation();
                        return;
                    }

                    // Only handle clicks on the container background (not on buttons or image)
                    if (e.currentTarget === viewportEl) {
                        handleContainerClick();
                    }
                }}
                role="presentation"
            >
                <Splitpanes
                    id="image-lightbox-main-splitpanes"
                    class="image-lightbox-main-splitpanes"
                    horizontal={lightboxState.filmstrip.position === "bottom"}
                    rtl={lightboxState.filmstrip.position === "bottom"}
                    swapPaneOrder={true}
                >
                    {#each lightboxMainSnippets as ls (ls)}
                        {@render ls()}
                    {/each}
                </Splitpanes>
            </div>
        </Pane>

        {#if lightboxState.sidePanel.visible}
            <Pane size={20}>
                <div class="side-panel" class:crop-mode={isCropping} transition:slide={{ axis: "x" }}>
                    {#if isCropping}
                        <CropTools
                            onApply={handleCropApply}
                            onReset={handleCropReset}
                            onCancel={() => {
                                toggleCropMode();
                            }}
                            onAspectRatioChange={handleAspectRatioChange}
                        />
                    {:else}
                        <MetadataPanel asset={lightboxImage} showCloseIcon={isMobile} {onImageUpdated} />
                    {/if}
                </div>
            </Pane>
        {/if}
    </Splitpanes>
</div>

<style lang="scss">
    .lightbox-layout {
        position: relative;
        display: flex;
        align-items: center;
        height: 100%;
        width: 100%;
    }

    /* gosh */
    :global(#image-lightbox-splitpanes > .splitpanes__pane),
    :global(#image-lightbox-main-splitpanes > .splitpanes__pane) {
        background: transparent !important;
    }

    .lightbox-main {
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: center;
        flex: 1 1 0%;
        min-width: 0;
        height: 100%;

        &.filmstrip-side {
            flex-direction: row-reverse;
        }
    }

    .lightbox-header-bar {
        position: absolute;
        top: 1em;
        left: 1em;
        right: 1em;
        z-index: 200;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--viz-spacing-md);
    }

    .lightbox-header-left {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-sm);
        min-width: 0;
        flex: 0 1 auto;
    }

    :global(#lightbox-icon-close) {
        position: relative;
        top: auto;
        left: auto;
        flex-shrink: 0;
    }

    .lightbox-image-name {
        font-family: var(--viz-display-font);
        font-size: var(--viz-font-size-xl);
        font-weight: 600;
        color: var(--viz-10-dark);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        min-width: 0;
        flex: 0 1 auto;
        filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.9));
        -webkit-filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.9));
        user-select: text;
    }

    :global(.image-icon-buttons) {
        display: flex;
        align-items: center;
        gap: 0.5em;
        height: stretch;
        flex-shrink: 0;
        margin-left: auto;
        box-sizing: border-box;
    }

    .image-icon-button-separator {
        width: 1px;
        background-color: var(--viz-border-subtle);
        margin: 0 var(--viz-spacing-xxs);
        flex-shrink: 0;
        height: 80%;
    }

    :global(.lightbox-button-icon) {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: var(--viz-spacing-sm);
        font-size: var(--viz-font-size-lg);
        background: transparent !important;
        border: none;
        opacity: 1;
        transition: opacity 150ms ease;

        :global(span) {
            color: var(--viz-10-dark) !important;
            fill: var(--viz-10-dark) !important;
        }

        filter: drop-shadow(0 8px 22px rgba(0, 0, 0, 1)) drop-shadow(0 2px 6px rgba(0, 0, 0, 1))
            drop-shadow(0 2px 6px rgba(0, 0, 0, 0.1));
        -webkit-filter: drop-shadow(0 8px 22px rgba(0, 0, 0, 1)) drop-shadow(0 2px 6px rgba(0, 0, 0, 1))
            drop-shadow(0 2px 6px rgba(0, 0, 0, 0.1));
        will-change: filter, opacity;
    }

    :global(.lightbox-button-icon:hover:not(:disabled)) {
        background-color: transparent !important;
        border-color: transparent !important;
        box-shadow: none !important;
        opacity: 0.75 !important;
    }

    .image-viewport {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
        width: 100%;
        overflow: hidden;
        box-sizing: border-box;

        &.can-pan {
            cursor: grab;
        }

        &.is-panning {
            cursor: grabbing;
        }
    }

    .lightbox-filmstrip-container {
        width: 100%;
        height: 100%;
        background-color: var(--viz-surface-panel);
    }

    .image-stage {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        max-width: 100%;
        max-height: 100%;
        width: 100%;
        height: 100%;

        &.has-crop {
            overflow: hidden !important;
            position: relative !important;
        }
    }

    :global {
        .lightbox-image {
            display: block;
            max-width: 100% !important;
            max-height: 100% !important;
            width: auto !important;
            height: auto !important;
            object-fit: contain !important;

            &.placeholder {
                position: absolute;
                z-index: 1;
                opacity: 1;
                transition: opacity 0.3s ease-in-out;
                image-rendering: auto;

                &.loaded,
                &.hidden {
                    opacity: 0;
                }
            }

            &.main {
                position: relative;
                z-index: 2;
                transition: opacity 0.3s ease-in-out;
                max-width: 100% !important;
                max-height: 100% !important;
                width: auto !important;
                height: auto !important;
                object-fit: contain !important;

                &.hidden-main {
                    opacity: 0;
                }
            }
        }
    }

    .lightbox-nav {
        gap: var(--viz-spacing-md);
        position: absolute;
        top: 50%;
        right: 2em;
        display: flex;
        flex-direction: column;
        transform: translateY(-50%);
    }

    :global(.lightbox-nav-btn) {
        border: none;
        color: var(--viz-text-primary);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    }

    :global(.exif-material-icon) {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
        vertical-align: middle;
        font-size: 1.5em;
    }

    .status-indicator-container {
        position: absolute;
        bottom: 10%;
    }

    .side-panel {
        background-color: var(--viz-surface-panel);
        height: 100%;
        width: auto;
        box-sizing: border-box;
        overflow-y: auto;

        &.crop-mode {
            padding: var(--viz-spacing-std);
        }
    }

    .lightbox-debug-panel {
        position: absolute;
        top: 5%;
        left: var(--viz-spacing-std);
        background: var(--viz-surface-card);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        padding: var(--viz-spacing-md);
        z-index: 100;
        font-family: var(--viz-mono-font);
        font-size: var(--viz-font-size-std);
        color: var(--viz-text-primary);
        max-width: 20rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);

        h3 {
            margin: 0 0 var(--viz-spacing-sm) 0;
            font-size: var(--viz-font-size-lg);
            font-weight: 600;
            border-bottom: var(--viz-border-thin);
            padding-bottom: var(--viz-spacing-xs);
        }

        .debug-grid {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: var(--viz-spacing-xs) var(--viz-spacing-sm);
        }

        .debug-val {
            font-weight: 600;
            word-break: break-all;

            &.loaded,
            &.loaded-state {
                color: var(--viz-success-color);
            }

            &.loading-state {
                color: var(--viz-info-color);
            }

            &.error-state {
                color: var(--viz-error-color);
            }
        }
    }
</style>
