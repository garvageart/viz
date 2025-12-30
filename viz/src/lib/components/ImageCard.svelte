<script lang="ts">
	import { getFullImagePath, type Image } from "$lib/api";
	import { thumbHashToDataURL } from "thumbhash";
	import { onMount } from "svelte";
	import { getImageLabel, getTakenAt } from "$lib/utils/images";
	import { normalizeBase64 } from "$lib/utils/misc";
	import { VizMimeTypes } from "$lib/constants";
	import { DragData } from "$lib/drag-drop/data";

	let { asset }: { asset: Image } = $props();
	let imageDate = $derived(getTakenAt(asset));

	let placeholderDataURL = $state<string | undefined>();
	let imageLoaded = $state(false);

	// Generate thumbhash placeholder
	onMount(() => {
		if (asset.image_metadata?.thumbhash) {
			try {
				const normalizedThumbhash = normalizeBase64(
					asset.image_metadata.thumbhash
				);
				const binaryString = atob(normalizedThumbhash);
				const bytes = new Uint8Array(binaryString.length);
				for (let i = 0; i < binaryString.length; i++) {
					bytes[i] = binaryString.charCodeAt(i);
				}
				placeholderDataURL = thumbHashToDataURL(bytes);
			} catch (error) {
				console.warn("Failed to decode thumbhash:", error);
			}
		}
	});
</script>

<div
	class="image-card"
	draggable="true"
	role="button"
	tabindex="0"
	data-asset-id={asset.uid}
	ondragstart={(e) => {
		if (!e.dataTransfer) {
			return;
		}

		const dragData = new DragData(VizMimeTypes.IMAGE_UIDS, [asset.uid]);
		dragData.setData(e.dataTransfer);
		e.dataTransfer.effectAllowed = "copy";

		const img = e.currentTarget.querySelector(
			".image-card-image"
		) as HTMLImageElement;
		if (img) {
			e.dataTransfer.setDragImage(img, 0, 0);
		}
	}}
>
	<div class="image-container">
		{#if placeholderDataURL && !imageLoaded}
			<img
				class="image-card-placeholder"
				src={placeholderDataURL}
				alt=""
				aria-hidden="true"
			/>
		{/if}
		<img
			class="image-card-image"
			class:loaded={imageLoaded}
			src={getFullImagePath(asset.image_paths?.thumbnail)}
			alt="{asset.name}{asset.uploaded_by
				? ` by ${asset.uploaded_by.username}`
				: ''}"
			title="{asset.name}{asset.uploaded_by
				? ` by ${asset.uploaded_by.username}`
				: ''}"
			loading="lazy"
			crossorigin="use-credentials"
			onload={() => (imageLoaded = true)}
		/>
	</div>
	<div class="image-card-meta">
		<span class="image-card-name" title={asset.image_metadata?.file_name}
			>{asset.image_metadata?.file_name ?? asset.name}</span
		>
		<div
			class="image-card-date_time"
			title="Photo taken at {imageDate.toLocaleString()}"
		>
			<span class="image-card-date">{imageDate.toLocaleDateString()}</span>
			<span class="image-card-divider">•</span>
			<span class="image-card-time"
				>{imageDate.toLocaleTimeString().replace(/:\d{2}$/, "")}</span
			>
			<div
				class="image-card-label"
				style="background-color: {getImageLabel(asset)}"
			></div>
		</div>
	</div>
</div>

<style lang="scss">
	.image-card {
		max-height: 25em;
		background-color: var(--imag-100);
		padding: 0.8em;
		border-radius: 0.5em;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;

		&:focus {
			outline: none;
		}

		&:hover {
			background-color: var(--imag-90);
		}
	}

	.image-card img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		display: block;
		pointer-events: none; // prevent clicks on image (right clicking should show the to be made context menu)
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

	.image-card-date_time {
		color: var(--imag-20);
		display: flex;
		align-items: center;
	}

	.image-card-label {
		height: 0.5rem;
		width: 0.5rem;
		margin: auto 1rem;
	}

	.image-card-divider {
		color: var(--imag-40);
	}

	.image-card-time {
		font-size: 0.9rem;
	}

	.image-container {
		height: 13em;
		background-color: var(--imag-80);
		display: flex;
		justify-content: center;
		align-items: center;
		position: relative;
	}

	.image-card-placeholder {
		position: absolute;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.image-card-image {
		opacity: 0;
		transition: opacity 0.3s ease-in-out;

		&.loaded {
			opacity: 1;
		}
	}
</style>
