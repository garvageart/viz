<script lang="ts">
    import { type ImageAsset, getAssetImagePath, listCollectionImages } from "@viz/api";
    import ImageCard from "$lib/components/ui/ImageCard.svelte";
    import ImageLightbox from "$lib/components/ui/ImageLightbox.svelte";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import { ImageLightboxState } from "$lib/components/ui/state/image-lightbox.svelte";
    import { VizMimeTypes } from "$lib/constants";
    import { contextMenu } from "$lib/context-menu";
    import { createImageMenu } from "$lib/context-menu/menus/images";
    import { draggable } from "$lib/drag-drop/directives.svelte";
    import { type CollectionUIDSelectionScope, selectionManager } from "$lib/states/selection.svelte";
    import { isCollectionData } from "$lib/utils/collections";
    import { isAssetImage } from "$lib/utils/images";

    let activeScope = $derived(selectionManager.getActiveScope());
    let activeEntity = $derived(activeScope?.selectedItems[0] ?? activeScope?.active);

    let targetScope = $derived.by(() => {
        if (isCollectionData(activeEntity)) {
            const scopeId: CollectionUIDSelectionScope = `collection-${activeEntity.uid}`;
            return selectionManager.getScope(scopeId);
        }

        return activeScope;
    });

    $effect(() => {
        if (!isCollectionData(activeEntity)) {
            return;
        }

        const scopeId: CollectionUIDSelectionScope = `collection-${activeEntity.uid}`;
        const scope = selectionManager.registerScope(scopeId);

        if (scope.source.length === 0) {
            listCollectionImages(activeEntity.uid).then((res) => {
                if (res.status === 200) {
                    const images = res.data.items.map((i) => {
                        return i.image;
                    });
                    scope.setSource(images);
                }
            });
        }
    });

    let filmstripImages = $derived((targetScope?.source ?? []).filter(isAssetImage));

    let activeItem = $derived(isAssetImage(targetScope?.active) ? targetScope.active : undefined);
    let activeItemIndex = $derived(filmstripImages.findIndex((img) => img.uid === activeItem?.uid));
    let selectedItems = $derived(
        targetScope && targetScope.size > 1
            ? targetScope.selectedItems.filter(isAssetImage)
            : activeItem
              ? [activeItem]
              : []
    );

    let selectionAnchor = $state<ImageAsset>();

    let collection = $derived(isCollectionData(activeEntity) ? activeEntity : undefined);

    function handleImageClick(image: ImageAsset, e: MouseEvent | KeyboardEvent) {
        if (!targetScope) {
            return;
        }

        // Make the scope the filmstrip operates on the active scope so
        // selection-driven panels (metadata, histogram, preview) pick up the
        // selection — mirrors how grids call setActive(scopeId) on click.
        selectionManager.setActive(targetScope.id);

        if (e.shiftKey) {
            handleRangeSelect(image);
            return;
        }

        if (e.ctrlKey || e.metaKey) {
            handleToggleSelect(image);
            return;
        }

        targetScope.select(image);
        selectionAnchor = image;
    }

    function handleRangeSelect(targetImage: ImageAsset) {
        if (!targetScope) {
            return;
        }

        const anchor = selectionAnchor || targetScope.active;
        const startIndex = anchor ? filmstripImages.findIndex((i) => i.uid === anchor.uid) : -1;
        const endIndex = filmstripImages.findIndex((i) => i.uid === targetImage.uid);

        if (startIndex === -1 || endIndex === -1) {
            targetScope.add(targetImage);
            targetScope.active = targetImage;
            selectionAnchor = targetImage;
            return;
        }

        targetScope.selected.clear();
        const start = Math.min(startIndex, endIndex);
        const end = Math.max(startIndex, endIndex);

        for (let i = start; i <= end; i++) {
            targetScope.add(filmstripImages[i]);
        }
        targetScope.active = targetImage;
    }

    function handleToggleSelect(targetImage: ImageAsset) {
        if (!targetScope) {
            return;
        }

        targetScope.toggle(targetImage);
        if (targetScope.has(targetImage)) {
            selectionAnchor = targetImage;
        } else if (selectionAnchor?.uid === targetImage.uid) {
            selectionAnchor = targetScope.active;
        }
    }

    function handleItemKeydown(e: KeyboardEvent, image: ImageAsset) {
        if (!targetScope) {
            return;
        }

        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleImageClick(image, e);
            return;
        }

        const isPrevious = e.key === "ArrowLeft" || e.key === "ArrowUp";
        const isNext = e.key === "ArrowRight" || e.key === "ArrowDown";

        if (!isPrevious && !isNext) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        const currentIdx = filmstripImages.findIndex((img) => img.uid === image.uid);
        if (currentIdx === -1) {
            return;
        }

        const targetIdx = isPrevious ? currentIdx - 1 : currentIdx + 1;
        if (targetIdx >= 0 && targetIdx < filmstripImages.length) {
            handleImageClick(filmstripImages[targetIdx], e);
        }
    }

    function handleContextMenu(e: MouseEvent, image: ImageAsset) {
        const scope = targetScope;
        if (!scope) {
            return;
        }

        // If the right-clicked image is not already selected, select it as the active item
        if (!scope.has(image)) {
            scope.select(image);
            selectionAnchor = image;
        }

        const items = createImageMenu(scope, {
            collection,
            onUpdate: (updated: ImageAsset) => {
                filmstripImages = filmstripImages.map((i) => {
                    if (i.uid === updated.uid) {
                        return updated;
                    }
                    return i;
                });
            },
            onDelete: (uids: string[]) => {
                scope.clear();
                filmstripImages = filmstripImages.filter((i) => !uids.includes(i.uid));
            }
        });

        contextMenu.open(items, e);
    }

    let containerRef = $state<HTMLElement>();
    let orientation = $state<"horizontal" | "vertical">("horizontal");

    function handleWheel(e: WheelEvent) {
        if (orientation === "horizontal" && e.deltaY !== 0) {
            e.preventDefault();
            if (containerRef) {
                containerRef.scrollLeft += e.deltaY;
            }
        }
    }

    let itemRefs: (HTMLElement | null)[] = $state([]);

    $effect(() => {
        if (containerRef) {
            const observer = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    const { width, height } = entry.contentRect;
                    orientation = width > height ? "horizontal" : "vertical";
                }
            });
            observer.observe(containerRef);
            return () => observer.disconnect();
        }
    });

    $effect(() => {
        if (activeItemIndex === -1) {
            return;
        }

        const el = itemRefs[activeItemIndex];
        if (!el) {
            return;
        }

        el.scrollIntoView({
            behavior: "instant",
            block: "nearest"
        });

        if (document.activeElement && containerRef?.contains(document.activeElement)) {
            el.focus();
        }
    });

    const lightbox = new ImageLightboxState();
    let firstSelectedImage = $derived(targetScope?.active ?? targetScope?.selectedItems[0]);

    function openLightbox(asset?: ImageAsset) {
        const target = asset ?? firstSelectedImage;
        if (target) {
            lightbox.open(target);
        }
    }

    function navigateLightbox(delta: -1 | 1) {
        if (!lightbox.activeImage || filmstripImages.length === 0) {
            return;
        }

        const idx = filmstripImages.findIndex((i) => i.uid === lightbox.activeImage!.uid);
        if (idx === -1) {
            return;
        }

        const nextIdx = (idx + delta + filmstripImages.length) % filmstripImages.length;
        lightbox.image = filmstripImages[nextIdx];
    }

    function prevLightboxImage() {
        navigateLightbox(-1);
    }

    function nextLightboxImage() {
        navigateLightbox(1);
    }
