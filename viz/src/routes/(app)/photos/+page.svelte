<script lang="ts">
	import PhotoAssetGrid from "$lib/components/PhotoAssetGrid.svelte";
	import VizViewContainer from "$lib/components/panels/VizViewContainer.svelte";
	import { type Image } from "$lib/api";
	import MaterialIcon from "$lib/components/MaterialIcon.svelte";
	import { listImages, getImage } from "$lib/api";
	import AssetToolbar from "$lib/components/AssetToolbar.svelte";
	import Dropdown from "$lib/components/Dropdown.svelte";
	import ContextMenu from "$lib/context-menu/ContextMenu.svelte";
	import type { MenuItem } from "$lib/context-menu/types";
	import hotkeys from "hotkeys-js";
	import UploadManager, {
		type ImageUploadSuccess
	} from "$lib/upload/manager.svelte";
	import {
		SUPPORTED_IMAGE_TYPES,
		SUPPORTED_RAW_FILES,
		type SupportedImageTypes
	} from "$lib/types/images";
	import { toastState } from "$lib/toast-notifcations/notif-state.svelte";
	import ImageLightbox from "$lib/components/ImageLightbox.svelte";
	import Button from "$lib/components/Button.svelte";
	import { modal, viewSettings } from "$lib/states/index.svelte";
	import {
		selectionManager,
		SelectionScopeNames
	} from "$lib/states/selection.svelte";
	import { onDestroy } from "svelte";
	import FilterModal from "$lib/components/modals/FilterModal.svelte";
	import {
		getConsolidatedGroups,
		groupImagesByDate,
		type ConsolidatedGroup,
		type DateGroup
	} from "$lib/photo-layout/index.js";
	import IconButton from "$lib/components/IconButton.svelte";
	import { filterManager } from "$lib/states/filter.svelte";
	import { untrack } from "svelte";
	import DragAndDropUpload from "$lib/components/DragAndDropUpload.svelte";
	import { performImageDownloads } from "$lib/utils/http.js";
	import { createImageMenu } from "$lib/context-menu/menus/images.js";

	// Display options as MenuItem[] for Dropdown
	const displayMenuItems: MenuItem[] = [
		{ id: "display-grid", label: "Grid" },
		{ id: "display-list", label: "List" },
		{ id: "display-cards", label: "Cards" }
	];

	function getDisplaySelectedId(): string | undefined {
		const map: Record<string, string> = {
			grid: "display-grid",
			list: "display-list",
			cards: "display-cards"
		};
		return map[(viewSettings.current as string) ?? ""];
	}

	// Helper class for managing gallery state
	// This ensures we can mutate state (append images) while still initializing from data
	class GalleryState {
		images = $state<Image[]>([]);
		pagination = $state({ limit: 100, page: 0 });
		totalCount = $state(0);
		hasMore = $state(false);

		constructor(initData: typeof data) {
			this.images = initData.images ?? [];
			this.pagination = {
				limit: initData.limit,
				page: initData.page
			};
			this.totalCount = initData.count ?? 0;
			this.hasMore = !!initData.next;
		}
	}

	let { data } = $props();

	$effect(() => {
		untrack(() => {
			filterManager.setActiveScopeType("images");
			if (!filterManager.keepFilters) {
				filterManager.resetActiveScope();
			}
		});
	});

	// Derived state that resets when `data` changes (navigation/filtering)
	// We use a class so we can maintain local mutable state
	let galleryState = $derived(new GalleryState(data));

	let isPaginating = $state(false);

	// Page state
	let groups: DateGroup[] = $derived(
		groupImagesByDate(filterManager.apply(galleryState.images)) ?? []
	);

	let consolidatedGroups: ConsolidatedGroup[] = $derived.by(() => {
		return getConsolidatedGroups(groups);
	});

	// Lightbox
	let lightboxImage: Image | undefined = $state();

	// Selection (shared across groups)
	const scopeId = SelectionScopeNames.PHOTOS_MAIN;
	const selectionScope = selectionManager.getScope<Image>(scopeId);

	onDestroy(() => {
		selectionManager.removeScope(scopeId);
	});

	// Flat list of all images for cross-group range selection
	let allImagesFlat = $derived(consolidatedGroups.flatMap((g) => g.allImages));

	// Context menu state for right-click on assets
	let ctxShowMenu = $state(false);
	let ctxItems: MenuItem[] = $state([]);
	let ctxAnchor: { x: number; y: number } | HTMLElement | null = $state(null);

	// Action menu items for selected images
	let actionMenuItems: MenuItem[] = $derived.by(() => {
		const baseMenuItems = createImageMenu(galleryState.images, selectionScope);
		const pageMenuItems: MenuItem[] = [
			{
				id: "act-add-to-collection",
				label: "Add to Collection",
				icon: "collections_bookmark",
				action: () => {
					// TODO: Open collection picker modal
					toastState.addToast({
						type: "info",
						message: `Add ${selectionScope.selected.size} image(s) to collection - Not yet implemented`,
						timeout: 3000
					});
				}
			}
		];

		return [...baseMenuItems, ...pageMenuItems];
	});

	async function paginate() {
		if (isPaginating || !galleryState.hasMore) {
			return;
		}

		isPaginating = true;
		const nextPage = galleryState.pagination.page + 1;
		const res = await listImages({
			limit: galleryState.pagination.limit,
			page: nextPage
		});

		if (res.status === 200) {
			const nextItems = res.data.items?.map((i) => i.image) ?? [];
			galleryState.images.push(...nextItems);

			// Update pagination state from response
			galleryState.pagination.page = res.data.page ?? nextPage;
			galleryState.totalCount = res.data.count ?? galleryState.totalCount;
			galleryState.hasMore = !!res.data.next;
		} else {
			// On error, avoid tight loops; allow retry on next scroll
			console.error("paginate: request failed", res);
			galleryState.hasMore = false;
		}

		isPaginating = false;
	}

	function openLightbox(asset: Image) {
		lightboxImage = asset;
	}

	function nextLightboxImage() {
		if (!lightboxImage || allImagesFlat.length === 0) {
			return;
		}

		const idx = allImagesFlat.findIndex((i) => i.uid === lightboxImage!.uid);
		if (idx === -1) {
			return;
		}

		const nextIdx = (idx - 1 + allImagesFlat.length) % allImagesFlat.length;
		lightboxImage = allImagesFlat[nextIdx];
	}

	function prevLightboxImage() {
		if (!lightboxImage || allImagesFlat.length === 0) {
			return;
		}

		const idx = allImagesFlat.findIndex((i) => i.uid === lightboxImage!.uid);
		if (idx === -1) {
			return;
		}

		const nextIdx = (idx + 1) % allImagesFlat.length;
		lightboxImage = allImagesFlat[nextIdx];
	}

	// Upload confirmation state
	let showUploadConfirm = $state(false);

	let showFilterModal = $state(false);

	let pendingNewRaw: ImageUploadSuccess[] = [];
	let addImagesDebounceTimer: number | undefined;
	const ADD_IMAGES_DEBOUNCE_MS = 550;

	async function resolveRawToImages(
		items: ImageUploadSuccess[]
	): Promise<Image[]> {
		if (!items || items.length === 0) {
			return [];
		}

		const results: Image[] = [];
		const fetchPromises = items.map(async (it) => {
			if (!it) {
				return null;
			}

			const uid = it.uid;
			if (!uid) {
				return null;
			}

			try {
				const res = await getImage(uid);

				if (res.status === 200) {
					return res.data;
				}

				throw new Error(res.data.error);
			} catch (err) {
				console.warn("Failed to fetch image metadata for", uid, err);
				return null;
			}
		});

		const fetched = await Promise.all(fetchPromises);
		for (const f of fetched) {
			if (f) {
				results.push(f);
			}
		}

		return results;
	}

	function scheduleAddImages(newRaw: ImageUploadSuccess[]) {
		if (!newRaw || newRaw.length === 0) {
			return;
		}

		pendingNewRaw.push(...newRaw);

		if (addImagesDebounceTimer) {
			clearTimeout(addImagesDebounceTimer);
		}

		addImagesDebounceTimer = window.setTimeout(async () => {
			const batch = pendingNewRaw.slice();
			pendingNewRaw = [];
			addImagesDebounceTimer = undefined;

			const imagesToAdd = await resolveRawToImages(batch);
			if (imagesToAdd.length > 0) {
				galleryState.images.push(...imagesToAdd);
			}
		}, ADD_IMAGES_DEBOUNCE_MS) as unknown as number;
	}

	async function addImagesToImagine() {
		const manager = new UploadManager([
			...SUPPORTED_RAW_FILES,
			...SUPPORTED_IMAGE_TYPES
		] as SupportedImageTypes[]);
		const uploadedImages = await manager.openPickerAndUpload();

		if (uploadedImages.length === 0) {
			return;
		}

		scheduleAddImages(uploadedImages);
	}

	hotkeys("escape", (e) => {
		e.preventDefault();
		selectionScope.clear();

		lightboxImage = undefined;

		if (modal.show) {
			modal.show = false;
			showUploadConfirm = false;
		}
	});
