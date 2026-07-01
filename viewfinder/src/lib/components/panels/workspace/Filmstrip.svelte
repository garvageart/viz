<script lang="ts">
    import { page } from "$app/state";
    import { type ImageAsset } from "$lib/api";
    import ImageCard from "$lib/components/ui/ImageCard.svelte";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import { VizMimeTypes } from "$lib/constants";
    import ContextMenu from "$lib/context-menu/ContextMenu.svelte";
    import { createImageMenu } from "$lib/context-menu/menus/images";
    import { DragData } from "$lib/drag-drop/data";
    import { selectionManager, SelectionScopeNames } from "$lib/states/selection.svelte";
    import { workspaceState } from "$lib/states/workspace.svelte";

    let activeScope = $derived(selectionManager.activeScope);
    let activeItem = $derived(activeScope?.active as ImageAsset | undefined);

    // activeScope.source contains the list of items
    let filmstripImages = $derived((activeScope?.source as ImageAsset[]) ?? []);
    let activeItemIndex = $derived(filmstripImages.findIndex((img) => img.uid === activeItem?.uid));
    let selectedItems = $derived(
        activeScope && activeScope.size > 1
            ? (activeScope.selectedItems as ImageAsset[])
            : activeItem
              ? [activeItem]
              : []
    );

    let selectionAnchor = $state<ImageAsset | null>(null);

    let collection = $derived.by(() => {
        if (!activeScope?.id) {
            return undefined;
        }

        let collectionUid: string | null = null;
        if (activeScope.id.startsWith(SelectionScopeNames.COLLECTION_PREFIX)) {
            collectionUid = activeScope.id.replace(SelectionScopeNames.COLLECTION_PREFIX, "");
        } else if (activeScope.id.startsWith("filmstrip-collection-")) {
            collectionUid = activeScope.id.replace("filmstrip-collection-", "");
        }

        if (!collectionUid) {
            return undefined;
        }

        // 1. Try to get it from the workspace views
        const view = workspaceState.workspace?.findViewWithPath("/collections/" + collectionUid);
        if (view?.viewData?.data) {
            return view.viewData.data;
        }

        // 2. Try to get it from the current page data
        if (page.data?.uid === collectionUid) {
            return page.data;
        }

        return undefined;
    });

    // Context menu state
    let ctxShowMenu = $state(false);
    let ctxItems = $derived(
        createImageMenu(filmstripImages, activeScope, {
            collection,
            onUpdate: (image: ImageAsset) => {
                activeScope.updateItem(image, filmstripImages);
                filmstripImages = filmstripImages.map((i) => (i.uid === image.uid ? image : i));
            },
            onDelete: (uids: string[]) => {
                activeScope.clear();
                filmstripImages = filmstripImages.filter((i) => !uids.includes(i.uid));
            }
        })
    );
    let ctxAnchor: { x: number; y: number } | HTMLElement | null = $state(null);

    function handleImageClick(image: ImageAsset, e: MouseEvent | KeyboardEvent) {
        if (!activeScope) {
            return;
        }

        if (e.shiftKey) {
            const ids = filmstripImages.map((i) => i.uid);
            const endIndex = ids.indexOf(image.uid);
            const anchor = selectionAnchor || activeScope.active;
            const startIndex = anchor ? ids.indexOf(anchor.uid) : -1;

            if (startIndex !== -1 && endIndex !== -1) {
                activeScope.selected.clear();

                const start = Math.min(startIndex, endIndex);
                const end = Math.max(startIndex, endIndex);

                for (let i = start; i <= end; i++) {
                    activeScope.add(filmstripImages[i]);
                }
                activeScope.active = image;
            } else {
                activeScope.add(image);
                activeScope.active = image;
                selectionAnchor = image;
            }
        } else if (e.ctrlKey || e.metaKey) {
            activeScope.toggle(image);
            if (activeScope.has(image)) {
                selectionAnchor = image;
            } else if (selectionAnchor?.uid === image.uid) {
                selectionAnchor = activeScope.active || null;
            }
        } else {
            activeScope.select(image);
            selectionAnchor = image;
        }
    }

    function handleItemKeydown(e: KeyboardEvent, image: ImageAsset) {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleImageClick(image, e);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
            e.preventDefault();
            e.stopPropagation();
            if (activeScope) {
                const idx = filmstripImages.findIndex((img) => img.uid === image.uid);
                if (idx > 0) {
                    const targetImage = filmstripImages[idx - 1];
                    handleImageClick(targetImage, e);
                }
            }
        } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
            e.preventDefault();
            e.stopPropagation();
            if (activeScope) {
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
        if (!activeScope) {
            return;
        }

        e.preventDefault();

        // If the right-clicked image is not already selected, select it as the active item
        if (!activeScope.has(image)) {
            activeScope.select(image);
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
                    block: "nearest",
                    inline: "center"
                });

                if (document.activeElement && containerRef?.contains(document.activeElement)) {
                    el.focus();
                }
            }
        }
    });
</script>

<nav class="filmstrip-container {orientation}" aria-label="Filmstrip" onwheel={handleWheel} bind:this={containerRef}>
    {#if filmstripImages.length === 0}
        <div class="empty-state">
            <div class="empty-icon-wrapper">
                <MaterialIcon iconName="image_not_supported" size="1.5rem" />
            </div>
            <div class="empty-text-wrapper">
                <span class="empty-title">No assets in this view</span>
                <span class="empty-subtitle">Select a folder or collection to view assets</span>
            </div>
        </div>
    {:else}
        {#each filmstripImages as image, i (image.uid)}
            {@const isActive = activeItem?.uid === image.uid}
            {@const isSelected = activeScope?.has(image) ?? false}
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
                    if (!activeScope?.has(image)) {
                        if (e.shiftKey || e.ctrlKey || e.metaKey) {
                            activeScope?.add(image);
                        } else {
                            activeScope?.select(image);
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
                onkeydown={(e) => handleItemKeydown(e, image)}
                role="button"
                tabindex="0"
                aria-pressed={isActive}
                aria-label={`Select image ${image.name}`}
                bind:this={itemRefs[i]}
            >
                <ImageCard asset={image} variant="mini" objectFit="contain" imageVariant="thumbnail" />
            </div>
        {/each}
    {/if}
    <!-- Context menu for right-click on assets -->
    <ContextMenu bind:showMenu={ctxShowMenu} items={ctxItems} anchor={ctxAnchor} offsetY={ctxOffsetY} />
</nav>

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
                min-width: 8rem;
                max-width: 8rem;
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
                min-height: 8rem;
                max-height: 8rem;
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
        color: var(--viz-40);
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
            color: var(--viz-60);
            background-color: var(--viz-95);
            border-radius: var(--viz-border-radius-md);
            padding: var(--viz-spacing-xs);
            border: var(--viz-border-thin);
            border-color: var(--viz-90);
        }

        .empty-text-wrapper {
            display: flex;
            flex-direction: column;
            text-align: left;
        }

        .empty-title {
            font-size: var(--viz-font-size-sm);
            font-weight: 600;
            color: var(--viz-text-color);
            font-family: var(--viz-display-font);
        }

        .empty-subtitle {
            font-size: var(--viz-font-size-xs);
            color: var(--viz-40);
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
        border: 1px solid var(--viz-80);
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
            border-color: var(--viz-70);
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
