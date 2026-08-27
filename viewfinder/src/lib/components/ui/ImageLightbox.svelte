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
<script lang="ts">
    import { dev } from "$app/environment";
    import { type ImageAsset, getAssetImagePath, updateImage } from "@viz/api";
    import hotkeys, { type HotkeysEvent } from "hotkeys-js";
    import { onMount, untrack } from "svelte";
    import type { MouseEventHandler, PointerEventHandler, WheelEventHandler } from "svelte/elements";
    import { slide } from "svelte/transition";
    import { hideAll } from "tippy.js";
    import { modalsManager } from "$lib/components/modals/manager/ModalManager.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import ExportPanel, { modalOptions as exportModalOptions } from "$lib/components/ui/panels/ExportPanel.svelte";
    import MetadataPanel from "$lib/components/ui/panels/MetadataPanel.svelte";
    import { ImageLoader } from "$lib/images/loader/image-loader.svelte";
    import { ImageZoomState, calculateZoomTo, constrainTranslation } from "$lib/images/zoom/zoom-utils.svelte";
    import { isMobile } from "$lib/states/index.svelte";
    import { toasts } from "$lib/toast-notifcations/toasts.svelte";
    import { downloadOriginalImageFile } from "$lib/utils/http";
    import { type CropCoords } from "$lib/utils/images";
    import CropOverlay from "../image-tools/CropOverlay.svelte";
    import CropTools from "../image-tools/CropTools.svelte";
    import AssetImage from "./AssetImage.svelte";
    import Lightbox from "./Lightbox.svelte";

    interface Props {
        lightboxImage: ImageAsset | undefined;
        prevLightboxImage?: () => void;
        nextLightboxImage?: () => void;
        onImageUpdated?: (image: ImageAsset) => void;
    }

    let { lightboxImage = $bindable(), prevLightboxImage, nextLightboxImage, onImageUpdated }: Props = $props();

    let show = $derived(lightboxImage !== undefined);

    $effect(() => {
        if (show) {
            hideAll();
        }
    });

    let imageToLoad = $derived(lightboxImage ? getAssetImagePath(lightboxImage, "preview") : undefined);

    // Element Bindings
    let imageEl = $state<HTMLImageElement>();
    let imageContainerEl = $state<HTMLDivElement>();
    let zoomTargetEl = $state<HTMLDivElement>();
    let showImageStateDebugPanel = $state(false);
    let currentPreloadImg = $state<HTMLImageElement | null>(null);

    const zoomState = new ImageZoomState();
    let lastImageUid = $state<string | undefined>(undefined);

    $effect(() => {
        const currentUid = lightboxImage?.uid;
        if (currentUid !== lastImageUid) {
            zoomState.reset();
            lastImageUid = currentUid;
        }
    });

    let transformState = $derived({
        scale: zoomState.value,
        x: zoomState.posX,
        y: zoomState.posY
    });

    let isDragging = $state(false);
    let wasDragging = $state(false);
    let dragStart = {
        mouseX: 0,
        mouseY: 0,
        tx: 0,
        ty: 0
    };

    // Crop State
    let isCropping = $state(false);
    let cropAspectRatio = $state<number>();
    let currentCrop = $state<CropCoords>();
    let cropMenuPosition = $state<{ x: number; y: number }>();

    // Store crop edits (original/natural coordinates) to restore them when re-entering crop mode
    let cropEdits = $state<Record<string, CropCoords>>({});

    let activeCrop = $derived.by(() => {
        if (!lightboxImage?.uid || isCropping) {
            return null;
        }

        return cropEdits[lightboxImage.uid] || null;
    });

    let cropStyle = $derived.by(() => {
        if (!activeCrop || !lightboxImage || !imageEl) {
            return undefined;
        }

        const imgW = lightboxImage.width || imageEl.naturalWidth || 1;
        const imgH = lightboxImage.height || imageEl.naturalHeight || 1;

        if (imgW <= 0 || imgH <= 0 || activeCrop.width <= 0 || activeCrop.height <= 0) {
            return undefined;
        }

        const scaleX = ((imgW / activeCrop.width) * 100).toFixed(4);
        const scaleY = ((imgH / activeCrop.height) * 100).toFixed(4);
        const offsetX = ((activeCrop.x / activeCrop.width) * 100).toFixed(4);
        const offsetY = ((activeCrop.y / activeCrop.height) * 100).toFixed(4);

        return `width: ${scaleX}% !important; height: ${scaleY}% !important; position: absolute !important; left: -${offsetX}% !important; top: -${offsetY}% !important; max-width: none !important; max-height: none !important;`;
    });

    function handleCropApply() {
        if (!currentCrop || !imageEl || !lightboxImage) {
            return;
        }

        // Calculate crop relative to the ORIGINAL image
        const originalWidth = lightboxImage.width || imageEl.naturalWidth;
        const originalHeight = lightboxImage.height || imageEl.naturalHeight;

        const scaleToOriginalX = originalWidth / imageEl.clientWidth;
        const scaleToOriginalY = originalHeight / imageEl.clientHeight;

        const originalCrop = {
            x: Math.round(currentCrop.x * scaleToOriginalX),
            y: Math.round(currentCrop.y * scaleToOriginalY),
            width: Math.round(currentCrop.width * scaleToOriginalX),
            height: Math.round(currentCrop.height * scaleToOriginalY)
        };

        // Save the crop to state
        cropEdits[lightboxImage.uid] = originalCrop;

        toasts.add({
            type: "success",
            title: "Crop Applied",
            message: "Crop applied to view.",
            timeout: 4000
        });

        // Exit mode
        isCropping = false;
        currentCrop = undefined;
        cropMenuPosition = undefined;
        zoomState.value = 1;
        zoomState.posX = 0;
        updateImageDimensions();
    }

    function handleCropReset() {
        if (!lightboxImage || !imageEl) {
            return;
        }

        delete cropEdits[lightboxImage.uid];
        currentCrop = {
            x: 0,
            y: 0,
            width: imageEl.clientWidth,
            height: imageEl.clientHeight
        };
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
        updateImageDimensions() {
            updateImageDimensions();
        },
        restoreCrop() {
            restoreCrop();
        }
    });

    // Reset zoomed URL and load states when image changes or is closed
    let lastLoaderImageUid = $state<string | undefined>(undefined);

    $effect(() => {
        const uid = lightboxImage?.uid;
        if (uid !== lastLoaderImageUid) {
            untrack(() => {
                loader.reset(uid);
                updateImageDimensions();
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
            const containerWidth = imageContainerEl?.clientWidth || 1920;
            const containerHeight = imageContainerEl?.clientHeight || 1080;
            const containerLongestEdge = Math.max(containerWidth, containerHeight);

            // Snap the zoom factor to discrete steps to prevent intermediate spammed requests during pinch/scroll
            const snappedZoom = currentZoom > 10.0 ? 16.0 : currentZoom > 5.0 ? 8.0 : currentZoom > 2.5 ? 4.0 : 2.0;

            const targetSize = Math.round(containerLongestEdge * snappedZoom);

            // Snap to the next multiple of 256px to maximize cache hits on resizes/monitor variances
            const snappedSize = Math.ceil(targetSize / 256) * 256;

            // Clamp to the image's original longest edge
            const originalLongestEdge = Math.max(currentImage.width || 0, currentImage.height || 0);
            const size = Math.min(originalLongestEdge, snappedSize);

            // Do NOT fetch high-res upgrade if target size is <= current loaded image natural resolution
            const loadedPreviewLongestEdge = Math.max(imageEl?.naturalWidth || 0, imageEl?.naturalHeight || 0);
            if (loadedPreviewLongestEdge > 0 && size <= loadedPreviewLongestEdge) {
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
                loader.completeZoomUpgrade(fullURL);
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
                currentPreloadImg = null;
            }
        };
    });

    let showSidePanel = $state(!isMobile);

    function zoomTo(newZoom: number, clientX: number, clientY: number) {
        if (!imageDimensions || !imageContainerEl || !zoomTargetEl) {
            return;
        }

        const result = calculateZoomTo({
            value: zoomState.value,
            posX: zoomState.posX,
            posY: zoomState.posY,
            newZoom,
            clientX,
            clientY,
            zoomTargetRect: zoomTargetEl.getBoundingClientRect(),
            viewport: {
                width: imageContainerEl.clientWidth,
                height: imageContainerEl.clientHeight
            },
            image: imageDimensions
        });

        zoomState.value = result.value;
        zoomState.posX = result.posX;
        zoomState.posY = result.posY;
    }

    const handleWheel: WheelEventHandler<HTMLDivElement> = (event) => {
        event.preventDefault();

        // Normalize deltaY to pixels across different browsers and devices
        let dy = event.deltaY;
        if (event.deltaMode === 1) {
            // DOM_DELTA_LINE
            dy *= 33.3;
        } else if (event.deltaMode === 2) {
            // DOM_DELTA_PAGE
            dy *= 800;
        }

        // Limit the maximum delta per event to prevent huge jumps from fast scrolling
        dy = Math.max(-150, Math.min(dy, 150));

        // scroll zoom feel: Zoom ratio proportional to current zoom. Similar to Capture One/Lightroom
        // We use exponential zoom scaling to make trackpad and smooth scrolling feel natural and controllable.
        // Touchpad two-finger pinch-to-zoom has event.ctrlKey === true and uses a different zoom intensity
        // than standard scroll wheel zooming.
        const isPinch = event.ctrlKey;
        const zoomIntensity = isPinch ? 0.015 : 0.0022;
        const factor = Math.exp(-dy * zoomIntensity);
        const newZoom = zoomState.value * factor;

        zoomTo(newZoom, event.clientX, event.clientY);
    };

    const handleDoubleClick: MouseEventHandler<HTMLDivElement> = (event) => {
        event.stopPropagation();
        if (isCropping) {
            return;
        }

        if (zoomState.value > 1) {
            // Zoom out to 1
            zoomState.value = 1;
            zoomState.posX = 0;
            zoomState.posY = 0;
        } else {
            // Zoom in to 2.5 (100% style) at cursor position
            zoomTo(2.5, event.clientX, event.clientY);
        }
    };

    const handlePointerDown: PointerEventHandler<HTMLDivElement> = (event) => {
        if (event.button !== 0 || zoomState.value <= 1) {
            return;
        }

        isDragging = true;
        wasDragging = false;
        dragStart.mouseX = event.clientX;
        dragStart.mouseY = event.clientY;
        dragStart.tx = zoomState.posX;
        dragStart.ty = zoomState.posY;

        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const handlePointerMove: PointerEventHandler<HTMLDivElement> = (event) => {
        if (!isDragging || !imageDimensions || !imageContainerEl) {
            return;
        }

        const dx = event.clientX - dragStart.mouseX;
        const dy = event.clientY - dragStart.mouseY;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            wasDragging = true;
        }

        const constrained = constrainTranslation(
            dragStart.tx + dx,
            dragStart.ty + dy,
            zoomState.value,
            {
                width: imageContainerEl.clientWidth,
                height: imageContainerEl.clientHeight
            },
            imageDimensions
        );

        zoomState.posX = constrained.x;
        zoomState.posY = constrained.y;
    };

    const handlePointerUp: PointerEventHandler<HTMLDivElement> = (event) => {
        if (isDragging) {
            isDragging = false;
            try {
                event.currentTarget.releasePointerCapture(event.pointerId);
            } catch (e) {}

            if (wasDragging) {
                setTimeout(() => {
                    wasDragging = false;
                }, 50);
            }
        }
    };

    // Helper to get render dimensions
    let imageDimensions = $state<{ width: number; height: number } | null>(null);

    function updateImageDimensions() {
        if (!imageContainerEl || !lightboxImage) {
            return;
        }

        const computedStyle = getComputedStyle(imageContainerEl);
        const paddingX = (parseFloat(computedStyle.paddingLeft) || 0) + (parseFloat(computedStyle.paddingRight) || 0);
        const paddingY = (parseFloat(computedStyle.paddingTop) || 0) + (parseFloat(computedStyle.paddingBottom) || 0);

        const containerWidth = Math.max(1, imageContainerEl.clientWidth - paddingX);
        const containerHeight = Math.max(1, imageContainerEl.clientHeight - paddingY);

        if (containerWidth <= 0 || containerHeight <= 0) {
            return;
        }

        let targetWidth = lightboxImage.width || imageEl?.naturalWidth;
        let targetHeight = lightboxImage.height || imageEl?.naturalHeight;

        if (!isCropping && activeCrop && activeCrop.width > 0 && activeCrop.height > 0) {
            targetWidth = activeCrop.width;
            targetHeight = activeCrop.height;
        }

        if (!targetWidth || !targetHeight) {
            return;
        }

        const scale = Math.min(containerWidth / targetWidth, containerHeight / targetHeight);
        const calcWidth = Math.round(targetWidth * scale);
        const calcHeight = Math.round(targetHeight * scale);

        if (calcWidth <= 0 || calcHeight <= 0) {
            return;
        }

        untrack(() => {
            if (imageDimensions && currentCrop) {
                const oldWidth = imageDimensions.width;
                const oldHeight = imageDimensions.height;

                if (oldWidth > 0 && oldHeight > 0 && (oldWidth !== calcWidth || oldHeight !== calcHeight)) {
                    const scaleX = calcWidth / oldWidth;
                    const scaleY = calcHeight / oldHeight;

                    currentCrop = {
                        x: currentCrop.x * scaleX,
                        y: currentCrop.y * scaleY,
                        width: currentCrop.width * scaleX,
                        height: currentCrop.height * scaleY
                    };
                }
            }

            imageDimensions = {
                width: calcWidth,
                height: calcHeight
            };
        });
    }

    // Reactively track image dimension changes (window resize, crop layout changes)
    // and update imageDimensions, scaling currentCrop proportionally to keep it in sync.
    $effect(() => {
        if (show && imageContainerEl) {
            void isCropping;
            updateImageDimensions();

            const observer = new ResizeObserver(() => {
                updateImageDimensions();
            });
            observer.observe(imageContainerEl);

            return () => {
                observer.disconnect();
            };
        }
    });

    function goToPrev() {
        if (isCropping) {
            return;
        }

        prevLightboxImage?.();
    }

    function goToNext() {
        if (isCropping) {
            return;
        }

        nextLightboxImage?.();
    }

    // TODO: See if this needs to be reimplemeted, leave commented out for now
    // -------
    // Swipe state
    // let swipeStartX = 0;
    // let swipeStartY = 0;
    // let isSwiping = false;
    // const SWIPE_THRESHOLD = 50;
    // function handleSwipeStart(e: TouchEvent) {
    //     if (zoomState.currentZoom > 1 || isCropping) {
    //         return;
    //     }
    //     swipeStartX = e.touches[0].clientX;
    //     swipeStartY = e.touches[0].clientY;
    //     isSwiping = true;
    // }

    // function handleSwipeMove(e: TouchEvent) {
    //     if (!isSwiping) {
    //         return;
    //     }
    //     const dx = e.touches[0].clientX - swipeStartX;
    //     const dy = e.touches[0].clientY - swipeStartY;
    //     if (Math.abs(dy) > Math.abs(dx)) {
    //         isSwiping = false;
    //     }
    // }

    // function handleSwipeEnd(e: TouchEvent) {
    //     if (!isSwiping) {
    //         return;
    //     }
    //     isSwiping = false;
    //     const dx = e.changedTouches[0].clientX - swipeStartX;
    //     if (Math.abs(dx) >= SWIPE_THRESHOLD) {
    //         if (dx > 0) {
    //             goToPrev();
    //         } else {
    //             goToNext();
    //         }
    //     }
    // }

    function restoreCrop() {
        if (!imageEl || !lightboxImage) {
            return;
        }

        // Ensure we capture dimensions for overlay
        if (imageEl.clientWidth > 0 && imageEl.clientHeight > 0) {
            imageDimensions = {
                width: imageEl.clientWidth,
                height: imageEl.clientHeight
            };
        }

        const saved = cropEdits[lightboxImage.uid];
        let initialCrop = null;

        // If we have a saved crop (in original coordinates), scale it to current render dimensions
        if (saved && lightboxImage.width && lightboxImage.height) {
            const scaleX = imageEl.clientWidth / lightboxImage.width;
            const scaleY = imageEl.clientHeight / lightboxImage.height;

            initialCrop = {
                x: saved.x * scaleX,
                y: saved.y * scaleY,
                width: saved.width * scaleX,
                height: saved.height * scaleY
            };
        } else if (saved && imageEl.naturalWidth > 0) {
            // Fallback to naturalWidth if original dimensions missing (shouldn't happen often)
            const scaleX = imageEl.clientWidth / imageEl.naturalWidth;
            const scaleY = imageEl.clientHeight / imageEl.naturalHeight;

            initialCrop = {
                x: saved.x * scaleX,
                y: saved.y * scaleY,
                width: saved.width * scaleX,
                height: saved.height * scaleY
            };
        }

        if (initialCrop) {
            currentCrop = { ...initialCrop };
        } else {
            currentCrop = {
                x: 0,
                y: 0,
                width: imageEl.clientWidth,
                height: imageEl.clientHeight
            };
        }
    }

    function toggleCropMode() {
        if (!imageEl) {
            return;
        }

        if (!isCropping) {
            // Enter crop mode
            isCropping = true;
            // Preserve current zoom and position for cropping
            // Ensure crop area reflects current view
            if (imageEl.complete) {
                restoreCrop();
                updateImageDimensions();
            }
        } else {
            // Exit crop mode (cancel)
            isCropping = false;
            currentCrop = undefined;
            cropMenuPosition = undefined;
            // Remove explicit image dimensions so .zoom-target loses its explicit
            // width/height constraint. This breaks the circular dependency where
            // imageDimensions -> .zoom-target explicit size -> <img> constrained ->
            // updateImageDimensions reads constrained size -> writes it back.
            // The ResizeObserver on imageEl will fire after reflow and set the
            // correct full-container dimensions.
            imageDimensions = null;
        }
    }

    function handleContainerClick() {
        if (isCropping) {
            // Close floating crop menu if open, otherwise exit crop mode
            if (cropMenuPosition) {
                cropMenuPosition = undefined;
            } else {
                toggleCropMode();
            }
        } else if (zoomState.value <= 1.05) {
            // Close lightbox when not cropping and at default zoom
            lightboxImage = undefined;
        }
    }

    function handleAspectRatioChange(ratio: number | "original" | undefined) {
        if (!imageEl || !currentCrop) {
            return;
        }

        let targetRatio: number | undefined;

        if (ratio === "original") {
            if (lightboxImage?.width && lightboxImage?.height) {
                targetRatio = lightboxImage.width / lightboxImage.height;
            } else if (imageEl.naturalWidth && imageEl.naturalHeight) {
                targetRatio = imageEl.naturalWidth / imageEl.naturalHeight;
            }
        } else {
            targetRatio = ratio;
        }

        cropAspectRatio = targetRatio;

        if (targetRatio) {
            let newWidth = currentCrop.width;
            let newHeight = newWidth / targetRatio;

            if (newHeight > imageEl.clientHeight) {
                newHeight = imageEl.clientHeight;
                newWidth = newHeight * targetRatio;
            }

            // Center the new crop box
            const dx = (currentCrop.width - newWidth) / 2;
            const dy = (currentCrop.height - newHeight) / 2;

            currentCrop = {
                x: Math.max(0, currentCrop.x + dx),
                y: Math.max(0, currentCrop.y + dy),
                width: newWidth,
                height: newHeight
            };
        }
    }

    const handleContextMenu: MouseEventHandler<HTMLElement> = (e) => {
        e.preventDefault();
        if (isCropping) {
            cropMenuPosition = { x: e.clientX, y: e.clientY };
        }
    };

    onMount(() => {
        function isHotkeyBlocked() {
            if (!show) {
                return true;
            }

            if (document.querySelector(".calendar-popover")) {
                return true;
            }

            const activeEl = document.activeElement;
            const isInputFocused =
                activeEl &&
                (activeEl.tagName === "INPUT" ||
                    activeEl.tagName === "TEXTAREA" ||
                    activeEl.tagName === "SELECT" ||
                    activeEl.getAttribute("contenteditable") === "true");

            return isInputFocused;
        }

        const handleLeftRight = (e: KeyboardEvent, handler: HotkeysEvent) => {
            if (isHotkeyBlocked() || isCropping) {
                return;
            }

            e.preventDefault();
            if (handler.key === "left") {
                goToPrev();
            } else if (handler.key === "right") {
                goToNext();
            }
        };

        const handleEnter = (e: KeyboardEvent) => {
            if (isHotkeyBlocked() || !isCropping) {
                return;
            }

            e.preventDefault();
            handleCropApply();
        };

        const handleEsc = (e: KeyboardEvent) => {
            if (isHotkeyBlocked()) {
                return;
            }

            if (isCropping) {
                e.preventDefault();
                toggleCropMode();
                return;
            }

            // If not cropping, close the lightbox
            e.preventDefault();
            lightboxImage = undefined;
        };

        hotkeys("left,right", "lightbox", handleLeftRight);
        hotkeys("enter", "lightbox", handleEnter);
        hotkeys("esc", "lightbox", handleEsc);

        return () => {
            hotkeys.unbind("left,right", "lightbox", handleLeftRight);
            hotkeys.unbind("enter", "lightbox", handleEnter);
            hotkeys.unbind("esc", "lightbox", handleEsc);
            if (hotkeys.getScope() === "lightbox") {
                hotkeys.setScope("all");
            }
        };
    });

    $effect(() => {
        if (show) {
            hotkeys.setScope("lightbox");
            return () => {
                if (hotkeys.getScope() === "lightbox") {
                    hotkeys.setScope("all");
                }
            };
        }
    });

    const lightboxMaterialIconColour = "color: var(--viz-10-dark); fill: var(--viz-10-dark);";
</script>

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
                {lightboxImage?.uid || "none"}
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

<Lightbox
    bind:show
    backgroundOpacity={1}
    closeOnEsc={!isCropping}
    onclick={() => {
        if (wasDragging) {
            return;
        }
        handleContainerClick();
    }}
>
    <div class="image-lightbox-container">
        <div
            class="image-container"
            onclick={(e) => {
                if (wasDragging) {
                    e.stopPropagation();
                    return;
                }

                // Only handle clicks on the container background (not on buttons or image)
                if (e.currentTarget === imageContainerEl) {
                    handleContainerClick();
                }
            }}
            role="presentation"
        >
            <div class="lightbox-header-bar">
                <div class="lightbox-header-left">
                    <Button
                        id="lightbox-icon-close"
                        class="lightbox-button-icon"
                        hoverColor="transparent"
                        title="Close"
                        iconName="close"
                        onclick={() => {
                            if (isCropping) {
                                toggleCropMode();
                            } else {
                                lightboxImage = undefined;
                            }
                        }}
                    />
                    {#if !isCropping}
                        <span class="lightbox-image-name" title={lightboxImage!.name}>
                            {lightboxImage!.name}
                        </span>
                    {/if}
                </div>
                <div class="image-icon-buttons">
                    {#if !isCropping}
                        {#if dev}
                            <Button
                                class="lightbox-button-icon"
                                hoverColor="transparent"
                                title="Toggle Zoom & Image State Debug"
                                iconName="report"
                                onclick={() => {
                                    showImageStateDebugPanel = !showImageStateDebugPanel;
                                }}
                            />
                        {/if}
                        <Button
                            class="lightbox-button-icon {lightboxImage?.favourited ? 'favourited' : ''}"
                            hoverColor="transparent"
                            title={lightboxImage?.favourited ? "Unfavourite" : "Favourite"}
                            iconName="star"
                            fill={lightboxImage?.favourited}
                            onclick={async () => {
                                if (!lightboxImage) {
                                    return;
                                }

                                const newFav = !lightboxImage.favourited;
                                lightboxImage.favourited = newFav;
                                try {
                                    await updateImage(lightboxImage.uid, { favourited: newFav });
                                } catch (err) {
                                    lightboxImage.favourited = !newFav;
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
                            hoverColor="transparent"
                            title="Crop"
                            iconName="crop"
                            onclick={toggleCropMode}
                        />
                        <Button
                            class="lightbox-button-icon"
                            hoverColor="transparent"
                            title="Download Original"
                            iconName="download"
                            onclick={() => {
                                downloadOriginalImageFile(lightboxImage!);
                            }}
                        />
                        <Button
                            class="lightbox-button-icon"
                            hoverColor="transparent"
                            title="Export"
                            iconName="ios_share"
                            onclick={(e) => {
                                e.stopPropagation();

                                modalsManager
                                    .open(
                                        ExportPanel,
                                        {
                                            assets: [lightboxImage!]
                                        },
                                        exportModalOptions
                                    )
                                    .then(() => {
                                        lightboxImage = undefined;
                                    });
                            }}
                        />
                    {/if}
                    <Button
                        id="lightbox-toggle-info"
                        class="lightbox-button-icon"
                        hoverColor="transparent"
                        // TODO: Make i18n safe
                        title={`${showSidePanel ? "Hide" : "Show"} Info`}
                        onclick={(e) => {
                            e.stopPropagation();
                            showSidePanel = !showSidePanel;
                        }}
                        iconName="info"
                    />
                </div>
            </div>

            <div
                class="image-wrapper"
                class:is-crop={isCropping}
                bind:this={imageContainerEl}
                role="presentation"
                onclick={(e) => {
                    if (wasDragging) {
                        e.stopPropagation();
                        return;
                    }
                    // Only close on clicking the wrapper background or canvas target, not on image or buttons
                    if (
                        e.target === e.currentTarget ||
                        (e.target as HTMLElement)?.classList.contains("image-wrapper") ||
                        (e.target as HTMLElement)?.classList.contains("zoom-target")
                    ) {
                        handleContainerClick();
                    }
                }}
            >
                {#if dev && showImageStateDebugPanel}
                    {@render zoomStateDebug()}
                {/if}
                <div
                    class="zoom-target"
                    class:is-crop={isCropping}
                    class:has-crop={!!activeCrop}
                    class:can-pan={zoomState.value > 1}
                    class:is-panning={isDragging}
                    oncontextmenu={handleContextMenu}
                    role="presentation"
                    bind:this={zoomTargetEl}
                    style="{(isCropping || activeCrop) && imageDimensions
                        ? `width: ${imageDimensions.width}px; height: ${imageDimensions.height}px;`
                        : ''} transform: translate({zoomState.posX}px, {zoomState.posY}px) scale({zoomState.value}); transform-origin: 0 0;"
                    onwheel={handleWheel}
                    ondblclick={handleDoubleClick}
                    onpointerdown={handlePointerDown}
                    onpointermove={handlePointerMove}
                    onpointerup={handlePointerUp}
                    onpointercancel={handlePointerUp}
                    onclick={(e) => {
                        // If dragging was in progress, ignore
                        if (wasDragging) {
                            e.stopPropagation();
                            return;
                        }
                        // Click on background
                        if (e.target === e.currentTarget) {
                            handleContainerClick();
                        }
                    }}
                >
                    <AssetImage
                        naked={true}
                        bind:imageElement={imageEl}
                        asset={lightboxImage!}
                        objectFit="contain"
                        priority={true}
                        placeholder="none"
                        src={loader.displayURL}
                        class="lightbox-image main {isCropping ? 'is-crop' : ''}"
                        style={cropStyle}
                        crossorigin="use-credentials"
                        data-image-id={lightboxImage!.uid}
                        onload={() => {
                            if (isCropping) {
                                updateImageDimensions();
                            }
                            loader.handleLoad();
                        }}
                        onerror={() => loader.handleError()}
                        ondragstart={(e) => e.preventDefault()}
                        oncontextmenu={handleContextMenu}
                    />

                    {#if isCropping && imageDimensions && currentCrop}
                        <CropOverlay
                            width={imageDimensions.width}
                            height={imageDimensions.height}
                            bind:crop={currentCrop}
                            scale={transformState.scale}
                            aspectRatio={cropAspectRatio}
                        />
                    {/if}
                </div>

                <!-- TODO: Change this to a general action status indicator to support all actions -->
                <!-- e.g. "Date Change: 11-06-2026, 20:42:01" -->
                {#if zoomState.value > 1}
                    <div class="zoom-indicator-badge" role="status" aria-live="polite">
                        Zoom: {Math.round(zoomState.value * 100)}%
                    </div>
                {/if}

                {#if isCropping && cropMenuPosition}
                    <CropTools
                        x={cropMenuPosition.x}
                        y={cropMenuPosition.y}
                        onApply={handleCropApply}
                        onReset={handleCropReset}
                        onCancel={() => {
                            cropMenuPosition = undefined;
                        }}
                        onAspectRatioChange={handleAspectRatioChange}
                    />
                {/if}
            </div>

            {#if prevLightboxImage && nextLightboxImage && !isCropping}
                <div class="lightbox-nav">
                    <Button
                        iconName="arrow_back"
                        class="lightbox-nav-btn prev lightbox-button-icon"
                        style={lightboxMaterialIconColour}
                        title="Previous image"
                        onclick={(e) => {
                            e.stopPropagation();
                            goToPrev();
                        }}
                    />
                    <Button
                        iconName="arrow_forward"
                        class="lightbox-nav-btn next lightbox-button-icon"
                        style={lightboxMaterialIconColour}
                        title="Next image"
                        onclick={(e) => {
                            e.stopPropagation();
                            goToNext();
                        }}
                    />
                </div>
            {/if}
        </div>

        {#if showSidePanel}
            <div class="side-panel" class:crop-mode={isCropping} transition:slide={{ axis: "x" }}>
                {#if isCropping}
                    <CropTools
                        variant="placed"
                        onApply={handleCropApply}
                        onReset={handleCropReset}
                        onCancel={() => {
                            toggleCropMode();
                        }}
                        onAspectRatioChange={handleAspectRatioChange}
                    />
                {:else}
                    <MetadataPanel asset={lightboxImage!} showCloseIcon={isMobile} {onImageUpdated} />
                {/if}
            </div>
        {/if}
    </div>
</Lightbox>

<style lang="scss">
    .image-lightbox-container {
        position: relative;
        display: flex;
        align-items: center;
        height: 100%;
        width: 100%;
        pointer-events: auto;
    }

    .image-container {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        flex: 1 1 0%;
        min-width: 0;
        height: 100%;
        pointer-events: auto;
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
        pointer-events: none;
    }

    .lightbox-header-left {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-sm);
        min-width: 0;
        flex: 0 1 auto;
        pointer-events: auto;
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
        flex-shrink: 0;
        margin-left: auto;
        pointer-events: auto;
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

    .image-wrapper {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
        width: 100%;
        overflow: hidden;
        pointer-events: auto;
        box-sizing: border-box;
    }

    .image-wrapper.is-crop {
        padding: var(--viz-spacing-xl);
    }

    .zoom-target {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        max-width: 100%;
        max-height: 100%;
        width: 100%;
        height: 100%;
        pointer-events: auto;

        &.has-crop {
            overflow: hidden !important;
            position: relative !important;
        }

        &.is-crop {
            display: grid;
            grid-template-columns: 100%;
            grid-template-rows: 100%;
            justify-items: center;
            align-items: center;
            overflow: visible !important;
            width: auto;
            height: auto;
        }

        &.is-crop > * {
            grid-area: 1 / 1;
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
            pointer-events: auto;

            &.placeholder {
                position: absolute;
                z-index: 1;
                opacity: 1;
                transition: opacity 0.3s ease-in-out;
                image-rendering: auto;

                &.loaded,
                &.hidden {
                    opacity: 0;
                    pointer-events: none;
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

                &.is-crop {
                    width: 100% !important;
                    height: 100% !important;
                    max-width: 100% !important;
                    max-height: 100% !important;
                    object-fit: fill !important;
                }

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
        pointer-events: none;
    }

    :global(.lightbox-nav-btn) {
        border: none;
        color: var(--viz-text-primary);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        pointer-events: auto;
    }

    :global(.exif-material-icon) {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
        vertical-align: middle;
        font-size: 1.5em;
    }

    .zoom-target.can-pan {
        cursor: grab;
    }

    .zoom-target.is-panning {
        cursor: grabbing;
    }

    .zoom-indicator-badge {
        position: absolute;
        bottom: 5%;
        background-color: color-mix(in srgb, var(--viz-100-dark) 90%, transparent);
        color: var(--viz-10-dark);
        padding: var(--viz-spacing-sm) var(--viz-spacing-lg);
        font-size: var(--viz-font-size-lg);
        font-weight: 600;
        z-index: 10;
        pointer-events: none;
    }

    .side-panel {
        background-color: var(--viz-surface-panel);
        height: 100%;
        width: auto;
        max-width: 25rem;
        min-width: 25rem;
        pointer-events: auto;
        box-sizing: border-box;
        overflow-y: auto;
        border-left: 1px solid var(--viz-border-subtle);

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
        pointer-events: auto;

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
