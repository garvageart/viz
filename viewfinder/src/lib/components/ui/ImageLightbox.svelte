<script lang="ts">
    import { getFullImagePath, updateImage, type ImageAsset } from "$lib/api";
    import { LabelColours, type ImageLabel } from "$lib/images/constants";
    import { setRating } from "$lib/images/exif";
    import { toastState } from "$lib/toast-notifcations/notif-state.svelte";
    import { downloadOriginalImageFile } from "$lib/utils/http";
    import {
        formatBytes,
        getFlashMode,
        getImageLabel,
        getTakenAt,
        getThumbhashURL
    } from "$lib/utils/images";
    import { createZoomImageWheel, type ZoomImageWheelStateUpdate } from "@zoom-image/core";
    import hotkeys from "hotkeys-js";
    import { onMount, untrack } from "svelte";
    import CropOverlay from "../image-tools/CropOverlay.svelte";
    import CropTools from "../image-tools/CropTools.svelte";
    import ImageLabelViewer from "../image-tools/ImageLabelViewer.svelte";
    import StarRating from "../image-tools/StarRating.svelte";
    import IconButton from "./IconButton.svelte";
    import InputText from "./InputText.svelte";
    import Lightbox from "./Lightbox.svelte";
    import MaterialIcon from "./MaterialIcon.svelte";
    import { dev } from "$app/environment";

    interface Props {
        lightboxImage: ImageAsset | undefined;
        prevLightboxImage?: () => void;
        nextLightboxImage?: () => void;
        onImageUpdated?: (image: ImageAsset) => void;
    }

    let {
        lightboxImage = $bindable(),
        prevLightboxImage,
        nextLightboxImage,
        onImageUpdated
    }: Props = $props();

    let show = $derived(lightboxImage !== undefined);
    let imageToLoad = $derived(
        lightboxImage
            ? getFullImagePath(
                  lightboxImage.image_paths?.preview ||
                      lightboxImage.image_paths?.original
              )
            : ""
    );

    // Crop State
    let isCropping = $state(false);
    let cropAspectRatio = $state<number | null>(null);
    let currentCrop = $state<{
        x: number;
        y: number;
        width: number;
        height: number;
    } | null>(null);
    let cropMenuPosition = $state<{ x: number; y: number } | null>(null);
    // Store crop edits (original/natural coordinates) to restore them when re-entering crop mode
    let cropEdits = $state<
        Record<string, { x: number; y: number; width: number; height: number }>
    >({});

    let overriddenImages = $state<Record<string, string>>({});
    let displayURL = $derived(
        lightboxImage?.uid && overriddenImages[lightboxImage.uid] && !isCropping
            ? overriddenImages[lightboxImage.uid]
            : imageToLoad
    );

    let direction = $state<"left" | "right">("right");
    let showMetadata = $state(true);
    let editNameMode = $state(false);

    let imageEl: HTMLImageElement = $state()!;
    let canvasEl: HTMLCanvasElement = $state()!;
    let imageContainerEl: HTMLDivElement = $state()!;

    let zoomTargetEl: HTMLDivElement = $state()!;
    let zoomInstance: ReturnType<typeof createZoomImageWheel> | null = null;

    let zoomState = $state({
        currentZoom: 1,
        currentPositionX: -1,
        currentPositionY: -1,
        currentRotation: 0
    });

    let transformState = $derived({
        scale: zoomState.currentZoom,
        x: zoomState.currentPositionX,
        y: zoomState.currentPositionY
    });

    function setZoomImageState(state: ZoomImageWheelStateUpdate) {
        if (zoomInstance) {
            zoomInstance.setState(state);
        }
    }

    $effect(() => {
        if (show && loadState === "loaded" && zoomTargetEl && imageEl && !isCropping) {
            // Clean up any existing zoom instance first
            if (zoomInstance) {
                zoomInstance.cleanup();
                zoomInstance = null;
            }

            // Initialize a new zoom instance
            zoomInstance = createZoomImageWheel(zoomTargetEl, {
                maxZoom: 4,
                wheelZoomRatio: 0.1
            });

            // Set initial state
            const state = zoomInstance.getState();
            zoomState.currentZoom = state.currentZoom;
            zoomState.currentPositionX = state.currentPositionX;
            zoomState.currentPositionY = state.currentPositionY;

            // Subscribe to state updates
            zoomInstance.subscribe(({ state }) => {
                zoomState.currentZoom = state.currentZoom;
                zoomState.currentPositionX = state.currentPositionX;
                zoomState.currentPositionY = state.currentPositionY;
            });
        } else {
            // Clean up when not showing, loading, or cropping
            if (zoomInstance) {
                zoomInstance.cleanup();
                zoomInstance = null;
            }
            zoomState.currentZoom = 1;
            zoomState.currentPositionX = -1;
            zoomState.currentPositionY = -1;
        }

        // Clean up zoom instance when this effect is re-run or destroyed
        return () => {
            if (zoomInstance) {
                zoomInstance.cleanup();
                zoomInstance = null;
            }
        };
    });

    let thumbhashURL = $derived(
        lightboxImage ? getThumbhashURL(lightboxImage) : undefined
    );

    // Helper to get render dimensions
    let imageDimensions = $state<{ width: number; height: number } | null>(
        null
    );

    // Reactively track image dimension changes (window resize, crop layout changes)
    // and update imageDimensions, scaling currentCrop proportionally to keep it in sync.
    $effect(() => {
        if (isCropping && imageEl) {
            const updateDimensions = () => {
                if (imageEl.clientWidth > 0 && imageEl.clientHeight > 0) {
                    const newWidth = imageEl.clientWidth;
                    const newHeight = imageEl.clientHeight;

                    untrack(() => {
                        if (imageDimensions && currentCrop) {
                            const oldWidth = imageDimensions.width;
                            const oldHeight = imageDimensions.height;

                            if (
                                oldWidth > 0 &&
                                oldHeight > 0 &&
                                (oldWidth !== newWidth ||
                                    oldHeight !== newHeight)
                            ) {
                                const scaleX = newWidth / oldWidth;
                                const scaleY = newHeight / oldHeight;

                                currentCrop = {
                                    x: currentCrop.x * scaleX,
                                    y: currentCrop.y * scaleY,
                                    width: currentCrop.width * scaleX,
                                    height: currentCrop.height * scaleY
                                };
                            }
                        }

                        imageDimensions = {
                            width: newWidth,
                            height: newHeight
                        };
                    });
                }
            };

            updateDimensions();

            const observer = new ResizeObserver(() => {
                updateDimensions();
            });
            observer.observe(imageEl);

            return () => {
                observer.disconnect();
            };
        }
    });

    function goToPrev() {
        if (isCropping) {
            return;
        }

        direction = "left";
        prevLightboxImage?.();
    }

    function goToNext() {
        if (isCropping) {
            return;
        }

        direction = "right";
        nextLightboxImage?.();
    }

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
            // Reset zoom to ensure user sees the whole image context for cropping
            setZoomImageState({ currentZoom: 1, enable: false });

            if (imageEl.complete) {
                restoreCrop();
            }
        } else {
            // Exit crop mode (cancel)
            isCropping = false;
            currentCrop = null;
            cropMenuPosition = null;
            setZoomImageState({ enable: true });
        }
    }

    function handleAspectRatioChange(ratio: number | null | "original") {
        if (!imageEl || !currentCrop) {
            return;
        }

        let targetRatio: number | null = null;

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

    function handleCropApply() {
        if (!currentCrop || !imageEl || !lightboxImage) {
            console.warn("Missing requirements for crop apply", {
                currentCrop,
                imageEl,
                lightboxImage,
                canvasEl
            });
            return;
        }

        // Calculate crop relative to the ORIGINAL image (for backend/storage)
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

        // Client-side visual apply
        const scaleToPreviewX = imageEl.naturalWidth / imageEl.clientWidth;
        const scaleToPreviewY = imageEl.naturalHeight / imageEl.clientHeight;

        const previewCrop = {
            x: Math.round(currentCrop.x * scaleToPreviewX),
            y: Math.round(currentCrop.y * scaleToPreviewY),
            width: Math.round(currentCrop.width * scaleToPreviewX),
            height: Math.round(currentCrop.height * scaleToPreviewY)
        };

        let canvas = canvasEl;
        if (!canvas) {
            canvas = document.createElement("canvas");
        }

        canvas.width = previewCrop.width;
        canvas.height = previewCrop.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.drawImage(
                imageEl,
                previewCrop.x,
                previewCrop.y,
                previewCrop.width,
                previewCrop.height,
                0,
                0,
                previewCrop.width,
                previewCrop.height
            );
            const dataURL = canvas.toDataURL("image/jpeg", 0.9);
            overriddenImages[lightboxImage.uid] = dataURL;
        }

        toastState.addToast({
            type: "success",
            title: "Crop Applied (Client-side)",
            message: `Image updated in view.`,
            timeout: 4000
        });

        // Exit mode
        isCropping = false;
        currentCrop = null;
        cropMenuPosition = null;
        setZoomImageState({ currentZoom: 1, enable: true });
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

    function handleContextMenu(e: MouseEvent) {
        e.preventDefault();
        if (isCropping) {
            cropMenuPosition = { x: e.clientX, y: e.clientY };
        }
    }

    let loadState = $state<"loading" | "loaded" | "error">("loading");

    $effect(() => {
        if (displayURL) {
            let active = true;
            loadState = "loading";

            const img = new Image();
            img.onload = () => {
                if (active) {
                    loadState = "loaded";
                }
            };

            img.onerror = () => {
                if (active) {
                    loadState = "error";
                }
            };

            img.src = displayURL;
            return () => {
                active = false;
            };
        }
    });

    let starRating = $derived<number | null>(
        lightboxImage?.image_metadata?.rating ?? null
    );
    let updatingRating = $state(false);

    async function setImageRating(newRating: number | null) {
        if (!lightboxImage || updatingRating) {
            return;
        }

        updatingRating = true;
        const prev = starRating;
        try {
            const newSuccessfulRating = await setRating(
                lightboxImage,
                prev,
                newRating
            );

            if (lightboxImage && lightboxImage.image_metadata) {
                lightboxImage.image_metadata = {
                    ...lightboxImage.image_metadata,
                    rating: newSuccessfulRating
                };

                onImageUpdated?.(lightboxImage);
            }
        } catch (err) {
            const ratingErr = err as Error;
            toastState.addToast({
                type: "error",
                title: "Failed to update rating",
                message: ratingErr.message
            });
        } finally {
            updatingRating = false;
        }
    }

    onMount(() => {
        const handleLeftRight = (e: KeyboardEvent, handler: any) => {
            if (!show || isCropping) {
                return;
            }

            const activeEl = document.activeElement;
            const isInputFocused =
                activeEl &&
                (activeEl.tagName === "INPUT" ||
                    activeEl.tagName === "TEXTAREA" ||
                    activeEl.tagName === "SELECT" ||
                    activeEl.getAttribute("contenteditable") === "true");

            if (isInputFocused || editNameMode) {
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
            if (!show || !isCropping) {
                return;
            }

            const activeEl = document.activeElement;
            const isInputFocused =
                activeEl &&
                (activeEl.tagName === "INPUT" ||
                    activeEl.tagName === "TEXTAREA" ||
                    activeEl.tagName === "SELECT" ||
                    activeEl.getAttribute("contenteditable") === "true");

            if (isInputFocused || editNameMode) {
                return;
            }

            e.preventDefault();
            handleCropApply();
        };

        const handleEsc = (e: KeyboardEvent) => {
            if (!show) {
                return;
            }

            const activeEl = document.activeElement;
            const isInputFocused =
                activeEl &&
                (activeEl.tagName === "INPUT" ||
                    activeEl.tagName === "TEXTAREA" ||
                    activeEl.tagName === "SELECT" ||
                    activeEl.getAttribute("contenteditable") === "true");

            if (isInputFocused || editNameMode) {
                return;
            }

            if (isCropping) {
                e.preventDefault();
                toggleCropMode();
                return;
            }

            // If not cropping, let Lightbox handle it or close explicitly
            lightboxImage = undefined;
        };

        hotkeys("left,right", handleLeftRight);
        hotkeys("enter", handleEnter);
        hotkeys("esc", handleEsc);

        return () => {
            hotkeys.unbind("left,right", handleLeftRight);
            hotkeys.unbind("enter", handleEnter);
            hotkeys.unbind("esc", handleEsc);
        };
    });

    function formatFileSize() {
        const size = lightboxImage?.image_metadata?.file_size;
        return formatBytes(size) ?? "—";
    }

    const lightboxMaterialIconColour =
        "color: var(--viz-10-dark); fill: var(--viz-10-dark);";
</script>

{#snippet metadataEditor()}
    <div class="metadata-editor">
        <div class="metadata-header">
            <h3>Metadata</h3>
        </div>
        <div class="metadata-exif-box">
            <div class="exif-cards">
                <div class="exif-card">
                    <div class="card-row main-row">
                        <MaterialIcon
                            iconName="image"
                            class="exif-material-icon"
                        />
                        <div class="card-values">
                            {#if editNameMode}
                                <InputText
                                    bind:value={lightboxImage!.name}
                                    class="value-big"
                                    style="min-height: auto; padding: 0.5rem;"
                                    spellcheck="false"
                                    autofocus={true}
                                    onblur={async (e) => {
                                        editNameMode = false;
                                        if (
                                            e.currentTarget.value.trim() ===
                                            lightboxImage!.name
                                        ) {
                                            return;
                                        }

                                        try {
                                            const res = await updateImage(
                                                lightboxImage!.uid,
                                                {
                                                    name: lightboxImage!.name
                                                }
                                            );

                                            if (res.status === 200) {
                                                lightboxImage = res.data;
                                                onImageUpdated?.(res.data);
                                            }
                                        } catch (error) {}
                                    }}
                                    onkeydown={(e) => {
                                        if (e.key === "Enter") {
                                            e.currentTarget.blur();
                                        } else if (e.key === "Escape") {
                                            editNameMode = false;
                                        }
                                    }}
                                />
                            {:else}
                                <div
                                    role="button"
                                    tabindex="0"
                                    onclick={() => (editNameMode = true)}
                                    onkeydown={() => (editNameMode = true)}
                                    class="value-big"
                                >
                                    {lightboxImage?.name}
                                </div>
                            {/if}
                        </div>
                    </div>
                    <div class="card-row meta-row">
                        <MaterialIcon
                            iconName="calendar_today"
                            class="exif-material-icon"
                        />
                        <div class="card-values">
                            <div class="value-big">
                                {#if lightboxImage?.image_metadata?.file_created_at}
                                    {getTakenAt(
                                        lightboxImage
                                    ).toLocaleDateString(undefined, {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric"
                                    })}
                                {:else}
                                    Unknown Date
                                {/if}
                            </div>
                        </div>
                    </div>
                </div>
                <!-- Camera/Exposure card -->
                <div class="exif-card">
                    <div class="card-row main-row">
                        <div class="card-values">
                            {#if lightboxImage?.exif?.model && lightboxImage?.exif?.make}
                                <div class="value-big">
                                    {lightboxImage.exif.make}
                                    {lightboxImage.exif.model.replace(
                                        new RegExp(
                                            `^${lightboxImage.exif.make} `
                                        ),
                                        ""
                                    )}
                                </div>
                            {:else}
                                <div class="value-big">Unknown Camera</div>
                            {/if}

                            {#if lightboxImage?.exif?.lens_model}
                                <div class="value-sub">
                                    {lightboxImage.exif.lens_model}
                                </div>
                            {:else}
                                <div class="value-sub">Unknown Lens Make</div>
                            {/if}

                            {#if lightboxImage?.exif?.focal_length}
                                <div class="value-sub">
                                    {lightboxImage.exif.focal_length}
                                </div>
                            {:else}
                                <div class="value-sub">
                                    Unknown Focal Length
                                </div>
                            {/if}
                        </div>
                    </div>
                </div>
                <div class="exif-card-group">
                    <div class="exif-card">
                        <div class="card-row main-row">
                            <MaterialIcon
                                iconName="camera"
                                class="exif-material-icon"
                            />
                            <div class="card-values">
                                <div class="value-sub">
                                    {lightboxImage?.exif?.f_number ??
                                        lightboxImage?.exif?.aperture ??
                                        "—"}
                                </div>
                                <div class="value-sub">
                                    {lightboxImage?.exif?.exposure_time ?? "—"}
                                </div>
                            </div>
                        </div>
                        <div class="card-row meta-row">
                            <MaterialIcon
                                iconName="tune"
                                class="exif-material-icon"
                            />
                            <div class="card-values">
                                <div class="value-sub">
                                    ISO {lightboxImage?.exif?.iso ?? "—"}
                                </div>
                                <div class="value-sub">
                                    {lightboxImage?.exif?.exposure_value ?? "—"}
                                </div>
                            </div>
                        </div>
                        <div class="card-row meta-row">
                            <MaterialIcon
                                iconName="flash_on"
                                fill={true}
                                style="color: #FFC107; fill: #FFC107;"
                                class="exif-material-icon"
                            />
                            <div class="card-values">
                                <div class="value-sub">
                                    Flash {getFlashMode(
                                        lightboxImage?.exif?.flash
                                    ) ?? "—"}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="exif-card">
                        <div class="card-row main-row">
                            <div class="card-values">
                                <div class="value-sub">
                                    {lightboxImage?.width} x {lightboxImage?.height}
                                </div>
                            </div>
                        </div>
                        <div class="card-row main-row">
                            <MaterialIcon
                                iconName="aspect_ratio"
                                class="exif-material-icon"
                            />
                            <div class="card-values">
                                <div class="value-sub">
                                    {Math.floor(
                                        (lightboxImage?.width! *
                                            lightboxImage?.height!) /
                                            1_000_000
                                    )} MP
                                </div>
                                <div class="value-sub">{formatFileSize()}</div>
                            </div>
                        </div>
                        <div class="card-row meta-row">
                            <MaterialIcon
                                iconName="palette"
                                class="exif-material-icon"
                            />
                            <div class="card-values">
                                <div class="value-sub">
                                    {lightboxImage?.image_metadata
                                        ?.color_space ?? "—"}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="rating-container">
                <ImageLabelViewer
                    variant="compact"
                    label={getImageLabel(lightboxImage!)}
                    onSelect={async (selectedLabel) => {
                        if (!lightboxImage) {
                            return;
                        }

                        const entry = Object.entries(LabelColours).find(
                            ([_, colour]) => colour === selectedLabel
                        );
                        const labelToSend = entry
                            ? entry[0] === "None"
                                ? null
                                : entry[0]
                            : null;
                        try {
                            const res = await updateImage(lightboxImage.uid, {
                                image_metadata: {
                                    label: labelToSend as ImageLabel | null
                                }
                            });

                            if (res.status === 200) {
                                lightboxImage = res.data;
                                onImageUpdated?.(res.data);
                            }
                        } catch (error) {}
                    }}
                />
                <StarRating value={starRating} onChange={setImageRating} />
            </div>
        </div>
    </div>
{/snippet}

<Lightbox
    bind:show
    backgroundOpacity={0.95}
    closeOnEsc={!isCropping}
    onclick={() => {
        if (!isCropping) {
            lightboxImage = undefined;
        } else {
            if (cropMenuPosition) {
                cropMenuPosition = null;
            } else {
                toggleCropMode();
            }
        }
    }}
>
    <div class="image-lightbox-container">
        <div
            class="image-container"
            onclick={(e) => {
                if (isCropping) {
                    const target = e.target as HTMLElement;
                    if (
                        !target.closest("button") &&
                        !target.closest(".crop-tools-container")
                    ) {
                        e.stopPropagation();
                        if (cropMenuPosition) {
                            cropMenuPosition = null;
                        } else {
                            toggleCropMode();
                        }
                    }
                }
            }}
            role="presentation"
        >
            <IconButton
                id="lightbox-icon-close"
                class="lightbox-button-icon"
                hoverColor="transparent"
                title="Close"
                iconName="close"
                onclick={() => {
                    if (isCropping) {
                        isCropping = false;
                        cropMenuPosition = null;
                    } else {
                        lightboxImage = undefined;
                    }
                }}
            />
            {#if !isCropping}
                <div class="image-icon-buttons">
                    {#if dev}
                        <IconButton
                            class="lightbox-button-icon"
                            hoverColor="transparent"
                            style={lightboxMaterialIconColour}
                            title="Show Placeholder"
                            iconName="blur_linear"
                            onclick={() => {
                                if (loadState === "loaded") {
                                    loadState = "loading";
                                } else {
                                    loadState = "loaded";
                                }
                            }}
                        />
                    {/if}
                    <IconButton
                        class="lightbox-button-icon"
                        hoverColor="transparent"
                        style={lightboxMaterialIconColour}
                        title="Crop"
                        iconName="crop"
                        onclick={toggleCropMode}
                    />
                    <IconButton
                        class="lightbox-button-icon"
                        hoverColor="transparent"
                        style={lightboxMaterialIconColour}
                        title="Download"
                        iconName="download"
                        onclick={() => {
                            downloadOriginalImageFile(lightboxImage!);
                        }}
                    />
                    <IconButton
                        class="lightbox-button-icon"
                        hoverColor="transparent"
                        style={lightboxMaterialIconColour}
                        title={`${showMetadata ? "Hide" : "Show"} Info`}
                        onclick={(e) => {
                            e.stopPropagation();
                            showMetadata = !showMetadata;
                        }}
                        iconName="info"
                    />
                </div>
            {/if}

            <div
                class="image-wrapper"
                bind:this={imageContainerEl}
                role="presentation"
                onclick={(e) => {
                    if (e.target === imageContainerEl && !isCropping) {
                        lightboxImage = undefined;
                    }
                }}
            >
                <div
                    class="zoom-target"
                    class:is-crop={isCropping}
                    oncontextmenu={handleContextMenu}
                    role="presentation"
                    bind:this={zoomTargetEl}
                    onclick={(e) => {
                        if (e.target === e.currentTarget && !isCropping) {
                            lightboxImage = undefined;
                        }
                    }}
                >
                    <img
                        bind:this={imageEl}
                        src={displayURL}
                        class="lightbox-image main {isCropping
                            ? 'is-crop'
                            : ''}"
                        class:loading={loadState !== "loaded"}
                        alt={lightboxImage!.name}
                        title={lightboxImage!.name}
                        loading="eager"
                        crossorigin="use-credentials"
                        data-image-id={lightboxImage!.uid}
                        onload={() => {
                            setZoomImageState({ currentZoom: 1 });
                            if (isCropping) {
                                restoreCrop();
                            }
                        }}
                        ondragstart={(e) => e.preventDefault()}
                        oncontextmenu={handleContextMenu}
                    />

                    {#if thumbhashURL && loadState !== "loaded"}
                        <img
                            src={thumbhashURL}
                            class="lightbox-image placeholder"
                            alt="Placeholder for {lightboxImage!.name}"
                            aria-hidden="true"
                            style={`aspect-ratio: ${lightboxImage!.width} / ${lightboxImage!.height};`}
                        />
                    {/if}

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
            </div>

            {#if prevLightboxImage && nextLightboxImage && !isCropping}
                <div class="lightbox-nav">
                    <button
                        class="lightbox-nav-btn prev lightbox-button-icon"
                        aria-label="Previous image"
                        onclick={(e) => {
                            e.stopPropagation();
                            goToPrev();
                        }}
                    >
                        <MaterialIcon
                            iconName="arrow_back"
                            style={lightboxMaterialIconColour}
                        />
                    </button>
                    <button
                        class="lightbox-nav-btn next lightbox-button-icon"
                        aria-label="Next image"
                        onclick={(e) => {
                            e.stopPropagation();
                            goToNext();
                        }}
                    >
                        <MaterialIcon
                            iconName="arrow_forward"
                            style={lightboxMaterialIconColour}
                        />
                    </button>
                </div>
            {/if}

            {#if isCropping && cropMenuPosition}
                <CropTools
                    x={cropMenuPosition.x}
                    y={cropMenuPosition.y}
                    onApply={handleCropApply}
                    onReset={handleCropReset}
                    onCancel={() => {
                        toggleCropMode();
                    }}
                    onAspectRatioChange={handleAspectRatioChange}
                />
            {/if}
        </div>
        {#if isCropping}
            <div class="metadata-editor">
                <CropTools
                    variant="placed"
                    onApply={handleCropApply}
                    onReset={handleCropReset}
                    onCancel={() => {
                        toggleCropMode();
                    }}
                    onAspectRatioChange={handleAspectRatioChange}
                />
            </div>
        {:else if showMetadata}
            {@render metadataEditor()}
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
        width: 100%;
        height: 100%;
        pointer-events: auto;
    }

    :global(.image-icon-buttons) {
        position: absolute;
        top: 1em;
        right: 1em;
        z-index: 10;
        pointer-events: auto;
        display: flex;
        gap: 0.5em;
    }

    :global(#lightbox-icon-close) {
        position: absolute;
        top: 1em;
        left: 1em;
        z-index: 10;
        pointer-events: auto;
    }

    :global(.lightbox-button-icon) {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.25em;
        background: transparent;
        border: none;

        :global(span) {
            color: var(--viz-10-dark) !important;
            fill: var(--viz-10-dark) !important;
        }

        filter: drop-shadow(0 8px 22px rgba(0, 0, 0, 1))
            drop-shadow(0 2px 6px rgba(0, 0, 0, 1))
            drop-shadow(0 2px 6px rgba(0, 0, 0, 0.1));
        -webkit-filter: drop-shadow(0 8px 22px rgba(0, 0, 0, 1))
            drop-shadow(0 2px 6px rgba(0, 0, 0, 1))
            drop-shadow(0 2px 6px rgba(0, 0, 0, 0.1));
        will-change: filter;
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
    }

    .zoom-target {
        position: relative;
        display: grid;
        grid-template-columns: 100%;
        grid-template-rows: 100%;
        justify-items: center;
        align-items: center;
        max-width: 100%;
        max-height: 100%;
        pointer-events: auto;
    }

    .zoom-target.is-crop {
        overflow: visible !important;
    }

    .zoom-target > * {
        grid-area: 1 / 1;
    }

    :global(.lightbox-image) {
        display: block;
        max-width: 100%;
        max-height: 100%;
        width: auto;
        height: auto;
        pointer-events: auto;
        transition: opacity 0.2s ease-in-out;
    }

    :global(.lightbox-image.placeholder) {
        z-index: 1;
        opacity: 1;
        image-rendering: auto;
        min-height: 100%;
    }

    :global(.lightbox-image.placeholder.hidden) {
        opacity: 0;
    }

    :global(.lightbox-image.main) {
        z-index: 2;
        opacity: 1;
    }

    :global(.lightbox-image.main.loading) {
        opacity: 0;
    }

    // to give space for seeing cropping
    :global(.lightbox-image.is-crop) {
        max-width: 97vw;
        max-height: 97vh;
    }

    .lightbox-nav {
        position: absolute;
        top: 50%;
        right: 2em;
        display: flex;
        flex-direction: column;
        transform: translateY(-50%);
        pointer-events: none;
    }

    .lightbox-nav-btn {
        border: none;
        color: var(--viz-10);
        width: 3em;
        height: 3em;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 0.3em;
        cursor: pointer;
        pointer-events: auto;
    }

    .metadata-editor {
        background-color: var(--viz-bg-color);
        padding: 1em;
        border-radius: 0.5em;
        color: var(--viz-10);
        height: 100%;
        width: auto;
        max-width: 20vw;
        min-width: 20vw;
        z-index: 100;
        pointer-events: auto;
        box-sizing: border-box;
        font-size: 0.85rem;
    }

    .metadata-header {
        font-size: 1rem;
        display: flex;
        align-items: center;
        margin-bottom: 1em;
        gap: 0.5em;
    }

    .metadata-exif-box {
        display: block;
    }

    .exif-card-group {
        display: flex;
        gap: 0.5em;
    }

    .exif-cards {
        display: flex;
        flex-direction: column;
        gap: 0.75em;
    }

    .exif-card {
        background: var(--viz-100);
        color: var(--viz-text-color);
        box-sizing: border-box;
        width: 100%;
        padding: 0.6em 0.8em;
        border-radius: 0.5em;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 0.4em;
        box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04) inset;
    }

    .card-row {
        display: flex;
        align-items: center;
        gap: 0.6em;
        /* Allow nested flex children to shrink when content is long */
        min-width: 0;
    }

    :global(.exif-material-icon) {
        color: var(--viz-10);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
        vertical-align: middle;
    }

    .card-values {
        display: flex;
        flex-direction: column;
        gap: 0.1em;
        justify-content: center;

        /* Flex items inside a row often need a min-width:0 so long text can
		   be ellipsized instead of forcing the container to overflow */
        min-width: 0;
        flex: 1 1 auto;
    }

    :global(.value-big) {
        font-size: 1.1em;
        font-weight: 600;
    }

    .value-sub {
        font-size: 0.9em;
    }

    :global(.value-big),
    .value-sub {
        color: var(--viz-20);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .rating-container {
        margin-top: 0.75em;
        display: flex;
        align-items: center;
        gap: 0.5em;
    }
</style>
