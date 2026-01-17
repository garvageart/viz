<script module lang="ts">
	export type AssetGridView = "grid" | "list" | "thumbnails";
</script>

<script lang="ts" generics>
	import AssetGrid from "./AssetGrid.svelte";
	import { getFullImagePath, type Image } from "$lib/api";
	import { DateTime } from "luxon";
	import {
		mount,
		unmount,
		type ComponentProps,
		type Snippet,
		untrack
	} from "svelte";
	import { SvelteSet } from "svelte/reactivity";
	import { fade } from "svelte/transition";
	import {
		getImageLabel,
		getTakenAt,
		getThumbhashURL
	} from "$lib/utils/images";
	import { page } from "$app/state";
	import { selectionManager } from "$lib/states/selection.svelte";
	import ImageCard from "./ImageCard.svelte";
	import {
		type Props as TippyProps,
		followCursor,
		delegate,
		type Instance
	} from "tippy.js";
	import PhotoTooltip from "$lib/components/tooltips/PhotoTooltip.svelte";
	import "tippy.js/dist/tippy.css";
	import hotkeys, { type HotkeysEvent, type KeyHandler } from "hotkeys-js";
	import type { ImageWithDateLabel } from "$lib/photo-layout";
	import { isLayoutPage } from "$lib/states/index.svelte";
	import { filterManager } from "$lib/states/filter.svelte";
	import { DragData } from "$lib/drag-drop/data";
	import { VizMimeTypes } from "$lib/constants";
	import LabelSelector from "./LabelSelector.svelte";
	import { debounce } from "$lib/utils/misc";
	import MaterialIcon from "./MaterialIcon.svelte";

	interface PhotoSpecificProps {
		/** Custom photo card snippet - if not provided, uses default photo card */
		photoCardSnippet?: Snippet<[Image]>;
		/** Complete flat list of all images for cross-group range selection */
		allData?: Image[];
		/** Unique identifier for selection state management */
		scopeId?: string;
	}

	type Props = Omit<ComponentProps<typeof AssetGrid<Image>>, "assetSnippet"> &
		PhotoSpecificProps;

	let {
		data = $bindable(),
		allData = $bindable(), // Complete flat list of all images for cross-group range selection
		assetGridArray = $bindable(),
		columnCount = $bindable(),
		searchValue = $bindable(""),
		noAssetsMessage = "No photos found",
		assetDblClick,
		disableOutsideUnselect = $bindable(false),
		onassetcontext = $bindable(),
		assetGridDisplayProps = $bindable({}),
		view = $bindable("grid"),
		columns = $bindable(),
		table = $bindable(),
		photoCardSnippet,
		scopeId = "photos-default"
	}: Props = $props();

	// Selection Management
	let selection = $derived(selectionManager.getScope<Image>(scopeId));
	let selectedUIDs = $derived(
		new Set(Array.from(selection.selected).map((i) => i.uid))
	);

	// Sync data source to selection scope so filters can access it
	$effect(() => {
		const source = allData || data;
		if (source) {
			selection.setSource(source);
			if (
				filterManager.activeScope &&
				filterManager.activeScope.isImageScope()
			) {
				filterManager.activeScope.updateFacets(source);
			}
		}
	});

	// Apply filters
	// We filter the *view* data (`data` prop) locally for display.
	let filteredData = $derived(filterManager.apply(data) as Image[]);

	function onFocus() {
		selectionManager.setActive(scopeId);
	}

	function handleSelectAll(e: KeyboardEvent) {
		if (selectionManager.activeScopeId !== scopeId) {
			return;
		}
		if (view !== "grid") {
			return;
		}

		e.preventDefault();
		// Select filtered data, not hidden data
		const selectionData = filteredData;
		selection.selectMultiple(selectionData);
	}

	function handleEscape(e: KeyboardEvent) {
		if (selectionManager.activeScopeId !== scopeId) {
			return;
		}
		if (view !== "grid") {
			return;
		}
		if (selection.selected.size === 0 && !selection.active) {
			return;
		}

		selection.clear();
	}

	function getAssetPosition(assetId: string) {
		for (let r = 0; r < justifiedRows.length; r++) {
			const row = justifiedRows[r];
			let currentX = 0;
			for (let i = 0; i < row.items.length; i++) {
				const item = row.items[i];
				if (item.asset.uid === assetId) {
					return {
						rowIndex: r,
						centerX: currentX + item.width / 2
					};
				}
				currentX += item.width + gridGap;
			}
		}
		return null;
	}

	function handleKeyNav(e: KeyboardEvent, handler: HotkeysEvent) {
		if (selectionManager.activeScopeId !== scopeId) {
			return;
		}
		if (view !== "grid") {
			return;
		}

		e.preventDefault();

		if (!filteredData.length) {
			return;
		}

		if (!selection.active) {
			// If allData is provided, only the grid containing the very first global image should set the initial selection
			if (allData && allData.length > 0) {
				if (filteredData[0].uid === allData[0].uid) {
					selection.select(filteredData[0]);
				}
			} else {
				// Standalone grid: just select the first item
				selection.select(filteredData[0]);
			}
			return;
		}

		const activeId = selection.active.uid;
		const currentIndex = filteredData.findIndex((a) => a.uid === activeId);

		// If the active item is not in this grid, do nothing (let the owning grid handle it)
		if (currentIndex === -1) {
			return;
		}

		if (handler.key === "left" || handler.key === "right") {
			if (handler.key === "left") {
				if (currentIndex > 0) {
					selection.select(filteredData[currentIndex - 1]);
				} else if (allData) {
					// Boundary: Try to go to previous global item
					const globalIndex = allData.findIndex((a) => a.uid === activeId);
					if (globalIndex > 0) {
						selection.select(allData[globalIndex - 1]);
					}
				}
			} else {
				if (currentIndex < filteredData.length - 1) {
					selection.select(filteredData[currentIndex + 1]);
				} else if (allData) {
					// Boundary: Try to go to next global item
					const globalIndex = allData.findIndex((a) => a.uid === activeId);
					if (globalIndex > -1 && globalIndex < allData.length - 1) {
						selection.select(allData[globalIndex + 1]);
					}
				}
			}
		} else {
			const pos = getAssetPosition(activeId);
			if (!pos) return;

			const targetRowIndex = pos.rowIndex + (handler.key === "up" ? -1 : 1);

			// Vertical Boundary Checks
			if (targetRowIndex < 0) {
				// Moved UP past top
				if (allData) {
					const globalIndex = allData.findIndex((a) => a.uid === activeId);
					// Fallback: Select previous global item (effectively wrapping to end of previous group)
					if (globalIndex > 0) {
						selection.select(allData[globalIndex - 1]);
					}
				}
				return;
			}

			if (targetRowIndex >= justifiedRows.length) {
				// Moved DOWN past bottom
				if (allData) {
					const globalIndex = allData.findIndex((a) => a.uid === activeId);
					// Fallback: Select next global item (effectively wrapping to start of next group)
					if (globalIndex > -1 && globalIndex < allData.length - 1) {
						selection.select(allData[globalIndex + 1]);
					}
				}
				return;
			}

			// Local column navigation
			const targetRow = justifiedRows[targetRowIndex];
			let closestItem = targetRow.items[0];
			let minDiff = Number.MAX_VALUE;
			let currentX = 0;

			for (const item of targetRow.items) {
				const itemCenterX = currentX + item.width / 2;
				const diff = Math.abs(itemCenterX - pos.centerX);

				if (diff < minDiff) {
					minDiff = diff;
					closestItem = item;
				}
				currentX += item.width + gridGap;
			}

			selection.select(closestItem.asset);
		}
	}

	$effect(() => {
		hotkeys("ctrl+a", handleSelectAll);
		hotkeys("escape", handleEscape);
		hotkeys("left,right,up,down", handleKeyNav);

		return () => {
			hotkeys.unbind("ctrl+a", handleSelectAll);
			hotkeys.unbind("escape", handleEscape);
			hotkeys.unbind("left,right,up,down", handleKeyNav);
		};
	});

	// Styling stuff
	const padding = `0em ${isLayoutPage() ? "1em" : page.url.pathname === "/photos" ? "0em" : "2em"}`;
	const assetLookup = $derived(new Map(data.map((a) => [a.uid, a])));

	function getAssetFromElement(el: HTMLElement): Image | undefined {
		const assetId = el.dataset.assetId;
		if (!assetId) {
			return undefined;
		}

		return assetLookup.get(assetId) || allData?.find((a) => a.uid === assetId);
	}

	$effect(() => {
		if (!photoGridEl) {
			return;
		}

		// Initialize delegated Tippy instance on the grid container
		const delegatedTippy = delegate(photoGridEl, {
			target: ".asset-photo", // Delegate tooltips to elements matching this selector
			allowHTML: true,
			theme: "viz",
			followCursor: "initial",
			plugins: [followCursor],
			arrow: false,
			delay: [500, 0],
			moveTransition: "opacity 0.1s ease-out",
			interactive: true,
			onShow(instance: Instance<TippyProps>) {
				const assetEl = instance.reference as HTMLElement;
				const asset = getAssetFromElement(assetEl);
				if (!asset) {
					return false; // Don't show tooltip if asset data isn't found
				}

				const contentNode = document.createElement("div");
				// Store the component instance on the Tippy instance for cleanup
				(instance as any)._svelteTooltipComponent = mount(PhotoTooltip, {
					target: contentNode,
					props: { asset }
				});
				instance.setContent(contentNode);
			},
			onHidden(instance: Instance<TippyProps>) {
				const component = (instance as any)._svelteTooltipComponent;
				if (component) {
					unmount(component);
					(instance as any)._svelteTooltipComponent = undefined;
				}
				instance.setContent(""); // Clear content
			},
			// Ensure consistent positioning across renders
			popperOptions: {
				modifiers: [
					{
						name: "flip",
						options: {
							fallbackPlacements: ["top", "bottom", "left", "right"]
						}
					}
				]
			}
		});

		return () => {
			delegatedTippy.destroy();
		};
	});

	// ALL GRID IMAGE RENDERING STUFF
	// ----------------------------
	const isMultiSelecting = $derived(selection.selected.size > 1);

	// Count date labels so we can hide the inline badge in the trivial case
	// where there is only one date group and that group contains a single image.
	const dateGroupCounts = $derived.by(() => {
		const counts: Record<string, number> = {};
		for (const d of filteredData) {
			const label = (d as ImageWithDateLabel).dateLabel ?? "";
			if (!label) {
				continue;
			}

			counts[label] = (counts[label] || 0) + 1;
		}

		return counts;
	});

	const dateGroupCount = $derived(Object.keys(dateGroupCounts).length);

	// Virtualized photo-grid state
	let gridItemSize: number = $state(640); // legacy fallback for square grid; used as a base size hint
	let gridGap: number = $state(8); // gap between items and rows
	let totalHeight: number = $state(0);
	let scrollTop: number = $state(0);
	let targetRowHeight: number = $state(240);
	let bufferPx = 200; // extra pixels above/below viewport for virtualization (reduced)

	type JustifiedItem = { asset: Image; width: number; height: number };
	type JustifiedRow = { items: JustifiedItem[]; height: number; top: number };

	let justifiedRows: JustifiedRow[] = $state([]);
	let visibleRows: JustifiedRow[] = $state([]);

	let photoGridEl: HTMLDivElement | undefined = $state();

	// Helper to find the first visible row index using binary search O(log N)
	function findStartIndex(rows: JustifiedRow[], scrollTop: number): number {
		let low = 0;
		let high = rows.length - 1;
		while (low <= high) {
			const mid = (low + high) >>> 1;
			if (rows[mid].top + rows[mid].height < scrollTop) {
				low = mid + 1;
			} else {
				high = mid - 1;
			}
		}
		return Math.max(0, low);
	}

	// Build justified rows layout and compute visible rows based on scroll.
	function updateVirtualGrid() {
		if (!photoGridEl) {
			return;
		}

		// Get computed padding to calculate available width
		const computedStyle = window.getComputedStyle(photoGridEl);
		const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
		const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
		const availableWidth = photoGridEl.clientWidth - paddingLeft - paddingRight;

		const viewportH = photoGridEl.clientHeight || window.innerHeight;

		// 1) Build all rows for current data and available width (excluding padding)
		// Access filteredData reactively
		const images = filteredData;
		justifiedRows = buildJustifiedRows(
			availableWidth,
			images,
			targetRowHeight,
			gridGap
		);
		totalHeight = justifiedRows.length
			? justifiedRows[justifiedRows.length - 1].top +
				justifiedRows[justifiedRows.length - 1].height
			: 0;

		// 2) Compute visible rows window
		scrollTop = photoGridEl.scrollTop || 0;
		const minY = Math.max(0, scrollTop - bufferPx);
		const maxY = scrollTop + viewportH + bufferPx;

		const startIndex = findStartIndex(justifiedRows, minY);
		let endIndex = startIndex;
		while (
			endIndex < justifiedRows.length &&
			justifiedRows[endIndex].top <= maxY
		) {
			endIndex++;
		}

		visibleRows = justifiedRows.slice(startIndex, endIndex);
	}

	function buildJustifiedRows(
		containerWidth: number,
		images: Image[],
		targetH: number,
		gap: number
	): JustifiedRow[] {
		const rows: JustifiedRow[] = [];
		let current: { asset: Image; ar: number }[] = [];
		let sumAR = 0;
		let top = 0;
		const maxScale = 1.3; // allow up to +30% above target height before wrapping
		const minScale = 0.8; // allow down to -20% below target before forcing wrap

		for (const asset of images) {
			const aspectRatio = Math.max(
				0.1,
				(asset.width || 4) / (asset.height || 3)
			);
			current.push({ asset, ar: aspectRatio });
			sumAR += aspectRatio;

			const rowH =
				(containerWidth - gap * Math.max(0, current.length - 1)) / sumAR;

			// Decide if this row is ready: when rowH <= targetH * maxScale
			if (rowH <= targetH * maxScale) {
				const height = Math.max(
					Math.round(Math.min(rowH, targetH * maxScale)),
					50
				);
				let items: JustifiedItem[] = current.map(({ asset, ar }) => ({
					asset,
					width: Math.round(ar * height),
					height
				}));

				items = fitRowToWidth(items, containerWidth, gap); // adjust widths to exactly fit to avoid horizontal overflow
				rows.push({ items, height, top });
				top += height + gap;

				current = [];
				sumAR = 0;
			}
		}

		// Handle last row: scale to stay close to target without stretching too much
		if (current.length) {
			const rowH =
				(containerWidth - gap * Math.max(0, current.length - 1)) / sumAR;
			const height = Math.round(
				Math.min(Math.max(rowH, targetH * minScale), targetH)
			);
			let items: JustifiedItem[] = current.map(({ asset, ar }) => ({
				asset,
				width: Math.round(ar * height),
				height
			}));
			// For the last row we do not force full width (common justified gallery behaviour), but ensure it doesn't exceed container width
			items = clampRowToWidth(items, containerWidth, gap);
			rows.push({ items, height, top });
			top += height + gap;
		}

		// Adjust total height by removing the last added gap
		if (rows.length) {
			rows[rows.length - 1].top = rows[rows.length - 1].top; // no-op; clarify intention
		}

		return rows;
	}

	// Ensure a row exactly fits the container width (summing item widths + gaps) by proportionally scaling widths, then distributing rounding diff.
	function fitRowToWidth(
		items: JustifiedItem[],
		containerWidth: number,
		gap: number
	): JustifiedItem[] {
		if (!items.length) {
			return items;
		}

		const gapTotal = gap * (items.length - 1);
		const totalItemWidth = items.reduce((s, i) => s + i.width, 0);
		const available = Math.max(0, containerWidth - gapTotal);

		if (totalItemWidth === available) {
			return items;
		}

		const scale = available / totalItemWidth;
		let scaled = items.map((i) => ({
			...i,
			width: Math.max(1, Math.round(i.width * scale))
		}));

		// Adjust rounding diff
		let diff = available - scaled.reduce((s, i) => s + i.width, 0);
		let idx = 0;

		while (diff !== 0 && idx < scaled.length * 3) {
			// safety
			const i = scaled[idx % scaled.length];
			if (diff > 0) {
				i.width += 1;
				diff -= 1;
			} else if (diff < 0 && i.width > 1) {
				i.width -= 1;
				diff += 1;
			}
			idx++;
		}

		return scaled;
	}

	// Clamp a row so it never exceeds container width (without stretching to fill if shorter)
	function clampRowToWidth(
		items: JustifiedItem[],
		containerWidth: number,
		gap: number
	): JustifiedItem[] {
		const gapTotal = gap * (items.length - 1);
		let totalItemWidth = items.reduce((s, i) => s + i.width, 0);

		const maxAllowed = containerWidth - gapTotal;
		if (totalItemWidth <= maxAllowed) {
			return items;
		}

		// Scale down
		const scale = maxAllowed / totalItemWidth;
		let scaled = items.map((i) => ({
			...i,
			width: Math.max(1, Math.round(i.width * scale))
		}));

		// After scaling, ensure we didn't overshoot due to rounding
		let diff = maxAllowed - scaled.reduce((s, i) => s + i.width, 0);
		let idx = 0;

		while (diff !== 0 && idx < scaled.length * 3) {
			const it = scaled[idx % scaled.length];

			if (diff > 0) {
				it.width += 1;
				diff -= 1;
			} else if (diff < 0 && it.width > 1) {
				it.width -= 1;
				diff += 1;
			}
			idx++;
		}

		return scaled;
	}

	function scrollToAsset(asset: Image) {
		if (!photoGridEl || !justifiedRows.length) {
			return;
		}

		// Find the scroll container
		let scroller: HTMLElement | Window = window;
		let parent = photoGridEl.parentElement;
		while (parent) {
			const style = window.getComputedStyle(parent);
			if (
				style.overflowY === "auto" ||
				style.overflowY === "scroll" ||
				style.overflow === "auto" ||
				style.overflow === "scroll"
			) {
				scroller = parent;
				break;
			}
			parent = parent.parentElement;
		}

		for (const row of justifiedRows) {
			if (row.items.some((i) => i.asset.uid === asset.uid)) {
				const gridRect = photoGridEl.getBoundingClientRect();
				const rowRectTop = gridRect.top + row.top;
				const rowRectBottom = rowRectTop + row.height;

				let viewTop = 0;
				let viewBottom = window.innerHeight;

				if (scroller instanceof HTMLElement) {
					const rect = scroller.getBoundingClientRect();
					viewTop = rect.top;
					viewBottom = rect.bottom;
				}

				const scrollPadding = 150;

				if (rowRectTop < viewTop + scrollPadding) {
					scroller.scrollBy({
						top: rowRectTop - viewTop - scrollPadding,
						behavior: "instant"
					});
				} else if (rowRectBottom > viewBottom - scrollPadding) {
					scroller.scrollBy({
						top: rowRectBottom - viewBottom + scrollPadding,
						behavior: "instant"
					});
				}
				break;
			}
		}
	}

	$effect(() => {
		if (selection.active && photoGridEl) {
			untrack(() => scrollToAsset(selection.active!));
		}
	});

	// Action to initialize grid and setup observers
	function initGrid(node: HTMLDivElement) {
		photoGridEl = node;

		// Initial synchronous layout to prevent flash
		if (filteredData.length > 0) {
			untrack(() => updateVirtualGrid());
		}

		const debouncedUpdate = debounce(
			() => requestAnimationFrame(() => untrack(() => updateVirtualGrid())),
			100
		);
		const resizeObserver = new ResizeObserver(debouncedUpdate);
		resizeObserver.observe(node);

		return {
			destroy() {
				resizeObserver.disconnect();
				photoGridEl = undefined;
			}
		};
	}

	// Re-run layout when data changes
	$effect(() => {
		if (filteredData) {
			if (photoGridEl) {
				untrack(() => updateVirtualGrid());
			}
		}
	});

	function handleGridScroll(_e: Event) {
		if (!photoGridEl) {
			return;
		}

		scrollTop = photoGridEl.scrollTop;

		// Update visible rows on next frame to avoid layout thrash
		requestAnimationFrame(() => {
			const viewportH = photoGridEl!.clientHeight || window.innerHeight;
			const minY = Math.max(0, scrollTop - bufferPx);
			const maxY = scrollTop + viewportH + bufferPx;

			const startIndex = findStartIndex(justifiedRows, minY);
			let endIndex = startIndex;
			while (
				endIndex < justifiedRows.length &&
				justifiedRows[endIndex].top <= maxY
			) {
				endIndex++;
			}

			visibleRows = justifiedRows.slice(startIndex, endIndex);
		});
	}
	function getSizedPreviewUrl(asset: Image): string {
		const checksum = asset.image_metadata?.checksum;

		if (asset.image_paths?.thumbnail) {
			// Append fingerprint param to thumbnail URL so it can be cached as an immutable resource
			let url = asset.image_paths.thumbnail;
			if (checksum) {
				url = url + (url.includes("?") ? "&" : "?") + `v=${checksum}`;
			}
			return getFullImagePath(url);
		}

		// Use a smaller preview size for grid thumbnails to reduce bandwidth/cpu.
		const PREVIEW_SIZE = 400;
		let url = `/images/${asset.uid}/file?format=webp&w=${PREVIEW_SIZE}&h=${PREVIEW_SIZE}&quality=85`;
		if (checksum) {
			url = url + `&v=${checksum}`;
		}

		return getFullImagePath(url);
	}

	// Lightbox prefetch helpers
	// Simple in-memory cache to avoid repeated prefetches for the same asset UID
	const lightboxPrefetchCache = new SvelteSet<string>();

	function prefetchLightboxImage(asset: Image) {
		if (!asset.uid) {
			return;
		}

		if (lightboxPrefetchCache.has(asset.uid)) {
			return;
		}

		lightboxPrefetchCache.add(asset.uid);
		const img = new Image();
		img.src = getFullImagePath(asset.image_paths.preview);
		img.onload = () => {
			// loaded & cached by browser; keep UID in cache to avoid re-fetching
		};

		img.onerror = () => {
			// If loading fails, allow future retries
			lightboxPrefetchCache.delete(asset.uid);
		};
	}

	function handleImageCardSelect(asset: Image, e: MouseEvent | KeyboardEvent) {
		onFocus(); // Ensure this grid is active on click

		if (e.shiftKey) {
			const selectionData =
				allData && allData.length > 0 ? allData : filteredData;
			const ids = selectionData.map((i: Image) => i.uid);
			const endIndex = ids.indexOf(asset.uid);
			const startIndex = selection.active
				? ids.indexOf(selection.active.uid)
				: -1;

			// If both start and end are found, do range selection
			if (startIndex !== -1 && endIndex !== -1) {
				selection.selected.clear();

				const start = Math.min(startIndex, endIndex);
				const end = Math.max(startIndex, endIndex);

				for (let i = start; i <= end; i++) {
					selection.add(selectionData[i]);
				}
			} else {
				// If anchor not found (shouldn't happen with allData), just add this asset
				selection.add(asset);
			}
		} else if (e.ctrlKey) {
			selection.toggle(asset);
		} else {
			selection.select(asset);
		}
	}

	function handleContainerClick(e: MouseEvent) {
		onFocus();
		const target = e.target as HTMLElement;

		// If we clicked on an asset photo or inside one, don't clear selection here
		if (target.closest(".asset-photo")) {
			return;
		}

		// Scrollbar check
		const element = e.currentTarget as HTMLElement;
		if (target === element) {
			const rect = element.getBoundingClientRect();
			// check if click is on vertical scrollbar (right side)
			if (
				e.clientX >=
				rect.right - (element.offsetWidth - element.clientWidth)
			) {
				return;
			}
			// check if click is on horizontal scrollbar (bottom)
			if (
				e.clientY >=
				rect.bottom - (element.offsetHeight - element.clientHeight)
			) {
				return;
			}
		}

		selection.clear();
	}

	function unselectImagesOnClickOutsideAssetContainer(element: HTMLElement) {
		const clickHandler = (e: MouseEvent) => {
			if (disableOutsideUnselect) {
				return;
			}
			const target = e.target as HTMLElement;
			const selectionToolbar = target.closest(".selection-toolbar") as
				| HTMLElement
				| undefined;

			// ignore the selection toolbar since this is what we use do actions
			if (target === selectionToolbar || selectionToolbar?.contains(target)) {
				return;
			}

			// If click is inside ANY grid container, don't clear (supports multiple grids sharing one selection)
			const allGrids = Array.from(
				document.querySelectorAll(".viz-photo-grid-container")
			) as HTMLElement[];
			const insideAnyGrid = allGrids.some((g) => g.contains(target));

			if (insideAnyGrid) {
				return;
			}

			if (isLayoutPage()) {
				// On layout page, only clear if clicked inside the parent panel
				const parentPanel = element.closest(".tab-group-panel");
				if (parentPanel && parentPanel.contains(target)) {
					selection.clear();
				}
				return;
			}

			// Otherwise clear selection
			selection.clear();
		};

		document.addEventListener("click", clickHandler);

		return {
			destroy() {
				document.removeEventListener("click", clickHandler);
			}
		};
	}
