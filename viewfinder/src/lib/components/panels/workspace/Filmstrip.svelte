<script lang="ts">
    import { page } from "$app/state";
    import { type Collection, type CollectionDetailResponse, type ImageAsset } from "$lib/api";
    import ImageCard from "$lib/components/ui/ImageCard.svelte";
    import ImageLightbox from "$lib/components/ui/ImageLightbox.svelte";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import { VizMimeTypes } from "$lib/constants";
    import ContextMenu from "$lib/context-menu/ContextMenu.svelte";
    import { createImageMenu } from "$lib/context-menu/menus/images";
    import { DragData } from "$lib/drag-drop/data";
    import { SelectionScope, SelectionScopeNames, selectionManager } from "$lib/states/selection.svelte";
    import { workspaceState } from "$lib/states/workspace.svelte";

    let filmstripScope = $derived(selectionManager.activeScope as SelectionScope<ImageAsset> | undefined);

    // The filmstrip reads data from the active scope's .source (which is
    // populated by whichever grid or page the user is interacting with).
    // For collection contexts we use a dedicated "filmstrip-collection-{uid}"
    // child scope for SELECTION operations so the filmstrip keeps its own
    // selected/active state decoupled from the grid — but the image data
    // always comes from the active scope (whose source PhotoAssetGrid or
    // the collections-list page already populated).
    let filmstripImages = $derived((selectionManager.activeScope?.source as ImageAsset[]) ?? []);

    let activeItem = $derived(filmstripScope?.active);
    let activeItemIndex = $derived(filmstripImages.findIndex((img) => img.uid === activeItem?.uid));
    let selectedItems = $derived(
        filmstripScope && filmstripScope.size > 1 ? filmstripScope.selectedItems : activeItem ? [activeItem] : []
    );

    let selectionAnchor = $state<ImageAsset>();

    function isCollectionData(data: unknown): data is Collection | CollectionDetailResponse {
        return typeof data === "object" && data !== null && "uid" in data;
    }

    let collection = $derived.by(() => {
        if (!filmstripScope?.id) {
            return undefined;
        }

        let collectionUid: string | null = null;
        if (filmstripScope.id.startsWith(SelectionScopeNames.COLLECTION_PREFIX)) {
            collectionUid = filmstripScope.id.replace(SelectionScopeNames.COLLECTION_PREFIX, "");
        } else if (filmstripScope.id.startsWith(SelectionScopeNames.FILMSTRIP_COLLECTION_PREFIX)) {
            collectionUid = filmstripScope.id.replace(SelectionScopeNames.FILMSTRIP_COLLECTION_PREFIX, "");
        }

        if (!collectionUid) {
            return undefined;
        }

        // 1. Try to get it from the workspace views
        const viewData = workspaceState.workspace?.findViewWithPath("/collections/" + collectionUid)?.viewData?.data;
        if (isCollectionData(viewData)) {
            return viewData;
        }

        // 2. Try to get it from the current page data
        if (page.data?.uid === collectionUid && isCollectionData(page.data)) {
            return page.data;
        }

        return undefined;
    });

    // Context menu state
    let ctxShowMenu = $state(false);
    let ctxItems = $derived(
        createImageMenu(filmstripImages, filmstripScope ?? selectionManager.activeScope, {
            collection,
            onUpdate: (image: ImageAsset) => {
                if (filmstripScope) {
                    filmstripScope.updateItem(image, filmstripImages);
                    filmstripImages = filmstripImages.map((i) => (i.uid === image.uid ? image : i));
                }
            },
            onDelete: (uids: string[]) => {
                if (filmstripScope) {
                    filmstripScope.clear();
                    filmstripImages = filmstripImages.filter((i) => !uids.includes(i.uid));
                }
            }
        })
    );
    let ctxAnchor: { x: number; y: number } | HTMLElement | null = $state(null);

    function handleImageClick(image: ImageAsset, e: MouseEvent | KeyboardEvent) {
        const scope = filmstripScope;
        if (!scope) {
            return;
        }

        // Make the scope the filmstrip operates on the active scope so
        // selection-driven panels (metadata, histogram, preview) pick up the
        // selection — mirrors how grids call setActive(scopeId) on click.
        selectionManager.setActive(scope.id);

        if (e.shiftKey) {
            const ids = filmstripImages.map((i) => i.uid);
            const endIndex = ids.indexOf(image.uid);
            const anchor = selectionAnchor || scope.active;
            const startIndex = anchor ? ids.indexOf(anchor.uid) : -1;

            if (startIndex !== -1 && endIndex !== -1) {
                scope.selected.clear();

                const start = Math.min(startIndex, endIndex);
                const end = Math.max(startIndex, endIndex);

                for (let i = start; i <= end; i++) {
                    scope.add(filmstripImages[i]);
                }
                scope.active = image;
            } else {
                scope.add(image);
                scope.active = image;
                selectionAnchor = image;
            }
        } else if (e.ctrlKey || e.metaKey) {
            scope.toggle(image);
            if (scope.has(image)) {
                selectionAnchor = image;
            } else if (selectionAnchor?.uid === image.uid) {
                selectionAnchor = scope.active;
            }
        } else {
            scope.select(image);
            selectionAnchor = image;
        }
    }

    function handleItemKeydown(e: KeyboardEvent, image: ImageAsset) {
        e.preventDefault();
        if (e.key === "Enter" || e.key === " ") {
            handleImageClick(image, e);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
            e.stopPropagation();
            if (filmstripScope) {
                const idx = filmstripImages.findIndex((img) => img.uid === image.uid);
                if (idx > 0) {
                    const targetImage = filmstripImages[idx - 1];
                    handleImageClick(targetImage, e);
                }
            }
        } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
            e.stopPropagation();
            if (filmstripScope) {
                const idx = filmstripImages.findIndex((img) => img.uid === image.uid);
                if (idx !== -1 && idx < filmstripImages.length - 1) {
                    const targetImage = filmstripImages[idx + 1];
                    handleImageClick(targetImage, e);
                }
            }
        }
    }

    let ctxOffsetY = $state(4);

    function handleContextMenu(e: MouseEvent, image: ImageAsset) {
        const scope = filmstripScope;
        if (!scope) {
            return;
        }

        e.preventDefault();

        // If the right-clicked image is not already selected, select it as the active item
        if (!scope.has(image)) {
            scope.select(image);
            selectionAnchor = image;
        }

        const spaceBelow = window.innerHeight - e.clientY;
        ctxAnchor = { x: e.clientX, y: e.clientY };

        if (spaceBelow < 320) {
            // Offset upwards to prevent overlapping/clamping issues near the bottom
            ctxOffsetY = -200;
        } else {
            ctxOffsetY = 4;
        }

        ctxShowMenu = true;
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
        if (activeItemIndex !== -1 && itemRefs[activeItemIndex]) {
            const el = itemRefs[activeItemIndex];
            if (el) {
                el.scrollIntoView({
                    behavior: "instant",
                    block: "nearest"
                });

                if (document.activeElement && containerRef?.contains(document.activeElement)) {
                    el.focus();
                }
            }
        }
    });

    let lightboxImage = $state<ImageAsset>();
    function openLightbox(asset: ImageAsset) {
        lightboxImage = asset;
    }

    function nextLightboxImage() {
        if (!lightboxImage || filmstripImages.length === 0) {
            return;
        }

        const idx = filmstripImages.findIndex((i) => i.uid === lightboxImage!.uid);
        if (idx === -1) {
            return;
        }

        const nextIdx = (idx + 1) % filmstripImages.length;
        lightboxImage = filmstripImages[nextIdx];
    }

    function prevLightboxImage() {
        if (!lightboxImage || filmstripImages.length === 0) {
            return;
        }

        const idx = filmstripImages.findIndex((i) => i.uid === lightboxImage!.uid);
        if (idx === -1) {
            return;
        }

        const nextIdx = (idx - 1 + filmstripImages.length) % filmstripImages.length;
        lightboxImage = filmstripImages[nextIdx];
    }
