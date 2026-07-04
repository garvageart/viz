<script lang="ts">
    import type { ImageAsset } from "$lib/api";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import { getImageLabel, getTakenAt } from "$lib/utils/images";
    import { DateTime } from "luxon";
    import ImageLabelViewer from "../image-tools/ImageLabelViewer.svelte";
    import IconButton from "$lib/components/ui/IconButton.svelte";
    import type { MouseEventHandler } from "svelte/elements";

    let { asset, clickHandler }: { asset: ImageAsset; clickHandler?: MouseEventHandler<HTMLElement> } = $props();
    let takenAt = $derived(getTakenAt(asset));
</script>

<div class="photo-tooltip-content">
    {#if asset.name || asset.image_metadata?.file_name}
        <div class="tooltip-row top-row">
            <span class="tooltip-value tooltip-label" title={asset.name || asset.image_metadata?.file_name}
                >{asset.name || asset.image_metadata?.file_name}</span
            >

            {#if clickHandler}
                <IconButton
                    iconName="edit"
                    class="edit-button"
                    size="1rem"
                    onclick={(e) => {
                        clickHandler?.(e);
                    }}
                />
            {/if}
        </div>
    {/if}
    {#if takenAt}
        <div class="tooltip-row">
            <MaterialIcon iconName="calendar_clock" grade={-25} weight={300} size="1rem" />
            <span class="tooltip-value">{DateTime.fromJSDate(takenAt).toFormat("dd LLL yyyy • HH:mm")}</span>
            <ImageLabelViewer label={getImageLabel(asset)} variant="compact" enableSelection={false} />
        </div>
    {/if}
    <div class="tooltip-row">
        <MaterialIcon iconName="person" weight={300} size="1rem" />
        <span class="tooltip-value">{asset.owner?.name}</span>
    </div>
</div>

<style lang="scss">
    .photo-tooltip-content {
        display: flex;
        flex-direction: column;
        gap: 2px;
        text-align: left;
        min-width: 15vw;
    }

    .tooltip-row {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-xs);

        :global(.edit-button) {
            padding: var(--viz-spacing-xs)
        }
    }

    .top-row {
        justify-content: space-between;
    }

    .tooltip-label {
        font-weight: 600;
    }

    .tooltip-value {
        opacity: 0.9;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
</style>
