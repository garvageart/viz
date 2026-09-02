<script lang="ts">
    import { type ImageAsset } from "@viz/api";
    import ImageLabelViewer from "$lib/components/image-tools/ImageLabelViewer.svelte";
    import AssetImage from "$lib/components/ui/AssetImage.svelte";
    import Favourite from "$lib/components/ui/Favourite.svelte";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import NoImageSelected from "$lib/components/ui/misc/NoImageSelected.svelte";
    import { contextMenu } from "$lib/context-menu";
    import { createImageMenu } from "$lib/context-menu/menus/images";
    import { SelectionScope, selectionManager } from "$lib/states/selection.svelte";
    import { getImageLabel, isAssetImage } from "$lib/utils/images";

    let activeScope = $derived(selectionManager.activeScope as SelectionScope<ImageAsset> | undefined);
    let activeItem = $derived(activeScope?.active);
    let isImage = $derived(isAssetImage(activeItem));

    let selectionCount = $derived(activeScope?.size ?? 0);

    function handleContextMenu(e: MouseEvent) {
        if (!activeItem || !activeScope) {
            return;
        }

        const items = createImageMenu([activeItem], activeScope, {
            onDelete(deletedUIDs) {
                activeScope.removeUids(deletedUIDs);
            },
            onUpdate(updated) {
                activeScope.updateItem(updated, activeScope.source);
            }
        });

        contextMenu.open(items, e);
    }
</script>

<div class="preview-container" role="presentation" oncontextmenu={handleContextMenu}>
    {#if isImage}
        {#if activeItem}
            <div class="image-container">
                <AssetImage
                    asset={activeItem}
                    resolution="preview"
                    objectFit="contain"
                    alt={activeItem.name}
                    priority
                    placeholder="thumbnail"
                />
            </div>
            <div class="info">
                <span class="filename" title={activeItem.name}>{activeItem.name}</span>
                <span class="meta">
                    {activeItem.width}x{activeItem.height} • {activeItem.image_metadata?.file_type?.toUpperCase() ??
                        "IMG"}
                    <ImageLabelViewer label={getImageLabel(activeItem)} variant="compact" enableSelection={false} />
                    {#if activeItem.favourited}
                        <Favourite />
                    {/if}
                </span>
            </div>
        {:else if selectionCount > 0}
            <div class="placeholder">
                <MaterialIcon iconName="photo_library" opticalSize={48} size="3rem" />
                <span class="text">{selectionCount} items selected</span>
            </div>
        {/if}
    {:else}
        <NoImageSelected />
    {/if}
</div>

<style lang="scss">
    .preview-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        padding: var(--viz-spacing-std);
        color: var(--viz-text-primary);
        position: relative;
        box-sizing: border-box;
        justify-content: space-between;
        align-items: stretch;
        gap: var(--viz-spacing-sm);
    }

    .image-container {
        flex: 1;
        min-height: 15%;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: var(--viz-surface-card);
    }

    .info {
        flex-shrink: 0;
        padding: var(--viz-spacing-std);
        background-color: var(--viz-surface-base);
        border-top: 1px solid var(--viz-surface-hover);
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xs);
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
