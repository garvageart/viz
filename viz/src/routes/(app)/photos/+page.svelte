<script lang="ts">
	import AssetGrid from "$lib/components/AssetGrid.svelte";
	import ImageCard from "$lib/components/ImageCard.svelte";
	import Lightbox from "$lib/components/Lightbox.svelte";
	import LoadingContainer from "$lib/components/LoadingContainer.svelte";
	import VizViewContainer from "$lib/components/panels/VizViewContainer.svelte";
	import { type Image } from "$lib/api";
	import { DateTime } from "luxon";
	import { getFullImagePath } from "$lib/api";
	import { lightbox } from "$lib/states/index.svelte";
	import MaterialIcon from "$lib/components/MaterialIcon.svelte";
	import { loadImage } from "$lib/utils/dom.js";
	import { SvelteSet } from "svelte/reactivity";
	import { listImages, deleteImagesBulk, signDownload, downloadImages } from "$lib/api/client.gen";
	import { getTakenAt, compareByTakenAtDesc } from "$lib/utils/images.js";
	import AssetToolbar from "$lib/components/AssetToolbar.svelte";
	import Dropdown, { type DropdownOption } from "$lib/components/Dropdown.svelte";
	import ContextMenu from "$lib/context-menu/ContextMenu.svelte";
	import { fade } from "svelte/transition";
	import { thumbHashToDataURL } from "thumbhash";
	import hotkeys from "hotkeys-js";
	import { createServerURL } from "$lib/utils/url.js";
	import { MEDIA_SERVER } from "$lib/constants.js";

	let { data } = $props();

	// Pagination
	const pagination = $state({
		limit: data.limit,
		offset: data.offset
	});

	// Local images buffer so we can append without touching URL
	let images: Image[] = $state([...(data.images ?? [])]);
	let hasMore = $derived(images.length < (data.count ?? 0));

	// Page state
	let groups: { key: string; date: DateTime; label: string; items: Image[] }[] = $derived(groupImagesByDate(images) ?? []);

	// Sorting state (local to photos page)
	type SortMode = "most_recent" | "oldest" | "name_asc" | "name_desc";
	let sortMode: SortMode = $state("most_recent");
	const sortOptions: DropdownOption[] = [
		{ title: "Most Recent" },
		{ title: "Oldest" },
		{ title: "Name A–Z" },
		{ title: "Name Z–A" }
	];

	function getSelectedSortOption(): DropdownOption {
		switch (sortMode) {
			case "oldest":
				return { title: "Oldest" };
			case "name_asc":
				return { title: "Name A–Z" };
			case "name_desc":
				return { title: "Name Z–A" };
			default:
				return { title: "Most Recent" };
		}
	}

	function sortGroupItems(items: Image[]): Image[] {
		if (sortMode === "most_recent") return [...items].sort(compareByTakenAtDesc);
		if (sortMode === "oldest") return [...items].sort((a, b) => -compareByTakenAtDesc(a, b));
		if (sortMode === "name_asc") return [...items].sort((a, b) => a.name.localeCompare(b.name));
		if (sortMode === "name_desc") return [...items].sort((a, b) => b.name.localeCompare(a.name));
		return items;
	}

	// Lightbox
	let lightboxImage: Image | undefined = $state();
	let currentImageEl: HTMLImageElement | undefined = $derived(lightboxImage ? document.createElement("img") : undefined);

	$effect(() => {
		lightbox.show = !!lightboxImage;
	});

	// Selection (shared across groups)
	let selectedAssets = $state(new SvelteSet<Image>());
	let singleSelectedAsset: Image | undefined = $state();

	// UI state: show a small spinner while a download is in progress
	let downloadInProgress = $state(false);

	// Context menu state for right-click on assets
	let ctxShowMenu = $state(false);
	let ctxItems: any[] = $state([]);
	let ctxAnchor: { x: number; y: number } | HTMLElement | null = $state(null);

	// Action menu options for selected images
	const actionMenuOptions: DropdownOption[] = [
		{ title: "Download", icon: "download" },
		{ title: "Add to Collection", icon: "collections_bookmark" },
		{ title: "Share", icon: "share" },
		{ title: "Copy Link", icon: "link" },
		{ title: "Edit Metadata", icon: "edit" },
		{ title: "Move to Trash", icon: "delete" },
		{ title: "Force Delete", icon: "delete_forever" }
	];

	async function handleActionMenu(option: DropdownOption) {
		const items = Array.from(selectedAssets);
		if (items.length === 0) {
			alert("No images selected");
			return;
		}

		switch (option.title) {
			case "Download":
				downloadInProgress = true;
				try {
					const uids = items.map((i) => i.uid);
					await performImageDownloads(uids);
				} catch (err) {
					console.error("Download error", err);
					alert(`Download failed: ${err}`);
				} finally {
					downloadInProgress = false;
				}
				break;

			case "Add to Collection":
				// TODO: Open collection picker modal
				alert(`Add ${items.length} image(s) to collection - Not yet implemented`);
				break;

			case "Share":
				// TODO: Open share dialog
				alert(`Share ${items.length} image(s) - Not yet implemented`);
				break;

			case "Copy Link":
				if (items.length === 1) {
					const url = getFullImagePath(items[0].image_paths?.original);
					await navigator.clipboard.writeText(url);
					alert("Link copied to clipboard");
				} else {
					alert("Can only copy link for a single image");
				}
				break;

			case "Edit Metadata":
				// TODO: Open metadata editor
				alert(`Edit metadata for ${items.length} image(s) - Not yet implemented`);
				break;

			case "Move to Trash":
				const okTrash = confirm(`Move ${items.length} selected image(s) to trash?`);
				if (!okTrash) return;

				try {
					const res = await deleteImagesBulk({ uids: items.map((i) => i.uid), force: false });
					if (res.status === 200 || res.status === 207) {
						const deletedUIDs = res.data.results.filter((r) => r.deleted).map((r) => r.uid);
						images = images.filter((img) => !deletedUIDs.includes(img.uid));
						selectedAssets.clear();
					} else {
						alert((res as any).data?.error ?? "Failed to delete images");
					}
				} catch (err) {
					alert(`Delete failed: ${err}`);
				}
				break;

			case "Force Delete":
				const okForce = confirm(`Permanently delete ${items.length} image(s)? This action cannot be undone!`);
				if (!okForce) return;

				try {
					const res = await deleteImagesBulk({ uids: items.map((i) => i.uid), force: true });
					if (res.status === 200 || res.status === 207) {
						const deletedUIDs = res.data.results.filter((r) => r.deleted).map((r) => r.uid);
						images = images.filter((img) => !deletedUIDs.includes(img.uid));
						selectedAssets.clear();
					} else {
						alert((res as any).data?.error ?? "Failed to delete images");
					}
				} catch (err) {
					alert(`Delete failed: ${err}`);
				}
				break;
		}
	}

	async function paginate() {
		if (!hasMore) {
			return;
		}
		pagination.offset++;
		const res = await listImages({ limit: pagination.limit, offset: pagination.offset });

		if (res.status === 200) {
			const next = res.data.items?.map((i) => i.image) ?? [];
			images = [...images, ...next];
		}
	}

	// Helper to perform token-based bulk download given a list of UIDs.
	// The server will create a download token and use it for authentication.
	async function performImageDownloads(uids: string[]) {
		if (!uids || uids.length === 0) {
			alert("No images selected for download");
			return;
		}

		try {
			if (uids.length === 1) {
				// For single images, use the /images/{uid}/download route which creates
				// a short-lived token server-side and redirects to the file endpoint
				const uid = uids[0];
				const img = images.find((i) => i.uid === uid)!;
				const baseUrl = createServerURL(MEDIA_SERVER);
				const dlUrl = new URL(`/images/${uid}/download`, baseUrl);

				const res = await fetch(dlUrl.toString(), {
					method: "GET",
					credentials: "include",
					redirect: "follow"
				});

				if (!res.ok) {
					let errMsg = "";
					try {
						const ct = (res.headers.get("content-type") || "").toLowerCase();
						if (ct.includes("application/json")) {
							const j = await res.json();
							errMsg = j?.error ?? j?.message ?? j?.detail ?? JSON.stringify(j);
						} else {
							errMsg = await res.text();
						}
					} catch (e) {
						// ignore parse errors, we'll fallback below
					}
					if (!errMsg || String(errMsg).trim() === "") {
						errMsg = `${res.status} ${res.statusText}`;
					}
					throw new Error(`Failed to download image: ${errMsg}`);
				}

				const cd = res.headers.get("content-disposition") || "";
				const filenameMatch = cd.match(/filename="?([^\"]+)"?/);
				const parsedFilename = filenameMatch ? filenameMatch[1] : null;
				const filename = parsedFilename || img?.name || "image";

				const blob = await res.blob();
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");

				a.href = url;
				a.download = filename;
				document.body.appendChild(a);
				a.click();
				a.remove();
				URL.revokeObjectURL(url);

				return;
			}

			const signRes = await signDownload({
				uids,
				expires_in: 300,
				allow_download: true,
				allow_embed: false,
				show_metadata: true
			});

			if (signRes.status !== 200) {
				alert(signRes.data?.error ?? "Failed to create download token");
				return;
			}

			const token = signRes.data.uid; // The token is stored in the uid field

			const baseUrl = createServerURL(MEDIA_SERVER);
			const dlUrl = new URL("/download", baseUrl);
			dlUrl.searchParams.set("token", token);

			const res = await fetch(dlUrl.toString(), {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ uids })
			});

			if (!res.ok) {
				// Prefer JSON ErrorResponse messages when available
				let errMsg;
				try {
					const ct = (res.headers.get("content-type") || "").toLowerCase();
					if (ct.includes("application/json")) {
						const j = await res.json();
						errMsg = j?.error ?? j?.message ?? j?.detail ?? JSON.stringify(j);
					} else {
						errMsg = await res.text();
					}
				} catch (e) {
					errMsg = `${res.status} ${res.statusText}`;
				}

				if (!errMsg || String(errMsg).trim() === "") {
					errMsg = `${res.status} ${res.statusText}`;
				}

				throw new Error(`Failed to download archive: ${errMsg}`);
			}

			const cd = res.headers.get("content-disposition") || "";
			const filenameMatch = cd.match(/filename="?([^"]+)"?/);
			const parsedFilename = filenameMatch ? filenameMatch[1] : null;
			const filename = parsedFilename || "images.zip";

			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);
		} catch (err) {
			console.error("Download error", err);
			alert(`Download failed: ${err}`);
		}
	}

	function groupImagesByDate(list: Image[]) {
		const map = new Map<string, Image[]>();

		for (const img of list) {
			const taken = getTakenAt(img);
			const dt = DateTime.fromJSDate(taken);
			const key = dt.toISODate()!;
			if (!map.has(key)) {
				map.set(key, []);
			}

			map.get(key)!.push(img);
		}

		// Convert to array and sort by date desc
		const arr = Array.from(map.entries()).map(([key, items]) => {
			const date = DateTime.fromISO(key);
			// sort items in each group based on current sort
			const sortedItems = sortGroupItems(items);
			return { key, date, items: sortedItems };
		});

		arr.sort((a, b) => b.date.toMillis() - a.date.toMillis());

		// create display label (Today / Yesterday / date)
		const labelled = arr.map((g) => {
			const today = DateTime.now().startOf("day");
			const diff = today.diff(g.date.startOf("day"), "days").days;
			let label = g.date.toLocaleString(DateTime.DATE_MED);

			if (diff === 0) {
				label = "Today";
			} else if (diff === 1) {
				label = "Yesterday";
			}

			return { key: g.key, date: g.date, label, items: g.items };
		});

		return labelled;
	}

	let thumbhashURL = $derived.by(() => {
		if (lightboxImage?.image_metadata?.thumbhash) {
			try {
				const binaryString = atob(lightboxImage.image_metadata.thumbhash);
				const bytes = new Uint8Array(binaryString.length);
				for (let i = 0; i < binaryString.length; i++) {
					bytes[i] = binaryString.charCodeAt(i);
				}
				return thumbHashToDataURL(bytes);
			} catch (error) {
				console.warn("Failed to decode thumbhash:", error);
				return null;
			}
		}
	});

	function openLightbox(asset: Image) {
		lightboxImage = asset;
	}

	function prevLightboxImage() {
		if (!lightboxImage) {
			return;
		}

		const currentGroup = groups.find((g) => g.items.some((i) => i.uid === lightboxImage!.uid));
		if (!currentGroup) {
			return;
		}

		const arr = currentGroup.items;
		if (!arr.length) {
			return;
		}

		const idx = arr.findIndex((i) => i.uid === lightboxImage!.uid);
		if (idx === -1) {
			return;
		}

		const nextIdx = (idx - 1 + arr.length) % arr.length;
		lightboxImage = arr[nextIdx];
	}

	function nextLightboxImage() {
		if (!lightboxImage) {
			return;
		}

		const currentGroup = groups.find((g) => g.items.some((i) => i.uid === lightboxImage!.uid));
		if (!currentGroup) {
			return;
		}

		const arr = currentGroup.items;
		if (!arr.length) {
			return;
		}

		const idx = arr.findIndex((i) => i.uid === lightboxImage!.uid);
		if (idx === -1) {
			return;
		}

		const nextIdx = (idx + 1) % arr.length;
		lightboxImage = arr[nextIdx];
	}

	hotkeys("esc", (e) => {
		lightboxImage = undefined;
	});

	hotkeys("left,right", (e, handler) => {
		if (!lightbox.show) {
			return;
		}

		e.preventDefault();
		if (handler.key === "left") {
			prevLightboxImage();
		} else if (handler.key === "right") {
			nextLightboxImage();
		}
	});
