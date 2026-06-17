<script lang="ts">
    import { type ImageAsset } from "$lib/api";
    import ImageCard from "$lib/components/ui/ImageCard.svelte";
    import { selectionManager } from "$lib/states/selection.svelte";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";

    let activeScope = $derived(selectionManager.activeScope);
    let activeItem = $derived(activeScope?.active as ImageAsset | undefined);

    // activeScope.source contains the list of items
    let filmstripImages = $derived((activeScope?.source as ImageAsset[]) ?? []);

    let activeItemIndex = $derived(filmstripImages.findIndex((img) => img.uid === activeItem?.uid));

    let selectedItems = $derived(activeScope?.selected ?? new Set<ImageAsset>());

    let selectionAnchor = $state<ImageAsset | null>(null);

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

<nav
    class="filmstrip-container {orientation}"
    aria-label="Filmstrip"
    onwheel={handleWheel}
    bind:this={containerRef}
>
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
                onclick={(e) => handleImageClick(image, e)}
                onkeydown={(e) => handleItemKeydown(e, image)}
                role="button"
                tabindex="0"
                aria-pressed={isActive}
                aria-label={`Select image ${image.name}`}
                bind:this={itemRefs[i]}
            >
                <ImageCard
                    asset={image}
                    variant="mini"
                    objectFit="contain"
                    imageVariant="thumbnail"
                />
            </div>
        {/each}
    {/if}
</nav>

<style lang="scss">
    .filmstrip-container {
        display: flex;
        gap: 0.5rem;
        padding: 0.5rem;
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
                min-width: 7em;
                max-width: 10em;
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
                width: 100%;
                min-height: 7em;
                max-height: 10em;
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
        border-radius: 2px;
        overflow: hidden;
        cursor: pointer;
        background-color: #0d0d0d;
        border: 1px solid var(--viz-80);
        transition: background-color 0.1s ease, border-color 0.1s ease;
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
