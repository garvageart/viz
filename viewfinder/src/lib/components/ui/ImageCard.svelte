<script lang="ts">
    import { type ImageAsset } from "$lib/api";
    import { VizMimeTypes } from "$lib/constants";
    import { DragData } from "$lib/drag-drop/data";
    import { getImageLabel, getTakenAt } from "$lib/utils/images";
    import AssetImage, { type AssetImageProps } from "./AssetImage.svelte";
    import MaterialIcon from "./MaterialIcon.svelte";

    let {
        asset,
        variant = "full",
        showMetadata = $bindable(true),
        objectFit = "cover",
        imageVariant = "thumbnail",
        priority = false,
        isSelected = false
    }: {
        asset: ImageAsset;
        variant?: "mini" | "full";
        showMetadata?: boolean;
        isSelected?: boolean;
    } & Omit<AssetImageProps, "asset" | "variant"> & {
            imageVariant?: AssetImageProps["variant"];
        } = $props();

    let imageDate = $derived(getTakenAt(asset));
    // let placeholderDataURL = $derived(getThumbhashURL(asset));
    let imageLoaded = $state(false);

    function handleDragStart(e: DragEvent) {
        if (variant === "mini") {
            return;
        }

        if (!e.dataTransfer) {
            return;
        }

        const dragData = new DragData(VizMimeTypes.IMAGE_UIDS, [asset.uid]);
        dragData.setData(e.dataTransfer);
        e.dataTransfer.effectAllowed = "copy";

        const img = (e.currentTarget as HTMLElement).querySelector(".image-card-image") as HTMLImageElement;
        if (img) {
            e.dataTransfer.setDragImage(img, 0, 0);
        }
    }
</script>

