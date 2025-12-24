<script lang="ts">
	import PhotoAssetGrid, {
		type AssetGridView
	} from "$lib/components/PhotoAssetGrid.svelte";
	import LoadingContainer from "$lib/components/LoadingContainer.svelte";
	import VizViewContainer from "$lib/components/panels/VizViewContainer.svelte";
	import { type Image } from "$lib/api";
	import { DateTime } from "luxon";
	import { getFullImagePath } from "$lib/api";
	import MaterialIcon from "$lib/components/MaterialIcon.svelte";
	import { SvelteSet } from "svelte/reactivity";
	import {
		listImages,
		deleteImagesBulk,
		signDownload,
		downloadImagesZipBlob,
		getImage
	} from "$lib/api";
	import AssetToolbar from "$lib/components/AssetToolbar.svelte";
	import Dropdown from "$lib/components/Dropdown.svelte";
	import ContextMenu from "$lib/context-menu/ContextMenu.svelte";
	import type { MenuItem } from "$lib/context-menu/types";
	import { fade } from "svelte/transition";
	import hotkeys from "hotkeys-js";
	import UploadManager, {
		type ImageUploadSuccess,
		waitForUploadCompletion
	} from "$lib/upload/manager.svelte";
	import { UploadState } from "$lib/upload/asset.svelte";
	import { createCollection, addCollectionImages } from "$lib/api";
	import {
		SUPPORTED_IMAGE_TYPES,
		SUPPORTED_RAW_FILES,
		type SupportedImageTypes
	} from "$lib/types/images";
	import { toastState } from "$lib/toast-notifcations/notif-state.svelte";
	import { goto, invalidateAll } from "$app/navigation";
	import ImageLightbox from "$lib/components/ImageLightbox.svelte";
	import Button from "$lib/components/Button.svelte";
	import { isLayoutPage, modal, viewSettings } from "$lib/states/index.svelte";
	import {
		selectionManager,
		SelectionScopeNames
	} from "$lib/states/selection.svelte";
	import { onDestroy } from "svelte";
	import { copyToClipboard } from "$lib/utils/misc.js";
	import CollectionModal from "$lib/components/modals/CollectionModal.svelte";
	import ConfirmationModal from "$lib/components/modals/ConfirmationModal.svelte";
	import FilterModal from "$lib/components/modals/FilterModal.svelte";
	import { downloadOriginalImageFile } from "$lib/utils/http.js";
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
	import { traverseFileTree } from "$lib/utils/files.js";
	import { performImageDownloads } from "$lib/utils/http.js";

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

	let { data } = $props();

	$effect(() => {
		untrack(() => {
			filterManager.setActiveScopeType("images");
			if (!filterManager.keepFilters) {
				filterManager.resetActiveScope();
			}
		});
	});

	// Pagination
	const pagination = $state({
		limit: data.limit,
		page: data.page
	});

	let images: Image[] = $state(data.images ?? []);
	let totalCount = $state<number>(data.count ?? 0);
	let hasMore = $state(!!data.next);
	let isPaginating = $state(false);

	// Page state
	let groups: DateGroup[] = $derived(groupImagesByDate(images) ?? []);

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

	// UI state: show a small spinner while a download is in progress
	let downloadInProgress = $state(false);

	// Context menu state for right-click on assets
	let ctxShowMenu = $state(false);
	let ctxItems: any[] = $state([]);
	let ctxAnchor: { x: number; y: number } | HTMLElement | null = $state(null);

	// Action menu items for selected images
	let actionMenuItems: MenuItem[] = $derived([
		{
			id: "act-download",
			label: "Download",
			icon: "download",
			action: () => {
				downloadInProgress = true;
				try {
					const items = Array.from(selectionScope.selected);
					performImageDownloads(items);
				} catch (err) {
					console.error("Download error", err);
					toastState.addToast({
						type: "error",
						message: `Download failed: ${err}`,
						timeout: 5000
					});
				} finally {
					downloadInProgress = false;
				}
			}
		},
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
		},
		{
			id: "act-share",
			label: "Share",
			icon: "share",
			action: () => {
				// TODO: Open share dialog
				toastState.addToast({
					type: "info",
					message: `Share ${selectionScope.selected.size} image(s) - Not yet implemented`,
					timeout: 3000
				});
			}
		},
		{
			id: "act-copy-link",
			label: "Copy Link",
			icon: "link",
			action: () => {
				const items = Array.from(selectionScope.selected);
				if (selectionScope.selected.size === 1) {
					const url = getFullImagePath(items[0].image_paths?.original);
					copyToClipboard(url);
					toastState.addToast({
						type: "success",
						message: "Link copied to clipboard",
						timeout: 3000
					});
				} else {
					toastState.addToast({
						type: "warning",
						message: "Can only copy link for a single image",
						timeout: 3000
					});
				}
			}
		},
		{
			id: "act-edit-metadata",
			label: "Edit Metadata",
			icon: "edit",
			action: () => {
								// TODO: Open metadata editor
				toastState.addToast({
					type: "info",
					message: `Edit metadata for ${selectionScope.selected.size} image(s) - Not yet implemented`,
					timeout: 3000
				});
			}
		},
		{
			id: "act-move-to-trash",
			label: "Move to Trash",
			icon: "delete",
			action: async () => {
				const items = Array.from(selectionScope.selected);
				const okTrash = confirm(
					`Move ${items.length} selected image(s) to trash?`
				);

				if (!okTrash) {
					return;
				}

				try {
					const res = await deleteImagesBulk({
						uids: items.map((i) => i.uid),
						force: false
					});

					if (res.status === 200 || res.status === 207) {
						const deletedUIDs = (res.data.results ?? [])
							.filter((r) => r.deleted)
							.map((r) => r.uid);
						images = images.filter((img) => !deletedUIDs.includes(img.uid));
						selectionScope.clear();
					} else {
						toastState.addToast({
							type: "error",
							message: res.data?.error ?? "Failed to delete images",
							timeout: 4000
						});
					}
				} catch (err) {
					toastState.addToast({
						type: "error",
						message: `Delete failed: ${err}`,
						timeout: 5000
					});
				}
			}
		},
		{
			id: "act-force-delete",
			label: "Force Delete",
			icon: "delete_forever",
			action: async () => {
				const items = Array.from(selectionScope.selected);
				const okForce = confirm(
					`Permanently delete ${items.length} image(s)? This action cannot be undone!`
				);

				if (!okForce) {
					return;
				}

				try {
					const res = await deleteImagesBulk({
						uids: items.map((i) => i.uid),
						force: true
					});

					if (res.status === 200 || res.status === 207) {
						const deletedUIDs = (res.data.results ?? [])
							.filter((r) => r.deleted)
							.map((r) => r.uid);
						images = images.filter((img) => !deletedUIDs.includes(img.uid));
						selectionScope.clear();
					} else {
						toastState.addToast({
							type: "error",
							message: (res as any).data?.error ?? "Failed to delete images",
							timeout: 4000
						});
					}
				} catch (err) {
					toastState.addToast({
						type: "error",
						message: `Delete failed: ${err}`,
						timeout: 5000
					});
				}
			}
		}
	]);

	async function paginate() {
		if (isPaginating || !hasMore) {
			return;
		}

		isPaginating = true;
		const nextPage = pagination.page + 1;
		const res = await listImages({ limit: pagination.limit, page: nextPage });

		if (res.status === 200) {
			const nextItems = res.data.items?.map((i) => i.image) ?? [];
			images.push(...nextItems);

			// Update pagination state from response
			pagination.page = res.data.page ?? nextPage;
			totalCount = res.data.count ?? totalCount;
			hasMore = !!res.data.next;
		} else {
			// On error, avoid tight loops; allow retry on next scroll
			console.error("paginate: request failed", res);
			hasMore = false;
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
				images.push(...imagesToAdd);
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

{#if downloadInProgress}
	<div class="download-spinner" aria-live="polite" title="Download in progress">
		<LoadingContainer />
	</div>
{/if}

<!-- {#if isDragging} -->
<DragAndDropUpload {scopeId} {selectionScope} showCollectionCreateBox={true} />
<!-- {/if} -->

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
	bind:data={images}
	{hasMore}
	paginate={() => paginate()}
>
	{#if images.length > 0}
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
					></IconButton>
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