</script>

<nav class="filmstrip-container {orientation}" aria-label="Filmstrip" onwheel={handleWheel} bind:this={containerRef}>
    {#if filmstripImages.length === 0}
        <div class="empty-state">
            <div class="empty-icon-wrapper">
                <MaterialIcon iconName="image_not_supported" size="2rem" />
            </div>
            <div class="empty-text-wrapper">
                <span class="empty-title">No assets in this view</span>
                <span class="empty-subtitle">Select a folder or collection to view assets</span>
            </div>
        </div>
    {:else}
        {#each filmstripImages as image, i (image.uid)}
            {@const isActive = activeItem?.uid === image.uid}
            {@const isSelected = filmstripScope?.has(image) ?? false}
            <div
                class="filmstrip-item"
                class:active={isActive}
                class:selected={isSelected}
                draggable={true}
                ondragstart={(e: DragEvent) => {
                    if (!e.dataTransfer) {
                        return;
                    }

                    // Select this image if not already in the selection
                    if (!filmstripScope?.has(image)) {
                        if (filmstripScope) {
                            selectionManager.setActive(filmstripScope.id);
                        }
                        if (e.shiftKey || e.ctrlKey || e.metaKey) {
                            filmstripScope?.add(image);
                        } else {
                            filmstripScope?.select(image);
                        }
                    }

                    // Use the full selection set for drag
                    const uids = selectedItems?.map((i) => i.uid ?? undefined) ?? [image.uid];

                    const dragData = new DragData(VizMimeTypes.IMAGE_UIDS, uids);
                    dragData.setData(e.dataTransfer, "filmstrip");
                    e.dataTransfer.effectAllowed = "copy";

                    const target = e.currentTarget as HTMLElement;
                    const img = target.querySelector("img");
                    if (img) {
                        e.dataTransfer.setDragImage(img, 0, 0);
                    }
                }}
                ondragend={() => {
                    DragData.clear();
                }}
                oncontextmenu={(e) => handleContextMenu(e, image)}
                onclick={(e) => handleImageClick(image, e)}
                ondblclick={() => openLightbox(image)}
                onkeydown={(e) => handleItemKeydown(e, image)}
                role="button"
                tabindex="0"
                aria-pressed={isActive}
                aria-label={`Select image ${image.name}`}
                bind:this={itemRefs[i]}
            >
                <ImageCard asset={image} variant="mini" objectFit="contain" resolution="thumbnail" />
            </div>
        {/each}
    {/if}
    <!-- Context menu for right-click on assets -->
    <ContextMenu bind:showMenu={ctxShowMenu} items={ctxItems} anchor={ctxAnchor} offsetY={ctxOffsetY} />
</nav>

<ImageLightbox
    bind:lightboxImage
    {nextLightboxImage}
    {prevLightboxImage}
    onImageUpdated={(image) => filmstripScope?.updateItem(image, filmstripImages)}
/>

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

        &.horizontal {
            flex-direction: row;
            overflow-x: auto;
            overflow-y: hidden;

            .filmstrip-item {
                height: 100%;
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
                height: 100%;
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
            box-shadow: 0 0 0 1px var(--viz-primary);
            z-index: 1;
            outline: none;
        }

        &.selected:not(.active) {
            border-color: var(--viz-primary);
        }
    }
</style>