</script>

<svelte:head>
	<title>Photos</title>
	{#if downloadInProgress}
		<div class="download-spinner" aria-live="polite" title="Download in progress">
			<LoadingContainer />
		</div>
	{/if}
</svelte:head>

{#if lightboxImage}
	{@const imageToLoad = getFullImagePath(lightboxImage.image_paths?.preview) ?? ""}

	<Lightbox
		onclick={() => {
			lightboxImage = undefined;
		}}
	>
		{#await loadImage(imageToLoad, currentImageEl!)}
			{#if !thumbhashURL}
				<div style="width: 3em; height: 3em">
					<LoadingContainer />
				</div>
			{:else}
				<img
					src={thumbhashURL}
					class="lightbox-image"
					style="height: 90%; position: absolute;"
					out:fade={{ duration: 300 }}
					alt="Placeholder image for {lightboxImage.name}"
					aria-hidden="true"
				/>
			{/if}
		{:then _}
			<img
				src={imageToLoad}
				class="lightbox-image"
				alt={lightboxImage.name}
				title={lightboxImage.name}
				loading="eager"
				data-image-id={lightboxImage.uid}
			/>

			<div class="lightbox-nav">
				<button
					class="lightbox-nav-btn prev"
					aria-label="Previous image"
					onclick={(e) => {
						e.stopPropagation();
						prevLightboxImage();
					}}
				>
					<MaterialIcon iconName="arrow_back" />
				</button>
				<button
					class="lightbox-nav-btn next"
					aria-label="Next image"
					onclick={(e) => {
						e.stopPropagation();
						nextLightboxImage();
					}}
				>
					<MaterialIcon iconName="arrow_forward" />
				</button>
			</div>
		{:catch error}
			<p>Failed to load image</p>
			<p>{error}</p>
		{/await}
	</Lightbox>
{/if}

<VizViewContainer name="Photos" bind:data={images} bind:hasMore paginate={() => paginate()}>
	{#if images.length > 0}
		{#if selectedAssets.size > 1}
			<AssetToolbar class="selection-toolbar" stickyToolbar={true}>
				<button
					class="toolbar-button"
					title="Clear selection"
					aria-label="Clear selection"
					style="margin-right: 1em;"
					onclick={() => selectedAssets.clear()}
				>
					<MaterialIcon iconName="close" />
				</button>
				<span style="font-weight: 600;">{selectedAssets.size} selected</span>
				<div style="margin-left: auto; display: flex; gap: 0.5rem; align-items: center;">
					<Dropdown
						class="toolbar-button"
						icon="more_horiz"
						options={actionMenuOptions}
						showSelectionIndicator={false}
						onSelect={handleActionMenu}
						align="right"
					/>
				</div>
			</AssetToolbar>
		{:else}
			<AssetToolbar stickyToolbar={true}>
				<div style="display: flex; align-items: center; gap: 0.5rem;">
					<Dropdown
						title="Sort by"
						class="toolbar-button"
						icon="sort"
						options={sortOptions}
						selectedOption={getSelectedSortOption()}
						onSelect={(opt) => {
							if (opt.title === "Most Recent") sortMode = "most_recent";
							else if (opt.title === "Oldest") sortMode = "oldest";
							else if (opt.title === "Name A–Z") sortMode = "name_asc";
							else if (opt.title === "Name Z–A") sortMode = "name_desc";
						}}
					/>
				</div>
			</AssetToolbar>
		{/if}
	{/if}
	{#if groups.length === 0}
		<div class="no-photos">
			<p>No photos to display</p>
		</div>
	{:else}
		{#each groups as group}
			<section class="photo-group">
				<h2>{group.label} ({group.items.length})</h2>
				<AssetGrid
					{selectedAssets}
					singleSelectedAsset={undefined}
					data={group.items}
					disableOutsideUnselect={true}
					assetDblClick={(_e, asset) => openLightbox(asset)}
					assetSnippet={imageCard}
					onassetcontext={(detail: { asset: Image; anchor: { x: number; y: number } }) => {
						const { asset, anchor } = detail;
						// If the user hasn't multi-selected, make this the only selected asset so handlers operate on it
						if (!selectedAssets.has(asset) || selectedAssets.size <= 1) {
							singleSelectedAsset = asset;
							selectedAssets.clear();
							selectedAssets.add(asset);
						}
						// Build menu items from actionMenuOptions and open the context menu anchored to mouse coords
						ctxItems = actionMenuOptions.map((opt) => ({
							id: opt.title,
							label: opt.title,
							icon: opt.icon,
							action: () => {
								if (opt.title === "Download") {
									const selected = Array.from(selectedAssets).map((i) => i.uid);
									performImageDownloads(selected);
								} else {
									handleActionMenu(opt);
								}
							}
						}));
						ctxAnchor = anchor;
						ctxShowMenu = true;
					}}
				/>
			</section>
		{/each}
	{/if}
</VizViewContainer>

<!-- Context menu for right-click on assets -->
<ContextMenu bind:showMenu={ctxShowMenu} items={ctxItems} anchor={ctxAnchor} offsetY={0} />

{#snippet imageCard(asset: Image)}
	<ImageCard {asset} />
{/snippet}

<style lang="scss">
	.no-photos {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: var(--imag-40);
		font-size: 1.1rem;
	}

	.photo-group {
		margin: 2rem 0rem;
		width: 100%;

		h2 {
			padding: 0.5rem 1rem;
			margin: 0 0 1rem 0;
			border-bottom: 1px solid var(--imag-20);
			font-weight: 600;
			font-size: 1.1rem;
		}
	}

	:global(.lightbox-image) {
		max-width: 80%;
		max-height: 90%;
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

	.download-spinner {
		position: fixed;
		top: 1rem;
		right: 1rem;
		z-index: 2000;
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.6);
		border-radius: 0.5rem;
		padding: 0.25rem;
	}

	:global(.toolbar-button) {
		border: none;
		background: transparent;
		color: var(--imag-10);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		font-size: 0.9rem;
	}
</style>
