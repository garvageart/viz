<script lang="ts">
    import type { ImageAsset } from "$lib/api";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import { getImageLabel, getTakenAt } from "$lib/utils/images";
    import { DateTime } from "luxon";
    import ImageLabelViewer from "../image-tools/ImageLabelViewer.svelte";

    let { asset }: { asset: ImageAsset } = $props();
    let takenAt = $derived(getTakenAt(asset));
</script>

<div class="photo-tooltip-content">
    {#if asset.image_metadata?.file_name}
        <div class="tooltip-row">
            <span class="tooltip-value tooltip-label" title={asset.image_metadata.file_name}
                >{asset.image_metadata.file_name}</span
            >
        </div>
    {/if}
    {#if takenAt}
        <div class="tooltip-row">
            <MaterialIcon iconName="calendar_clock" grade={-25} weight={300} size="1rem" />
            <span class="tooltip-value"
                >{DateTime.fromJSDate(takenAt).toFormat("dd LLL yyyy • HH:mm")}</span
            >
            <ImageLabelViewer
                label={getImageLabel(asset)}
                variant="compact"
                enableSelection={false}
            />
        </div>
    {/if}
    <div class="tooltip-row">
        <MaterialIcon iconName="person" weight={300} size="1rem" />
        <span class="tooltip-value">{asset.owner?.name}</span>
    </div>
</div>

<style lang="scss">
    :global(.tippy-box[data-theme~="viz"]) {
        background-color: var(--viz-100);
        color: var(--viz-text-color);
        border: 1px solid var(--viz-80);
        border-radius: 0.5rem;
        min-width: 15vw;
    }

    :global(.tippy-box[data-theme~="viz"][data-placement^="bottom"] > .tippy-arrow::before) {
        border-bottom-color: var(--viz-100);
    }

    .photo-tooltip-content {
        display: flex;
        flex-direction: column;
        gap: 2px;
        text-align: left;
    }

    .tooltip-row {
        display: flex;
        align-items: center;
        gap: 8px;
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
