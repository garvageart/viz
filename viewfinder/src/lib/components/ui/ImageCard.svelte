<script lang="ts">
    import { type ImageAsset } from "$lib/api";
    import { VizMimeTypes } from "$lib/constants";
    import { DragData } from "$lib/drag-drop/data";
    import { getImageLabel, getTakenAt, getThumbhashURL } from "$lib/utils/images";
    import ImageLabelViewer from "../image-tools/ImageLabelViewer.svelte";
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
    <div title={asset.name} class="mini-card">
        <div class="mini-image-wrapper">
            <AssetImage variant={imageVariant} {asset} {objectFit} {priority} alt={asset.name} loading="lazy" />
        </div>
        <div class="mini-footer">
            <span class="mini-filename">{asset.image_metadata?.file_name ?? asset.name}</span>
            <div class="mini-meta">
                <div class="mini-left">
                    {#if asset.favourited}
                        <div class="mini-favorite">
                            <MaterialIcon iconName="favorite" size="0.75rem" fill={true} />
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
        title={asset.name}
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
                {asset}
                variant={imageVariant}
                {objectFit}
                {priority}
                alt="{asset.name}{asset.uploaded_by ? ` by ${asset.uploaded_by.name}` : ''}"
                title="{asset.name}{asset.uploaded_by ? ` by ${asset.uploaded_by.name}` : ''}"
                loading="lazy"
                crossorigin="use-credentials"
                onload={() => (imageLoaded = true)}
            />
        </div>
        {#if showMetadata}
            <div class="image-card-meta">
                <span class="image-card-name" title={asset.image_metadata?.file_name}
                    >{asset.image_metadata?.file_name ?? asset.name}</span
                >
                <div class="image-card-details" title="Photo taken at {imageDate.toLocaleString()}">
                    <div class="image-card-date-group">
                        <span class="image-card-date">{imageDate.toLocaleDateString()}</span>
                        <span class="image-card-divider">•</span>
                        <span class="image-card-time">{imageDate.toLocaleTimeString().replace(/:\d{2}$/, "")}</span>
                    </div>
                    <div class="image-card-indicators">
                        {#if asset.image_metadata?.label}
                            <ImageLabelViewer label={getImageLabel(asset)} enableSelection={false} variant="compact" />
                        {/if}
                        {#if asset.favourited}
                            <MaterialIcon iconName="favorite" size="1rem" fill={true} />
                        {/if}
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
    }

    .mini-image-wrapper {
        flex: 1;
        width: 100%;
        height: 0;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: var(--viz-90);
    }

    .mini-footer {
        padding: var(--viz-spacing-xs);
        background-color: var(--viz-100);
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xxs);
        border-top: var(--viz-border-thin);
        border-top-color: var(--viz-90);

        .mini-filename {
            font-size: 0.7rem;
            font-weight: 600;
            color: var(--viz-40);
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
            color: var(--viz-error-color);
        }

        .mini-rating {
            display: flex;
            gap: var(--viz-spacing-xxs);

            .dot {
                width: 0.25rem;
                height: 0.25rem;
                border-radius: 50%;
                background-color: var(--viz-80);

                &.filled {
                    background-color: var(--viz-10);
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
        max-height: 25em;
        background-color: var(--viz-80);
        padding: 0.8em;
        border-radius: 0.5em;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        position: relative;

        &.selected::after {
            content: "";
            position: absolute;
            inset: 0;
            border: 2px solid var(--viz-primary);
            border-radius: inherit;
            pointer-events: none;
            z-index: 1;
        }

        &:focus {
            outline: none;
        }

        &:hover {
            background-color: var(--viz-90);
        }
    }

    .image-card-meta {
        margin-top: 0.5rem;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-direction: column;
        font-size: 0.9rem;
    }

    .image-card-name {
        font-weight: bold;
        margin-bottom: 0.2em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
    }

    .image-card-details {
        color: var(--viz-20);
        display: flex;
        align-items: center;
        width: 100%;
        justify-content: space-between;
    }

    .image-card-divider {
        color: var(--viz-40);
    }

    .image-card-time {
        font-size: 0.9rem;
    }

    .image-card-indicators {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        margin-left: auto;
        min-height: 1.2em;
    }

    .image-container {
        height: 13em;
        background-color: var(--viz-80);
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;
    }
</style>