</script>

{#snippet defaultPhotoCard(asset: ImageWithDateLabel)}
	{@const isSelected =
		selectedUIDs.has(asset.uid) || selection.active?.uid === asset.uid}
	<div
		class="asset-photo"
		draggable="true"
		ondragstart={(e: DragEvent) => {
			if (!selectedUIDs.has(asset.uid)) {
				selection.select(asset);
			}
			// When dragging, if multiple selected use that set, otherwise drag the single asset
			const uids =
				selection.selected.size > 1
					? Array.from(selection.selected).map((i) => i.uid)
					: [asset.uid];
			try {
				if (e.dataTransfer) {
					const dragData = new DragData(VizMimeTypes.IMAGE_UIDS, uids);
					dragData.setData(e.dataTransfer);
					e.dataTransfer.effectAllowed = "copy";
					const target = e.currentTarget as HTMLElement;
					const img = target.querySelector(".tile-image") as HTMLImageElement;
					if (img) {
						// Set the drag image to the visible thumbnail
						e.dataTransfer.setDragImage(img, 0, 0);
					}
				}
			} catch (err) {
				// ignore
			}
		}}
		ondragend={() => {
			DragData.clear();
		}}
		data-asset-id={asset.uid}
		class:selected-photo={isSelected}
		class:multi-selected-photo={isSelected && isMultiSelecting}
		role="button"
		tabindex="0"
		onfocus={() => prefetchLightboxImage(asset)}
		onclick={(e) => {
			e.preventDefault();
			handleImageCardSelect(asset, e);
		}}
		onkeydown={(e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				handleImageCardSelect(asset, e);
			}
		}}
		oncontextmenu={(e: MouseEvent & { currentTarget: HTMLElement }) => {
			e.preventDefault();
			if (!selectedUIDs.has(asset.uid) || selection.selected.size <= 1) {
				selection.select(asset);
			}

			onassetcontext?.({ asset, anchor: { x: e.clientX, y: e.clientY } });
		}}
		ondblclick={(e) => {
			if (e.ctrlKey) {
				e.preventDefault();
				return;
			}
			assetDblClick?.(e, asset);
		}}
	>
		{#if asset?.isFirstOfDate && asset?.dateLabel && !(dateGroupCount === 1 && dateGroupCounts[asset.dateLabel] === 1)}
			<div class="inline-date-badge">{asset.dateLabel}</div>
		{/if}
		{#if asset.image_metadata?.label || asset.favourited}
			<div class="image-metadata-display">
				{#if asset.image_metadata?.label}
					<LabelSelector
						variant="compact"
						enableSelection={false}
						label={getImageLabel(asset)}
					/>
				{/if}
				{#if asset.favourited}
					<MaterialIcon
						iconName="favorite"
						style="font-size: 0.8rem; color: white;"
						fill={true}
					/>
				{/if}
			</div>
		{/if}
		{#if asset.image_paths}
			{@const thumbhashURL = getThumbhashURL(asset)}
			<div class="tile-image-container" style={`height: 100%;`}>
				{#if thumbhashURL}
					<img
						class="tile-placeholder"
						src={thumbhashURL}
						alt="Placeholder image for {asset.name ??
							asset.image_metadata?.file_name ??
							''}"
						aria-hidden="true"
						data-placeholder-uid={asset.uid}
					/>
				{/if}
				<img
					draggable="false"
					class="tile-image"
					src={getSizedPreviewUrl(asset)}
					alt={asset.name ?? asset.image_metadata?.file_name ?? ""}
					loading="lazy"
					onload={(e) => {
						(e.currentTarget as HTMLImageElement)
							.closest(".asset-photo")
							?.classList.add("img-loaded");
						document
							.querySelector(`img[data-placeholder-uid="${asset.uid}"]`)
							?.remove();
					}}
				/>
			</div>
			{#if isSelected && isMultiSelecting}
				<div
					class="multi-select-ring"
					transition:fade={{ duration: 120 }}
				></div>
			{/if}
		{:else}
			<span class="asset-preview-fallback">{asset.name ?? asset.uid}</span>
		{/if}

		<div class="photo-overlay">
			<div class="photo-overlay-inner">
				<div class="photo-name">{asset.name}</div>
				<div class="photo-meta">
					<div class="photo-date">
						{DateTime.fromJSDate(getTakenAt(asset)).toFormat(
							"dd LLL yyyy • HH:mm"
						)}
					</div>
				</div>
			</div>
		</div>
	</div>
{/snippet}

{#snippet imageCard(asset: Image)}
	<ImageCard {asset} />
{/snippet}

{#if view === "grid"}
	<div
		use:initGrid
		class="viz-photo-grid-container no-select"
		class:is-active={selectionManager.activeScopeId === scopeId}
		style="padding: {padding};"
		onscroll={handleGridScroll}
		use:unselectImagesOnClickOutsideAssetContainer
		onclick={handleContainerClick}
		onkeydown={onFocus}
		onfocusin={onFocus}
		role="grid"
		aria-label="Photo Grid"
		tabindex="0"
	>
		<div style={`height: ${totalHeight}px; position: relative;`}>
			{#each visibleRows as row}
				<div
					class="justified-row"
					style={`position:absolute; top:${row.top}px; left:0; right:0; gap:${gridGap}px; height:${row.height}px;`}
				>
					{#each row.items as item}
						<div
							style={`flex:0 0 ${item.width}px; height:${row.height}px;`}
							class="justified-item"
						>
							{@render defaultPhotoCard(item.asset)}
						</div>
					{/each}
				</div>
			{/each}
		</div>
	</div>
{:else}
	<!-- Delegate to AssetGrid for list/table/thumbnails view -->
	<AssetGrid
		bind:data={filteredData}
		bind:assetGridArray
		bind:columnCount
		bind:searchValue
		bind:view
		{noAssetsMessage}
		{assetDblClick}
		{disableOutsideUnselect}
		{onassetcontext}
		{columns}
		{table}
		{assetGridDisplayProps}
		{scopeId}
		assetSnippet={photoCardSnippet ?? imageCard}
	/>
{/if}

<style lang="scss">
	/* Photo grid (virtualized) styles */
	.viz-photo-grid-container {
		box-sizing: border-box;
		margin: 1em auto;
		width: 100%;
		max-width: 100%;
	}

	/* When used standalone (e.g., in collections), add top margin */
	.viz-photo-grid-container:first-child {
		margin-top: 2em;
	}

	.justified-row {
		display: flex;
		contain: layout style;
	}

	.justified-row .asset-photo {
		width: 100%;
		height: 100%;
	}

	.inline-date-badge {
		position: absolute;
		top: 6px;
		right: 6px;
		z-index: 2;
		background: rgba(0, 0, 0, 0.55);
		color: var(--imag-10-dark);
		padding: 2px 6px;
		font-size: 0.75rem;
		line-height: 1.2;
		border-radius: 4px;
		backdrop-filter: blur(2px);
	}

	.image-metadata-display {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		position: absolute;
		top: 0.3rem;
		left: 0.3rem;
		z-index: 2;
	}

	.asset-photo {
		position: relative;
		overflow: hidden;
	}

	.asset-photo img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.asset-photo.multi-selected-photo {
		outline: 2px solid var(--imag-primary);
		background: var(--imag-bg-color);
	}

	.viz-photo-grid-container.is-active .asset-photo.multi-selected-photo {
		outline-color: var(--imag-primary);
	}

	.asset-photo.selected-photo {
		outline: 2px solid var(--imag-60);
	}

	.viz-photo-grid-container.is-active .asset-photo.selected-photo {
		outline-color: var(--imag-primary);
	}

	.multi-select-ring {
		position: absolute;
		inset: 0;
		pointer-events: none;
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.08),
			inset 0 0 18px 6px rgba(0, 0, 0, 0.55);
	}

	.asset-photo .tile-image-container {
		transform: scale(1);
		transition: transform 0.18s ease;
		will-change: transform;
	}

	.asset-photo.multi-selected-photo .tile-image-container {
		transform: scale(0.98);
	}

	.tile-image-container {
		position: relative;
		width: 100%;
		height: 100%;
	}

	.tile-placeholder {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		filter: blur(12px) saturate(120%);
		transform: scale(1.05);
		transition: opacity 0.35s ease;
	}

	:global(.img-loaded) .tile-placeholder {
		display: none;
	}

	.tile-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		position: relative;
	}

	.photo-overlay {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		transform: translateY(100%);
		transition: transform 160ms ease;
		pointer-events: none;
	}

	.photo-overlay-inner {
		background: linear-gradient(to top, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0));
		color: white;
		padding: 0.5rem;
		font-size: 0.9rem;
		pointer-events: auto;
	}

	.asset-photo:hover .photo-overlay {
		transform: translateY(0%);
	}

	.photo-name {
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.photo-meta {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 0.5rem;
	}

	.photo-date {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.85);
	}

	.asset-preview-fallback {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		padding: 1rem;
		text-align: center;
		color: var(--imag-60);
		font-size: 0.9rem;
	}
</style>
