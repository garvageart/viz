<script lang="ts">
    import { type ImageAsset, getAssetImagePath } from "@viz/api";

    interface Props {
        asset: ImageAsset;
        disabled?: boolean;
    }

    let { asset, disabled = false }: Props = $props();

    let imgSrc = $derived(getAssetImagePath(asset, "thumbnail"));
    let altText = $derived(asset.name ?? asset.image_metadata?.file_name ?? "");
</script>

<div class="basic-grid-card" class:disabled>
    {#if disabled}
        <div class="disabled-overlay"></div>
    {/if}
    <img class="basic-thumb-img" src={imgSrc} alt={altText} loading="lazy" crossorigin="use-credentials" />
</div>

<style lang="scss">
    .basic-grid-card {
        position: relative;
        width: 100%;
        height: 100%;
        border-radius: var(--viz-radius-md, 8px);
        overflow: hidden;
        background: var(--viz-color-surface-2, rgba(255, 255, 255, 0.05));

        .disabled-overlay {
            position: absolute;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 2;
        }

        .basic-thumb-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }
    }
</style>
