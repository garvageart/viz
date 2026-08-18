<script lang="ts">
    import { type ImageAsset, getAssetImagePath } from "@viz/api";
    import type { HTMLImgAttributes } from "svelte/elements";
    import { getThumbhashURL } from "$lib/utils/images";

    export type ImageResolution = "thumbnail" | "preview" | "original";

    export type AssetImageProps = {
        /** The Image asset object from the API */
        asset: ImageAsset;
        /**
         * How the image should fit in its container
         * @default "cover"
         */
        objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
        /**
         * If true, the image will be loaded with "eager" priority and high fetch priority
         * @default false
         */
        priority?: boolean;
        /**
         * Force a specific image size resolution.
         * If unset, uses srcset to let the browser decide based on viewport.
         * Useful for grids where you know you only need thumbnails.
         */
        resolution?: ImageResolution;
        /**
         * Binding to the internal image element
         */
        imageElement?: HTMLImageElement;
        /**
         * If true, renders the image tag directly without a wrapper div.
         * Useful for contexts where the wrapper interferes with layout (e.g. Lightbox).
         * Note: ThumbHash placeholder is disabled in naked mode.
         * @default false
         */
        naked?: boolean;
        /**
         * If true, assumes the image is already loaded (e.g. from cache) and immediately shows it
         * without fade-in or placeholder.
         */
        initialLoaded?: boolean;
        /**
         * Placeholder shown while the main image loads.
         * - "thumbhash": low-res ThumbHash blur-up placeholder (default)
         * - "thumbnail": the asset's (typically cached) thumbnail as a sharp, instant placeholder
         * - "none": no placeholder
         * @default "thumbhash"
         */
        placeholder?: "thumbhash" | "thumbnail" | "none";
    };

    type Props = AssetImageProps & HTMLImgAttributes;

    let {
        asset,
        objectFit = "cover",
        priority = false,
        resolution,
        imageElement = $bindable(),
        naked = false,
        initialLoaded = $bindable(false),
        placeholder = "thumbhash",
        src: srcOverride,
        ...rest
    }: Props = $props();

    let loaded = $derived(initialLoaded);

    /**
     * Construct srcset using the three standard variants
     * thumbnail: ~400px
     * preview: ~1920px
     * original: full resolution
     */
    const srcset = $derived.by(() => {
        // If a specific variant or src override is requested, do not generate a srcset
        if (resolution || srcOverride) {
            return undefined;
        }

        const paths = asset.image_paths;
        if (!paths) {
            return undefined;
        }

        const set = [];
        const thumbUrl = getAssetImagePath(asset, "thumbnail");
        const prevUrl = getAssetImagePath(asset, "preview");
        const origUrl = getAssetImagePath(asset, "original");

        if (thumbUrl) {
            set.push(`${thumbUrl} 400w`);
        }
        if (prevUrl) {
            set.push(`${prevUrl} 1920w`);
        }
        if (origUrl) {
            set.push(`${origUrl} ${asset.width}w`);
        }

        return set.length > 0 ? set.join(", ") : undefined;
    });

    /**
     * Fallback src used if srcset is not supported or as the initial load source.
     * Also acts as the primary src when a specific resolution is requested.
     */
    const src = $derived.by(() => {
        if (srcOverride) {
            return srcOverride;
        }

        if (resolution) {
            return getAssetImagePath(asset, resolution);
        }

        // Fallback logic: prefer preview -> thumbnail -> original if no specific variant forced
        return (
            getAssetImagePath(asset, "preview") ||
            getAssetImagePath(asset, "thumbnail") ||
            getAssetImagePath(asset, "original")
        );
    });

    /**
     * Instant-load placeholder from ThumbHash
     */
    const thumbhash = $derived(getThumbhashURL(asset));

    /**
     * The asset's thumbnail used as a sharp, instant placeholder. Typically
     * already cached (e.g. from the grid), so it avoids a blurry ThumbHash flash
     * while a higher-resolution variant loads.
     */
    const thumbPlaceholder = $derived.by(() => {
        return getAssetImagePath(asset, "thumbnail");
    });
</script>

{#if naked}
    <img
        {...rest}
        bind:this={imageElement}
        {srcset}
        {src}
        loading={priority ? "eager" : "lazy"}
        fetchpriority={priority ? "high" : "auto"}
        class="{rest.class} main-image"
        class:visible={loaded}
        style:object-fit={objectFit}
        style={rest.style}
        onload={(e) => {
            loaded = true;
            rest.onload?.(e);
        }}
        alt={rest.alt ?? asset.name ?? asset.uid}
    />
{:else}
    <div class="asset-image-container {rest.class ?? ''}" style={rest.style}>
        {#if placeholder === "thumbhash" && thumbhash}
            <img
                src={thumbhash}
                class="placeholder"
                class:hidden={loaded}
                style:object-fit={objectFit}
                alt=""
                aria-hidden="true"
            />
        {:else if placeholder === "thumbnail" && thumbPlaceholder}
            <img
                src={thumbPlaceholder}
                class="placeholder placeholder-thumb"
                class:hidden={loaded}
                style:object-fit={objectFit}
                alt=""
                aria-hidden="true"
            />
        {/if}

        <img
            {...rest}
            bind:this={imageElement}
            {srcset}
            {src}
            loading={priority ? "eager" : "lazy"}
            fetchpriority={priority ? "high" : "auto"}
            class="main-image"
            class:visible={loaded}
            class:instant={placeholder === "thumbnail"}
            style:object-fit={objectFit}
            onload={(e) => {
                loaded = true;
                rest.onload?.(e);
            }}
            alt={rest.alt ?? asset.name ?? asset.uid}
        />
    </div>
{/if}

<style lang="scss">
    .asset-image-container {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        display: block;
    }

    .placeholder {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        filter: blur(12px) saturate(120%);
        transform: scale(1.05); /* Prevent blur bleed at edges */
        transition: opacity 0.4s ease-out;
        z-index: 1;

        &.hidden {
            opacity: 0;
            pointer-events: none;
        }
    }

    .placeholder-thumb {
        filter: none;
        transform: none;
        transition: none;
    }

    .main-image {
        width: 100%;
        height: 100%;
        max-width: 100%;
        max-height: 100%;
        display: block;
        opacity: 0;
        transition: opacity 0.3s ease-in;
        position: relative;

        &.visible {
            opacity: 1;
        }

        &.instant {
            transition: none;
        }
    }
</style>