{#if variant === "mini"}
    <div title={asset.name || asset.image_metadata?.file_name} class="mini-card">
        <div class="mini-image-wrapper">
            <AssetImage
                variant={imageVariant}
                {asset}
                {objectFit}
                {priority}
                alt={asset.name || asset.image_metadata?.file_name}
                loading="lazy"
            />
        </div>
        <div class="mini-footer">
            <span class="mini-filename">{asset.name || asset.image_metadata?.file_name}</span>
            <div class="mini-meta">
                <div class="mini-left">
                    {#if asset.favourited}
                        <div class="mini-favorite">
                            <MaterialIcon iconName="favorite" size="1rem" fill={true} />
                        </div>
                    {/if}
                    <div class="mini-rating">
                        {#each Array(5) as _, i (i)}
                            <div class="dot" class:filled={i < (asset.image_metadata?.rating ?? 0)}></div>
                        {/each}
                    </div>
                </div>
                {#if asset.image_metadata?.label}
                    <div class="mini-label-indicator" style="background-color: {getImageLabel(asset)}"></div>
                {/if}
            </div>
        </div>
    </div>
{:else}
    <div
        class="image-card"
        class:selected={isSelected}
        draggable="true"
        title={asset.name || asset.image_metadata?.file_name}
        role="button"
        tabindex="0"
        data-asset-id={asset.uid}
        ondragstart={handleDragStart}
        ondragend={() => {
            DragData.clear();
        }}
    >
        <div class="image-container">
            <AssetImage
                class="card-image"
                {asset}
                variant={imageVariant}
                {objectFit}
                {priority}
                alt="{(asset.name || asset.image_metadata?.file_name) ?? ''}{asset.uploaded_by
                    ? ` by ${asset.uploaded_by.name}`
                    : ''}"
                title="{(asset.name || asset.image_metadata?.file_name) ?? ''}{asset.uploaded_by
                    ? ` by ${asset.uploaded_by.name}`
                    : ''}"
                loading="lazy"
                crossorigin="use-credentials"
                onload={() => (imageLoaded = true)}
            />
            {#if asset.favourited || asset.image_metadata?.label}
                <div class="card-overlays">
                    {#if asset.image_metadata?.label}
                        <div
                            class="overlay-badge label-badge"
                            style="background-color: {getImageLabel(asset)}"
                            title="Label Color"
                        ></div>
                    {/if}
                    {#if asset.favourited}
                        <div class="overlay-badge favorite-badge" title="Favourited">
                            <MaterialIcon iconName="favorite" size="1rem" fill={true} />
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
        {#if showMetadata}
            <div class="image-card-meta">
                <span class="image-card-name" title={asset.name || asset.image_metadata?.file_name}
                    >{asset.name || asset.image_metadata?.file_name}</span
                >
                <div class="image-card-details" title="Photo taken at {imageDate.toLocaleString()}">
                    <div class="image-card-date-group">
                        <span class="image-card-date">{imageDate.toLocaleDateString()}</span>
                        <span class="image-card-divider">•</span>
                        <span class="image-card-time">{imageDate.toLocaleTimeString().replace(/:\d{2}$/, "")}</span>
                    </div>
                </div>
            </div>
        {/if}
    </div>
{/if}

<style lang="scss">
    .mini-card {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        overflow: hidden;
        background-color: var(--viz-surface-card);
        border: 1px solid var(--viz-border-subtle);
        box-sizing: border-box;
    }

    .mini-image-wrapper {
        flex: 1;
        width: 100%;
        height: 0;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: var(--viz-surface-panel);
    }

    .mini-footer {
        padding: var(--viz-spacing-sm);
        background-color: var(--viz-surface-card);
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xxs);
        border-top: var(--viz-border-thin);
        border-top-color: var(--viz-border-subtle);

        .mini-filename {
            font-size: var(--viz-font-size-sm);
            font-weight: 600;
            color: var(--viz-text-secondary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            text-align: center;
            width: 100%;
        }

        .mini-meta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: var(--viz-spacing-xs);
            height: 0.75rem;
        }

        .mini-left {
            display: flex;
            align-items: center;
            gap: var(--viz-spacing-xs);
        }

        .mini-favorite {
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--viz-color-tag-red);
        }

        .mini-rating {
            display: flex;
            gap: var(--viz-spacing-xs);

            .dot {
                width: 0.35rem;
                height: 0.35rem;
                border-radius: var(--viz-border-radius-pill);
                background-color: var(--viz-border-subtle);

                &.filled {
                    background-color: var(--viz-primary);
                }
            }
        }

        .mini-label-indicator {
            width: 0.5rem;
            height: 0.5rem;
            border-radius: 1px;
            flex-shrink: 0;
        }
    }

    .image-card {
        min-width: 100%;
        max-width: 100%;
        height: auto;
        background-color: var(--viz-surface-card);
        border: 1px solid var(--viz-border-subtle);
        border-radius: var(--viz-border-radius-md);
        position: relative;
        overflow: hidden;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;

        &:hover {
            background-color: var(--viz-surface-hover);
            border-color: var(--viz-primary);
        }
    }

    .image-card.selected {
        border-color: var(--viz-primary);
        box-shadow: 0 0 0 1px var(--viz-primary);
        pointer-events: none;
    }

    .image-card-meta {
        padding: var(--viz-spacing-md);
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-direction: column;
        gap: var(--viz-spacing-xs);
        box-sizing: border-box;
    }

    .image-card-name {
        font-size: var(--viz-font-size-lg);
        font-weight: 600;
        color: var(--viz-text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
        margin: 0;
    }

    .image-card-details {
        display: flex;
        align-items: center;
        width: 100%;
        justify-content: space-between;
    }

    .image-card-divider {
        color: var(--viz-text-muted);
    }

    .image-card-date-group {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-xs);
        font-family: var(--viz-mono-font);
        font-size: var(--viz-font-size-std);
        color: var(--viz-text-secondary);
    }

    .image-container {
        height: 13em;
        background-color: var(--viz-surface-panel);
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;
        overflow: hidden;
        border-bottom: 1px solid var(--viz-border-subtle);

        :global(.card-image) {
            width: 100%;
            height: 100%;
        }
    }

    .card-overlays {
        position: absolute;
        top: var(--viz-spacing-sm);
        left: var(--viz-spacing-sm);
        right: var(--viz-spacing-sm);
        display: flex;
        justify-content: space-between;
        align-items: center;
        pointer-events: none;
        z-index: 2;
    }

    .overlay-badge {
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--viz-border-radius-pill);
        backdrop-filter: blur(4px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-sizing: border-box;

        &.favorite-badge {
            background-color: rgba(0, 0, 0, 0.55);
            color: var(--viz-error-color);
            width: 1.5rem;
            height: 1.5rem;
            margin-left: auto; /* push heart to right if label is absent */
        }

        &.label-badge {
            width: 0.65rem;
            height: 0.65rem;
            border-radius: var(--viz-border-radius-pill);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }
    }
</style>