</script>

<svelte:head>
	<title>Photos</title>
</svelte:head>

<DragAndDropUpload {scopeId} {selectionScope} showCollectionCreateBox={true} />

{#if lightboxImage}
	<ImageLightbox bind:lightboxImage {prevLightboxImage} {nextLightboxImage} />
{/if}

{#if showFilterModal && modal.show}
	<FilterModal />
{/if}

{#snippet noAssetsSnippet()}
	<div id="add_to_imagine-container">
		<span style="margin: 1em; color: var(--imag-20); font-size: 1.2rem;"
			>Add your first images</span
		>
		<Button
			id="add_to_collection-button"
			style="padding: 2em 8em; display: flex; align-items: center; justify-content: center;"
			title="Select Photos"
			aria-label="Select Photos"
			onclick={async () => addImagesToImagine()}
		>
			Select Photos
			<MaterialIcon iconName="add" style="font-size: 2em;" />
		</Button>
	</div>
{/snippet}

<VizViewContainer
	name="Photos"
	bind:data={galleryState.images}
	hasMore={galleryState.hasMore}
	paginate={() => paginate()}
>
	{#if galleryState.images.length > 0}
		{#if selectionScope.selected.size > 1}
			<AssetToolbar class="selection-toolbar" stickyToolbar={true}>
				<button
					class="toolbar-button"
					title="Clear selection"
					aria-label="Clear selection"
					style="margin-right: 1em;"
					onclick={() => selectionScope.clear()}
				>
					<MaterialIcon iconName="close" />
				</button>
				<span style="font-weight: 600;"
					>{selectionScope.selected.size} selected</span
				>
				<div
					style="margin-left: auto; display: flex; gap: 0.5rem; align-items: center;"
				>
					<Dropdown
						class="toolbar-button"
						icon="more_horiz"
						items={actionMenuItems}
						showSelectionIndicator={false}
						align="right"
					/>
				</div>
			</AssetToolbar>
		{:else}
			<AssetToolbar
				style="position: sticky; top: 0px; display: flex; justify-content: flex-end;"
				stickyToolbar={true}
			>
				<div style="display: flex; align-items: center; gap: 0.5rem;">
					<IconButton
						iconName="filter_list"
						class="toolbar-button"
						title="Filter"
						aria-label="Filter"
						onclick={() => {
							showFilterModal = true;
							modal.show = true;
						}}
					>
						Filter
					</IconButton>
					<Dropdown
						title="Display"
						class="toolbar-button"
						icon="list_alt"
						items={displayMenuItems}
						selectedItemId={getDisplaySelectedId()}
					/>
				</div>
			</AssetToolbar>
		{/if}
	{/if}
	{#if groups.length === 0}
		<div id="viz-no_assets">
			{@render noAssetsSnippet()}
		</div>
	{:else}
		<div class="photo-group-container">
			{#each consolidatedGroups as consolidatedGroup}
				<section class="photo-group">
					<h2 class="photo-group-label">{consolidatedGroup.label}</h2>

					<PhotoAssetGrid
						bind:allData={allImagesFlat}
						bind:view={viewSettings.current}
						data={consolidatedGroup.allImages}
						{scopeId}
						assetDblClick={(_e, asset) => {
							openLightbox(asset);
						}}
						onassetcontext={(detail: {
							asset: Image;
							anchor: { x: number; y: number } | HTMLElement;
						}) => {
							const { asset, anchor } = detail;
							if (
								!selectionScope.has(asset) ||
								selectionScope.selected.size <= 1
							) {
								selectionScope.clear();
								selectionScope.add(asset);
							}

							ctxItems = actionMenuItems.map((it: MenuItem) => ({
								...it,
								action: (e?: MouseEvent | KeyboardEvent) => {
									if (it.label === "Download") {
										const selected = Array.from(selectionScope.selected);
										performImageDownloads(selected);
									} else {
										it.action?.(e as any);
									}
								}
							}));
							ctxAnchor = anchor;
							ctxShowMenu = true;
						}}
					/>
				</section>
			{/each}
		</div>
	{/if}
</VizViewContainer>

<!-- Context menu for right-click on assets -->
<ContextMenu
	bind:showMenu={ctxShowMenu}
	items={ctxItems}
	anchor={ctxAnchor}
	offsetY={0}
/>

<style lang="scss">
	.photo-group-container {
		display: flex;
		flex-direction: column;
		padding: 2rem 2rem;
		box-sizing: border-box;
		width: 100%;
	}

	.photo-group {
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
		margin-bottom: 1rem;
		width: 100%;

		h2 {
			font-weight: 400;
			font-size: 1.2rem;
			color: var(--imag-10);
			width: fit-content;
		}
	}

	#add_to_imagine-container {
		display: flex;
		flex-direction: column;
		justify-content: left;
	}

	#viz-no_assets {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}
</style>
