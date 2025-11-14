<script lang="ts">
	import { loadImage } from "$lib/utils/dom";
	import { fade } from "svelte/transition";
	import Lightbox from "./Lightbox.svelte";
	import LoadingContainer from "./LoadingContainer.svelte";
	import MaterialIcon from "./MaterialIcon.svelte";
	import { getFullImagePath, type Image } from "$lib/api";
	import hotkeys from "hotkeys-js";
	import { formatBytes, getThumbhashURL } from "$lib/utils/images";
	import Button from "./Button.svelte";

	interface Props {
		lightboxImage: Image | undefined;
		prevLightboxImage?: () => void;
		nextLightboxImage?: () => void;
	}

	let { lightboxImage = $bindable(), prevLightboxImage, nextLightboxImage }: Props = $props();

	let show = $derived(lightboxImage !== undefined);
	let imageToLoad = $derived(getFullImagePath(lightboxImage!.image_paths?.preview || lightboxImage!.image_paths?.original));

	let direction = $state<"left" | "right">("right");
	let showMetadata = $state(false);

	function goToPrev() {
		direction = "left";
		prevLightboxImage?.();
	}

	function goToNext() {
		direction = "right";
		nextLightboxImage?.();
	}

	let thumbhashURL = $derived(lightboxImage ? getThumbhashURL(lightboxImage) : undefined);
	let currentImageEl: HTMLImageElement | undefined = $derived(lightboxImage ? document.createElement("img") : undefined);

	hotkeys("left,right", (e, handler) => {
		if (!show) {
			return;
		}

		e.preventDefault();
		if (handler.key === "left") {
			goToPrev();
		} else if (handler.key === "right") {
			goToNext();
		}
	});

	function formatFileSize() {
		const size = lightboxImage?.image_metadata?.file_size;
		return formatBytes(size) ?? "—";
	}

	function formatResolution() {
		const exifRes = lightboxImage?.exif?.resolution;
		if (exifRes) {
			return exifRes;
		}

		if (lightboxImage?.width && lightboxImage?.height) {
			return `${lightboxImage.width} x ${lightboxImage.height}`;
		}

		return "—";
	}
</script>