</script>

<nav class="filmstrip-container {orientation}" aria-label="Filmstrip" onwheel={handleWheel} bind:this={containerRef}>
    {#if filmstripImages.length === 0}
        <div class="empty-state">
            <div class="empty-icon-wrapper">
                <MaterialIcon iconName="broken_image" size="2rem" />
            </div>
            <div class="empty-text-wrapper">
                <span class="empty-title">No assets in this view</span>
                <span class="empty-subtitle">Select a folder or collection to view assets</span>
            </div>
        </div>
    {:else}
        {#each filmstripImages as image, i (image.uid)}
            {@const isActive = activeItem?.uid === image.uid}
            {@const isSelected = targetScope?.has(image)}
            <button
                class="filmstrip-item"
                class:active={isActive}
                class:selected={isSelected}
                use:draggable={{
                    items: () => {
                        if (!targetScope) {
                            return [];
                        }

                        if (!targetScope.has(image)) {
                            selectionManager.setActive(targetScope.id);
                            targetScope?.select(image);
                        }

                        const uids = selectedItems?.map((i) => i.uid) ?? [image.uid];
                        const count = uids.length;
                        return [
                            {
                                mimeType: VizMimeTypes.IMAGE_UIDS,
                                payload: uids,
                                label: count > 1 ? `${count} photos` : image.name,
                                thumbnailUrl: getAssetImagePath(image, "thumbnail")
                            }
                        ];
                    }
                }}
                oncontextmenu={(e) => handleContextMenu(e, image)}
                onclick={(e) => handleImageClick(image, e)}
                ondblclick={() => openLightbox(image)}
                onkeydown={(e) => handleItemKeydown(e, image)}
                aria-pressed={isSelected}
                aria-label={`Select image ${image.name}`}
                bind:this={itemRefs[i]}
            >
                <ImageCard asset={image} variant="mini" objectFit="contain" resolution="thumbnail" />
            </button>
        {/each}
    {/if}
</nav>

{#if lightbox.activeImage}
    <ImageLightbox
        lightboxImage={lightbox.activeImage}
        show={lightbox.show}
        onClose={() => lightbox.close()}
        {nextLightboxImage}
        {prevLightboxImage}
        onImageUpdated={(image) => {
            lightbox.image = image;
            filmstripImages = filmstripImages.map((i) => {
                if (i.uid === image.uid) {
                    return image;
                }
                return i;
            });
        }}
    />
{/if}

<style lang="scss">
    .filmstrip-container {
        display: flex;
        gap: var(--viz-spacing-sm);
        padding: var(--viz-spacing-sm);
        align-items: center;
        box-sizing: border-box;
        width: 100%;
        height: 100%;

        &:focus,
        &:focus-visible {
            outline: none;
            box-shadow: none;
        }

        .filmstrip-item {
            height: 100%;
        }

        &.horizontal {
            flex-direction: row;
            overflow-x: auto;
            overflow-y: hidden;

            .filmstrip-item {
                min-width: 12rem;
                max-width: 12rem;
            }

            .empty-state {
                flex-direction: row;
                gap: var(--viz-spacing-sm);

                .empty-text-wrapper {
                    align-items: flex-start;
                    text-align: left;
                }
            }
        }

        &.vertical {
            flex-direction: column;
            overflow-x: hidden;
            overflow-y: auto;

            .filmstrip-item {
                min-height: 12rem;
                max-height: 12rem;
            }

            .empty-state {
                flex-direction: column;
                gap: var(--viz-spacing-xs);

                .empty-text-wrapper {
                    align-items: center;
                    text-align: center;
                }
            }
        }
    }

    .empty-state {
        color: var(--viz-text-secondary);
        padding: var(--viz-spacing-sm);
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;

        .empty-icon-wrapper {
            display: flex;
            align-items: center;
            justify-content: center;
            color: color-mix(in srgb, var(--viz-accent) 35%, var(--viz-border-subtle));
            background-color: var(--viz-surface-card);
            border-radius: var(--viz-border-radius-md);
            padding: var(--viz-spacing-xs);
            border: var(--viz-border-thin);
            border-color: var(--viz-surface-panel);
        }

        .empty-text-wrapper {
            display: flex;
            flex-direction: column;
            text-align: left;
        }

        .empty-title {
            font-size: var(--viz-font-size-lg);
            font-weight: 600;
            color: var(--viz-text-primary);
            font-family: var(--viz-display-font);
        }

        .empty-subtitle {
            font-size: var(--viz-font-size-std);
            color: var(--viz-text-secondary);
            font-family: var(--viz-mono-font);
        }
    }

    .filmstrip-item {
        position: relative;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        cursor: pointer;
        background-color: #0d0d0d;
        transition:
            background-color 0.1s ease,
            border-color 0.1s ease;
        flex-shrink: 0;
        box-sizing: border-box;

        &:focus,
        &:focus-visible {
            outline: none;
            box-shadow: none;
        }

        &:hover {
            background-color: #1a1a1a;
            border-color: var(--viz-border-subtle);
        }

        &.active {
            border-color: var(--viz-primary);
            background-color: #1a1a1a;
            box-shadow: 0 0 0 2px var(--viz-primary);
            z-index: 2;
            outline: none;
        }

        &.selected:not(.active) {
            border-color: var(--viz-primary);
            background-color: #1a1a1a;
            box-shadow: 0 0 0 1px var(--viz-primary);
            z-index: 1;
        }
    }
</style>
