<script lang="ts">
	import { getFullImagePath, type Image } from "$lib/api";
	import { getThumbhashURL } from "$lib/utils/images";
	import type { HTMLImgAttributes } from "svelte/elements";

	type ImageVariant = "thumbnail" | "preview" | "original";

	type AssetProps = {
		/** The Image asset object from the API */
		asset: Image;
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
		 * Force a specific image size variant.
		 * If unset, uses srcset to let the browser decide based on viewport.
		 * Useful for grids where you know you only need thumbnails.
		 */		
		variant?: ImageVariant;
		/**
		 * Binding to the internal image element
		 */
		imageElement?: HTMLImageElement;
	};

	type Props = AssetProps & HTMLImgAttributes;

	let {
		asset,
		objectFit = "cover",
		priority = false,
		variant,
		imageElement = $bindable(),
		src: srcOverride,
		...rest
	}: Props = $props();

	let loaded = $state(false);

	/**
	 * Helper to add version/checksum to path for immutable caching
	 */
	const withVersion = (path: string) => {
		const checksum = asset.image_metadata?.checksum;
		if (!checksum) {
			return path;
		}
		return path + (path.includes("?") ? "&" : "?") + `v=${checksum}`;
	};

	/**
	 * Construct srcset using the three standard variants
	 * thumbnail: ~400px
	 * preview: ~1920px
	 * original: full resolution
	 */
	const srcset = $derived.by(() => {
		// If a specific variant or src override is requested, do not generate a srcset
		if (variant || srcOverride) {
			return undefined;
		}

		const paths = asset.image_paths;
		if (!paths) {
			return "";
		}

		const set = [];
		if (paths.thumbnail) {
			set.push(`${getFullImagePath(withVersion(paths.thumbnail))} 400w`);
		}
		if (paths.preview) {
			set.push(`${getFullImagePath(withVersion(paths.preview))} 1920w`);
		}
		if (paths.original) {
			set.push(
				`${getFullImagePath(withVersion(paths.original))} ${asset.width}w`
			);
		}

		return set.join(", ");
	});

	/**
	 * Fallback src used if srcset is not supported or as the initial load source.
	 * Also acts as the primary src when a specific variant is requested.
	 */
	const src = $derived.by(() => {
		if (srcOverride) {
			return srcOverride;
		}

		let path = "";

		if (variant && asset.image_paths?.[variant]) {
			path = asset.image_paths[variant]!;
		} else {
			// Fallback logic: prefer preview -> thumbnail -> original if no specific variant forced
			// OR if the requested variant is missing
			path =
				asset.image_paths?.preview ||
				asset.image_paths?.thumbnail ||
				asset.image_paths?.original ||
				"";
		}

		return path ? getFullImagePath(withVersion(path)) : "";
	});

	/**
	 * Instant-load placeholder from ThumbHash
	 */
	const thumbhash = $derived(getThumbhashURL(asset));
</script>

<div class="asset-image-container {rest.class ?? ''}" style={rest.style}>
	{#if thumbhash}
		<img
			src={thumbhash}
			class="placeholder"
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
		style:object-fit={objectFit}
		onload={(e) => {
			loaded = true;
			rest.onload?.(e);
		}}
		alt={rest.alt ?? asset.name ?? asset.uid}
	/>
</div>

<style lang="scss">
	.asset-image-container {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
		display: block;
		background-color: var(--imag-100); /* Darker background while loading */
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

	.main-image {
		width: 100%;
		height: 100%;
		display: block;
		opacity: 0;
		transition: opacity 0.3s ease-in;
		position: relative;
		z-index: 2;

		&.visible {
			opacity: 1;
		}
	}
</style>