{#snippet metadataEditor()}
	<div class="metadata-editor">
		<div class="metadata-header">
			<Button onclick={() => (lightboxImage = undefined)}>
				<MaterialIcon iconName="close" />
				<span>Close</span>
			</Button>
		</div>
		<div class="metadata-exif-box">
			<div class="exif-cards">
				<!-- Camera/Exposure card -->
				<div class="exif-card">
					<div class="card-row main-row">
						<div class="card-values">
							{#if lightboxImage?.exif?.model && lightboxImage?.exif?.make}
								<div class="value-big">
									{lightboxImage.exif.make}
									{lightboxImage.exif.model.replace(new RegExp(`^${lightboxImage.exif.make} `), "")}
								</div>
							{:else}
								<div class="value-big">Unknown Camera</div>
							{/if}
							{#if lightboxImage?.exif?.lens_model}
								<div class="value-sub">{lightboxImage.exif.lens_model}</div>
							{:else}
								<div class="value-sub">Unknown Lens Make</div>
							{/if}
							{#if lightboxImage?.exif?.focal_length}
								<div class="value-sub">{lightboxImage.exif.focal_length}</div>
							{:else}
								<div class="value-sub">Unknown Focal Length</div>
							{/if}
						</div>
					</div>
					<div class="card-row main-row">
						<MaterialIcon iconName="camera" class="exif-material-icon" />
						<div class="card-values">
							<div class="value-small">{lightboxImage?.exif?.f_number ?? lightboxImage?.exif?.aperture ?? "—"}</div>
							<div class="value-small">{lightboxImage?.exif?.exposure_time ?? "—"}</div>
						</div>
					</div>
					<div class="card-row meta-row">
						<MaterialIcon iconName="tune" class="exif-material-icon" />
						<div class="card-values">
							<div class="value-small">
								ISO {lightboxImage?.exif?.iso ?? "—"} · {lightboxImage?.exif?.exposure_value ?? "—"}
							</div>
						</div>
					</div>
				</div>

				<div class="exif-card">
					<div class="card-row main-row">
						<div class="card-values">
							<div class="value-sub">{lightboxImage?.width} x {lightboxImage?.height}</div>
						</div>
					</div>
					<div class="card-row main-row">
						<MaterialIcon iconName="aspect_ratio" class="exif-material-icon" />
						<div class="card-values">
							<div class="value-sub">{Math.floor((lightboxImage?.width! * lightboxImage?.height!) / 1_000_000)} MP</div>
							<div class="value-sub">{formatFileSize()}</div>
						</div>
					</div>
					<div class="card-row meta-row">
						<MaterialIcon iconName="palette" class="exif-material-icon" />
						<div class="card-values">
							<div class="value-small">{lightboxImage?.image_metadata?.color_space?.toUpperCase() ?? "—"}</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/snippet}

<Lightbox
	bind:show
	backgroundOpacity={0.9}
	onclick={() => {
		lightboxImage = undefined;
	}}
>
	<div class="image-lightbox-container">
		<div class="image-container">
			{#key lightboxImage?.uid}
				<div class="image-wrapper">
					{#await loadImage(imageToLoad, currentImageEl!)}
						{#if !thumbhashURL}
							<div style="width: 3em; height: 3em">
								<LoadingContainer />
							</div>
						{:else}
							<img
								src={thumbhashURL}
								in:fade
								out:fade
								class="lightbox-image lightbox-placeholder"
								alt="Placeholder image for {lightboxImage!.name}"
								aria-hidden="true"
							/>
						{/if}
					{:then _}
						<img
							src={imageToLoad}
							class="lightbox-image"
							alt={lightboxImage!.name}
							title={lightboxImage!.name}
							loading="eager"
							data-image-id={lightboxImage!.uid}
							in:fade
							out:fade
						/>
					{:catch error}
						<p>Failed to load image</p>
						<p>{error}</p>
					{/await}
				</div>
			{/key}

			{#if prevLightboxImage && nextLightboxImage}
				<div class="lightbox-nav">
					<button
						class="lightbox-nav-btn prev"
						aria-label="Previous image"
						onclick={(e) => {
							e.stopPropagation();
							goToPrev();
						}}
					>
						<MaterialIcon iconName="arrow_back" />
					</button>
					<button
						class="lightbox-nav-btn next"
						aria-label="Next image"
						onclick={(e) => {
							e.stopPropagation();
							goToNext();
						}}
					>
						<MaterialIcon iconName="arrow_forward" />
					</button>
				</div>
			{/if}
		</div>
		{#if showMetadata}
			{@render metadataEditor()}
		{/if}
	</div>
</Lightbox>

<style lang="scss">
	.image-lightbox-container {
		position: relative;
		display: flex;
		align-items: center;
		height: 100%;
		width: 100%;
		pointer-events: none;
	}

	.image-container {
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.image-wrapper {
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
		max-height: 95%;
		height: 100%;
		width: 100%;
		overflow: hidden;
		pointer-events: none;
	}

	.lightbox-image {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
		pointer-events: auto;
	}

	.lightbox-placeholder {
		width: 100%;
		height: 100%;
	}

	.lightbox-nav {
		position: absolute;
		top: 50%;
		right: 2em;
		display: flex;
		flex-direction: column;
		transform: translateY(-50%);
		pointer-events: none;
	}

	.lightbox-nav-btn {
		border: none;
		color: var(--imag-10);
		width: 3rem;
		height: 3rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.3rem;
		cursor: pointer;
		pointer-events: auto;
	}

	.metadata-editor {
		background-color: var(--imag-bg-color);
		padding: 1em;
		border-radius: 0.5em;
		color: var(--imag-text-color);
		height: 100%;
		width: 25vw;
		max-width: 25vw;
		z-index: 100;
		pointer-events: auto;
		box-sizing: border-box;
	}

	.metadata-exif-box {
		display: block;
	}

	.exif-cards {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.exif-card {
		background: var(--imag-100);
		color: var(--imag-text-color);
		padding: 0.6rem 0.8rem;
		border-radius: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04) inset;
	}

	.card-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	:global(.exif-material-icon) {
		color: var(--imag-10);
		width: 1.4rem;
		height: 1.4rem;
	}

	.card-values {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.value-big {
		font-size: 1rem;
		font-weight: 600;
		color: var(--imag-20);
	}

	.value-sub {
		font-size: 0.9rem;
		color: var(--imag-20);
	}

	.value-small {
		color: var(--imag-20);
		font-size: 0.85rem;
	}

	.value-big,
	.value-sub,
	.value-small {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
