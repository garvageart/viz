<script lang="ts">
    import { type ImageAsset, getFullImagePath } from "$lib/api";
    import ImageLabelViewer from "$lib/components/image-tools/ImageLabelViewer.svelte";
    import AssetImage from "$lib/components/ui/AssetImage.svelte";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import ContextMenu from "$lib/context-menu/ContextMenu.svelte";
    import { createImageMenu } from "$lib/context-menu/menus/images";
    import { selectionManager } from "$lib/states/selection.svelte";
    import { getImageLabel } from "$lib/utils/images";

    let activeScope = $derived(selectionManager.activeScope);
    let activeItem = $derived(activeScope?.active as ImageAsset | undefined);
    let isImage = $derived(!!activeItem?.image_paths);

    let selectionCount = $derived(activeScope?.size ?? 0);
    let imageSrc = $derived(activeItem?.image_paths?.preview ? getFullImagePath(activeItem.image_paths.preview) : null);

    let showMenu = $state(false);
    let menuAnchor = $state<{ x: number; y: number } | HTMLElement | null>(null);
    let menuItems = $derived.by(() => {
        if (!activeItem || !activeScope) {
            return [];
        }

        return createImageMenu([activeItem], activeScope, {
            onDelete(deletedUIDs) {
                activeScope?.remove(deletedUIDs);
            }
        });
    });

    function handleContextMenu(e: MouseEvent) {
        if (!activeItem) {
            return;
        }

        e.preventDefault();
        menuAnchor = { x: e.clientX, y: e.clientY };
        showMenu = true;
    }
</script>

<div class="preview-container" role="presentation" oncontextmenu={handleContextMenu}>
    {#if isImage}
        {#if activeItem && imageSrc}
            <div class="image-wrapper">
                <AssetImage
                    asset={activeItem}
                    variant="preview"
                    objectFit="contain"
                    alt={activeItem.name}
                    loading="lazy"
                />
            </div>
            <div class="info">
                <span class="filename" title={activeItem.name}>{activeItem.name}</span>
                <span class="meta">
                    {activeItem.width}x{activeItem.height} • {activeItem.image_metadata?.file_type?.toUpperCase() ??
                        "IMG"}
                    <ImageLabelViewer label={getImageLabel(activeItem)} variant="compact" enableSelection={false} />
                    {#if activeItem.favourited}
                        <MaterialIcon iconName="favorite" style="font-size: 0.8rem;" fill={true} />
                    {/if}
                </span>
            </div>
        {:else if selectionCount > 0}
            <div class="placeholder">
                <MaterialIcon iconName="photo_library" opticalSize={48} style="font-size: 4rem;" />
                <span class="text">{selectionCount} items selected</span>
            </div>
        {/if}
    {:else}
        <div class="placeholder">
            <MaterialIcon iconName="image" opticalSize={48} style="font-size: 4rem;" />
            <span class="text">No image(s) selected</span>
        </div>
    {/if}

    <ContextMenu bind:showMenu items={menuItems} anchor={menuAnchor} />
</div>

<style lang="scss">
    .preview-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        padding: 0.5rem;
        color: var(--viz-text-primary);
        position: relative;
        box-sizing: border-box;
        justify-content: space-between;
        align-items: stretch;
    }

    .image-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        padding: 0.5rem;
        height: 100%;
    }

    .info {
        padding: var(--viz-spacing-std);
        background-color: var(--viz-surface-base);
        border-top: 1px solid var(--viz-surface-hover);
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        max-width: 100%;
        box-sizing: border-box;

        .filename {
            font-size: var(--viz-font-size-lg);
            font-weight: 500;
            color: var(--viz-text-primary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .meta {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: var(--viz-text-secondary);
        }
    }

    .placeholder {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        font-size: var(--viz-font-size-lg);
    }
</style>
