<script lang="ts" generics="T extends { uid: string } & Record<string, any>">
	import { untrack } from "svelte";
	import { dev } from "$app/environment";
	import { buildGridArray } from "$lib/utils/dom";
	import { SvelteSet } from "svelte/reactivity";
	import hotkeys from "hotkeys-js";
	import type { AssetGridArray, AssetSortBy } from "$lib/types/asset";
	import type { SvelteSnippet } from "$lib/types/snippet";
	import {
		debugMode,
		sort,
		modal,
		tableColumnSettings,
		isLayoutPage
	} from "$lib/states/index.svelte";
	import { selectionManager } from "$lib/states/selection.svelte";
	import MaterialIcon from "./MaterialIcon.svelte";
	import { DateTime } from "luxon";
	import { getFullImagePath } from "$lib/api";
	import type { SvelteHTMLElements } from "svelte/elements";
	import type { AssetGridView } from "./PhotoAssetGrid.svelte";
	import TableColumnSelectorModal from "./modals/TableColumnSelectorModal.svelte";
	import { snakeToTitle } from "$lib/utils/strings";
	import { tryParseDate } from "$lib/utils/dates";

	interface DisplayableAsset {
		uid: string;
		name?: string;
		created_at?: string;
		image_paths?: {
			thumbnail?: string;
			preview?: string;
		};
		image_metadata?: {
			file_name?: string;
			file_created_at?: string;
		};
		[key: string]: any;
	}

	interface Props {
		data: T[];
		assetSnippet: SvelteSnippet<[T]>;
		assetGridArray?: AssetGridArray<T>;
		view?: Omit<AssetGridView, "grid">;
		assetGridDisplayProps?: SvelteHTMLElements["div"];
		columnCount?: number;
		searchValue?: string;
		noAssetsMessage?: string;
		disableMultiSelection?: boolean;
		assetDblClick?: (
			e: MouseEvent & {
				currentTarget: EventTarget & (HTMLDivElement | HTMLTableRowElement);
			},
			asset: T
		) => void;
		/** Disable clearing selection when clicking in other grids (useful when multiple grids share one selection set) */
		disableOutsideUnselect?: boolean;
		onassetcontext?: (detail: {
			asset: T;
			anchor: { x: number; y: number } | HTMLElement;
		}) => void;
		/** optional explicit column list for table view (order matters). If omitted, inferred from data. */
		columns?: string[];
		/** table config: thumbnail_key is dot-path to thumbnail in each asset, columns overrides visible keys */
		table?: { thumbnail_key?: string; columns?: string[] };
		/** Unique identifier for selection state management */
		scopeId?: string;
	}

	let {
		data = $bindable(),
		assetSnippet,
		assetGridArray = $bindable(),
		columnCount = $bindable(),
		searchValue = $bindable(""),
		noAssetsMessage = "No assets found",
		assetDblClick,
		disableOutsideUnselect = $bindable(false),
		disableMultiSelection = $bindable(false),
		onassetcontext = $bindable(),
		view = $bindable("thumbnails"),
		assetGridDisplayProps = $bindable({}),
		columns = $bindable(),
		table = $bindable(),
		scopeId = "default"
	}: Props = $props();

	// Selection Management
	let selection = $derived(selectionManager.getScope<T>(scopeId));
	let selectedUIDs = $derived(
		new SvelteSet(Array.from(selection.selected).map((i) => i.uid))
	);

	function onFocus() {
		selectionManager.setActive(scopeId);
	}

	// HTML Elements
	let assetGridDisplayEl: HTMLDivElement | undefined = $state();

	let allAssetsData = $derived.by(() => {
		return data;
	});

	// Table column keys (safe: only primitive values)
	let tableKeys: string[] = $state([] as string[]);

	$effect(() => {
		if (allAssetsData.length === 0) {
			tableKeys = [];
			return;
		}

		const sample = allAssetsData[0] as any;
		tableKeys = Object.keys(sample).filter((k) => {
			const v = sample[k];
			return (
				v === null ||
				v === undefined ||
				typeof v === "string" ||
				typeof v === "number" ||
				typeof v === "boolean"
			);
		});
	});

	// Visible keys in table: prefer explicit `columns` prop, otherwise inferred from settings
	let visibleKeys = $derived.by(() => {
		if (Array.isArray(table?.columns) && table!.columns!.length > 0) {
			return table!.columns!;
		} else if (Array.isArray(columns) && columns.length > 0) {
			return columns;
		} else {
			// Filter inferred keys by persisted selection
			return tableKeys.filter((key) => tableColumnSettings.value.includes(key));
		}
	});

	// Modal state
	let showColumnSelector = $state(false);

	$effect(() => {
		if (!modal.show) {
			showColumnSelector = false;
		}
	});

	// helper: get nested value by dot path
	function getNestedValue(obj: Record<string, any> | undefined, path?: string) {
		if (!obj || !path) {
			return undefined;
		}

		const parts = path.split(".");
		let cur: any = obj;
		for (const p of parts) {
			if (cur == null) {
				return undefined;
			}

			cur = cur[p];
		}

		return cur;
	}

	// Format a value for display: dates are formatted with Luxon, objects stringified, null/undefined -> ''
	function formatValueForKey(
		obj: Record<string, any> | undefined,
		key?: string
	) {
		let v: any = undefined;
		if (key) {
			v = getNestedValue(obj, key);
			if (v === undefined && obj) {
				v = (obj as any)[key];
			}
		} else {
			v = obj;
		}

		const dt = tryParseDate(v);
		if (dt) {
			return dt.toLocaleString(DateTime.DATETIME_MED);
		}

		if (v === null || v === undefined) {
			return "";
		}

		if (typeof v === "object") {
			try {
				return JSON.stringify(v);
			} catch {
				return String(v);
			}
		}

		return String(v);
	}

	// Inspecting/Debugging
	if (debugMode) {
		$inspect("selected asset", selection.active);
	}

	function scrollToAsset(asset: T) {
		if (!assetGridDisplayEl) {
			return;
		}

		const element = assetGridDisplayEl.querySelector(
			`[data-asset-id="${asset.uid}"]`
		) as HTMLElement;
		if (!element) {
			return;
		}

		const container = assetGridDisplayEl;
		const elementRect = element.getBoundingClientRect();
		const containerRect = container.getBoundingClientRect();

		const relativeTop = elementRect.top - containerRect.top + container.scrollTop;
		const relativeBottom = relativeTop + elementRect.height;

		const viewTop = container.scrollTop;
		const viewBottom = viewTop + container.clientHeight;

		if (relativeTop < viewTop) {
			container.scrollTo({
				top: relativeTop,
				behavior: "instant"
			});
		} else if (relativeBottom > viewBottom) {
			container.scrollTo({
				top: relativeBottom - container.clientHeight,
				behavior: "instant"
			});
		}
	}

	$effect(() => {
		if (selection.active && assetGridDisplayEl) {
			untrack(() => scrollToAsset(selection.active!));
		}
	});

	$effect(() => {
		if (!assetGridDisplayEl || allAssetsData.length === 0) {
			return;
		}

		const updateGridArray = () => {
			if (!assetGridDisplayEl) return;
			assetGridArray = buildAssetGridArray(assetGridDisplayEl);
		};

		// Use requestAnimationFrame to ensure DOM is updated
		requestAnimationFrame(() => {
			updateGridArray();
		});

		// Watch for resize changes
		const resizeObserver = new ResizeObserver(() => {
			requestAnimationFrame(() => {
				updateGridArray();
			});
		});

		resizeObserver.observe(assetGridDisplayEl);

		return () => {
			resizeObserver.disconnect();
		};
	});

	function handleImageCardSelect(asset: T, e: MouseEvent) {
		onFocus(); // Ensure this grid is active on click

		if (e.shiftKey) {
			if (disableMultiSelection) {
				selection.select(asset);
				return;
			}

			selection.selected.clear();

			const ids = allAssetsData.map((i: T) => i.uid);
			let startIndex = 0;
			const endIndex = ids.indexOf(asset.uid);

			if (selection.active) {
				startIndex = ids.indexOf(selection.active.uid);
			}

			const start = Math.min(startIndex, endIndex);
			const end = Math.max(startIndex, endIndex);

			for (let i = start; i <= end; i++) {
				selection.add(allAssetsData[i]);
			}
		} else if (e.ctrlKey) {
			selection.toggle(asset);
		} else {
			selection.select(asset);
		}
	}

	function handleKeydownCardSelect(asset: T, e: KeyboardEvent) {
		if (!assetGridArray) {
			return;
		}

		if (
			e.key !== "ArrowLeft" &&
			e.key !== "ArrowRight" &&
			e.key !== "ArrowUp" &&
			e.key !== "ArrowDown" &&
			e.key !== "Tab" &&
			!e.shiftKey &&
			!e.metaKey
		) {
			return;
		}

		const imageInGridArray = assetGridArray
			.find((i) => i.find((j) => j.asset?.uid === asset.uid))
			?.find((j) => j.asset?.uid === asset.uid);

		if (!imageInGridArray) {
			if (dev) {
				console.warn(`Can't find asset ${asset.uid} in grid array`);
			}

			return;
		}

		const columnCount = assetGridArray[0].length;
		const positionIndexInGrid =
			imageInGridArray.row * columnCount + imageInGridArray.column;
		const imageGridChildren = assetGridDisplayEl?.children;

		// Mimic click since we already have a handler for that in `handleImageCardSelect()`
		const focusAndSelectElement = (element: HTMLElement | undefined) => {
			// out of bounds
			if (!element) {
				return;
			}

			// maybe unnessary to blur but i wanna make sure lmao
			(imageGridChildren?.item(positionIndexInGrid) as HTMLElement).blur();
			element.focus();
			element.click();
		};

		switch (e.key) {
			case "ArrowRight":
				const elementRight = imageGridChildren?.item(
					positionIndexInGrid + 1
				) as HTMLElement;
				focusAndSelectElement(elementRight);
				break;
			case "ArrowLeft":
				const elementLeft = imageGridChildren?.item(
					positionIndexInGrid - 1
				) as HTMLElement;
				focusAndSelectElement(elementLeft);
				break;
			case "ArrowUp":
				const elementUp = imageGridChildren?.item(
					positionIndexInGrid - columnCount
				) as HTMLElement;
				focusAndSelectElement(elementUp);
				break;
			case "ArrowDown":
				const elementDown = imageGridChildren?.item(
					positionIndexInGrid + columnCount
				) as HTMLElement;
				focusAndSelectElement(elementDown);
				break;
			case "Tab":
				// to break out of the grid by tabbing and focusing we need to let
				// the browser handle the tabbing if we are at the edge of the grid boundary (first and last elements)
				if (e.shiftKey) {
					if (positionIndexInGrid > 0) {
						e.preventDefault();
					}
					focusAndSelectElement(
						imageGridChildren?.item(positionIndexInGrid - 1) as HTMLElement
					);
				} else {
					if (positionIndexInGrid < imageGridChildren?.length! - 1) {
						e.preventDefault();
					}
					focusAndSelectElement(
						imageGridChildren?.item(positionIndexInGrid + 1) as HTMLElement
					);
				}
				break;
		}
	}

	function buildAssetGridArray(element: HTMLElement) {
		const array = buildGridArray(element).map((i) => {
			return i.map((j) => {
				// first try the element itself, then fallback to firstElementChild (older components)
				const assetId = (j.element?.getAttribute("data-asset-id") ??
					j.element?.firstElementChild?.getAttribute("data-asset-id"))!;
				const asset = allAssetsData.find((i: T) => i.uid === assetId)!;

				if ((!assetId || !asset) && j.element && allAssetsData.length > 0) {
					if (dev) {
						console.warn(
							`AssetGrid: failed to resolve asset for element at row ${j.row}, column ${j.column}`
						);
					}
				}

				return {
					asset,
					row: j.row,
					column: j.column,
					columnSize: j.columnSize,
					size: j.size,
					rowSize: j.rowSize
				};
			});
		});

		return array;
	}

	function unselectImagesOnClickOutsideAssetContainer(element: HTMLElement) {
		if (disableOutsideUnselect || isLayoutPage()) {
			return;
		}

		const clickHandler = (e: MouseEvent) => {
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
				document.querySelectorAll(
					".viz-asset-grid-container, .viz-asset-table-container"
				)
			) as HTMLElement[];
			const insideAnyGrid = allGrids.some((g) => g.contains(target));
			if (insideAnyGrid) {
				return;
			}

			// Otherwise clear selection
			selection.clear();
		};

		$effect(() => {
			document.addEventListener("click", clickHandler);

			return () => {
				document.removeEventListener("click", clickHandler);
			};
		});
	}

	hotkeys("ctrl+a", (e) => {
		if (selectionManager.activeScopeId !== scopeId) {
			return;
		}
		e.preventDefault();
		selection.selectMultiple(allAssetsData);
	});

	hotkeys("escape", (e) => {
		if (selectionManager.activeScopeId !== scopeId) {
			return;
		}
		if (selection.selected.size === 0 && !selection.active) {
			return;
		}

		selection.clear();
	});
</script>

{#snippet assetComponentCard(assetData: T)}
	{@const isSelected =
		selectedUIDs.has(assetData.uid) || selection.active?.uid === assetData.uid}
	<div
		class="asset-card"
		data-asset-id={assetData.uid}
		class:max-width-column={columnCount !== undefined && columnCount > 1}
		class:selected-card={isSelected}
		role="button"
		tabindex="0"
		onfocus={(e) => {
			if (!e.currentTarget.classList.contains("selected-card")) {
				e.currentTarget.classList.add("selected-card");
			}
		}}
		onblur={(e) => {
			if (e.currentTarget.classList.contains("selected-card") && !isSelected) {
				e.currentTarget.classList.remove("selected-card");
			}
		}}
		onclick={(e) => {
			e.preventDefault();
			handleImageCardSelect(assetData, e);
		}}
		onkeydown={(e) => {
			e.preventDefault();
			handleKeydownCardSelect(assetData, e);
		}}
		ondblclick={(e) => {
			if (e.ctrlKey) {
				e.preventDefault();
				return;
			}

			assetDblClick?.(e, assetData);
		}}
		oncontextmenu={(e: MouseEvent & { currentTarget: HTMLElement }) => {
			e.preventDefault();
			if (!selection.has(assetData) || selection.selected.size <= 1) {
				selection.select(assetData);
			}
			onassetcontext?.({
				asset: assetData,
				anchor: { x: e.clientX, y: e.clientY }
			});
		}}
	>
		{@render assetSnippet(assetData)}
	</div>
{/snippet}

{#snippet assetComponentListOption(assetData: T)}
	{@const isSelected =
		Array.from(selection.selected).some((i) => i.uid === assetData.uid) ||
		selection.active?.uid === assetData.uid}
	{@const asset = assetData as unknown as DisplayableAsset}
	<tr
		class="asset-card"
		data-asset-id={assetData.uid}
		class:selected-card={isSelected}
		role="button"
		tabindex="0"
		onfocus={(e) => {
			if (!e.currentTarget.classList.contains("selected-card")) {
				e.currentTarget.classList.add("selected-card");
			}
		}}
		onblur={(e) => {
			if (e.currentTarget.classList.contains("selected-card") && !isSelected) {
				e.currentTarget.classList.remove("selected-card");
			}
		}}
		onclick={(e) => {
			handleImageCardSelect(assetData, e);
		}}
		onkeydown={(e) => {
			handleKeydownCardSelect(assetData, e);
		}}
		ondblclick={(e) => {
			if (e.ctrlKey) {
				e.preventDefault();
				return;
			}

			assetDblClick?.(e, assetData);
		}}
	>
		<td class="asset-snippet-cell">
			<div class="asset-snippet-inner" title={formatValueForKey(asset, "name")}>
				{#if getNestedValue(asset, table?.thumbnail_key) || asset.image_paths}
					<!-- I hate this -->
					<img
						class="asset-table-thumb"
						src={getFullImagePath(
							getNestedValue(asset, table?.thumbnail_key) ??
								asset.image_paths?.thumbnail ??
								asset.image_paths?.preview ??
								""
						)}
						alt={asset.name ?? asset.image_metadata?.file_name ?? ""}
						loading="lazy"
						crossorigin="use-credentials"
					/>
				{:else}
					<!-- shitty fallback it works -->
					<!-- TODO: need this to be better -->
					<span class="asset-preview-fallback">
						{asset.name ?? asset.image_metadata?.file_name ?? asset.uid}
					</span>
				{/if}
				<div class="asset-snippet-meta">
					<div class="asset-snippet-name">
						{asset.image_metadata?.file_name ?? asset.name}
					</div>
					<div class="asset-snippet-sub">
						{formatValueForKey(asset, "created_at") ||
							formatValueForKey(asset, "image_metadata.file_created_at")}
					</div>
				</div>
			</div>
		</td>
		{#each visibleKeys as key}
			<td>{formatValueForKey(asset, key)}</td>
		{/each}
	</tr>
{/snippet}

{#snippet assetTable()}
	<div
		bind:this={assetGridDisplayEl}
		class="viz-asset-table-container {assetGridDisplayProps.class}"
		class:is-active={selectionManager.activeScopeId === scopeId}
		{...assetGridDisplayProps}
		use:unselectImagesOnClickOutsideAssetContainer
		onclick={onFocus}
		onfocusin={onFocus}
	>
		<table>
			<thead
				oncontextmenu={(e) => {
					e.preventDefault();
					showColumnSelector = true;
					modal.show = true;
				}}
			>
				<tr>
					<th>Preview</th>
					{#each visibleKeys as key}
						<th>
							<button
								onclick={() => {
									if (sort.by === key) {
										sort.order = sort.order === "asc" ? "desc" : "asc";
									} else {
										sort.by = key as AssetSortBy;
									}
								}}
							>
								<MaterialIcon
									iconName={`arrow_${sort.by === key && sort.order === "asc" ? "upward" : "downward"}`}
								/>
								{snakeToTitle(key)}
							</button>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each allAssetsData as asset}
					{@render assetComponentListOption(asset)}
				{/each}
			</tbody>
		</table>
	</div>
{/snippet}

{#if allAssetsData.length === 0}
	{#if searchValue}
		<div class="no-results">
			<p>No results found for "{searchValue}"</p>
		</div>
	{:else}
		<div>
			<p>{noAssetsMessage}</p>
		</div>
	{/if}
{:else if view === "list" || sort.display === "list"}
	{@render assetTable()}
{:else if view === "thumbnails"}
	<div
		bind:this={assetGridDisplayEl}
		class="viz-asset-grid-container {assetGridDisplayProps.class}"
		class:is-active={selectionManager.activeScopeId === scopeId}
		{...assetGridDisplayProps}
		use:unselectImagesOnClickOutsideAssetContainer
		onclick={onFocus}
		onfocusin={onFocus}
	>
		{#each allAssetsData as asset}
			{@render assetComponentCard(asset)}
		{/each}
	</div>
{/if}

{#if showColumnSelector && modal.show}
	<TableColumnSelectorModal availableKeys={tableKeys} />
{/if}

<style lang="scss">
	.viz-asset-grid-container {
		box-sizing: border-box;
		margin: 2em 0em;
		display: grid;
		gap: 1em;
		width: 100%;
		max-width: 100%;
		text-overflow: clip;
		justify-content: center;
		grid-template-columns: repeat(auto-fill, minmax(15em, 1fr));
	}

	/* Zebra striping for grid cards (matches table zebra) */
	.viz-asset-grid-container > .asset-card {
		background-color: var(--imag-bg-color);
		transition: background-color 120ms ease-in-out;
	}

	.viz-asset-grid-container > .asset-card:nth-child(even) {
		background-color: color-mix(in srgb, var(--imag-bg-color) 78%, white 22%);
	}

	.viz-asset-grid-container > .asset-card:hover {
		background-color: color-mix(in srgb, var(--imag-bg-color) 70%, white 30%);
	}

	.viz-asset-grid-container > .asset-card.selected-card {
		background-color: color-mix(in srgb, var(--imag-bg-color) 60%, white 40%);
	}

	.viz-asset-grid-container > .asset-card.selected-card {
		outline: 2px solid var(--imag-60);
		outline-offset: 0px;
		border-radius: 0.5em;
	}

	.viz-asset-grid-container.is-active > .asset-card.selected-card {
		outline-color: var(--imag-primary);
	}

	.asset-card {
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		border-radius: 0.5em;
		overflow: hidden;
	}

	.viz-asset-table-container {
		width: 100%;
		margin: 2em 0em;
		background: transparent;
		box-sizing: border-box;
		overflow-x: hidden;

		table {
			width: 100%;
			table-layout: fixed;
			border-collapse: collapse;
			font-size: 0.95rem;
			color: var(--imag-text-color);
			display: table;
		}

		thead,
		tbody {
			display: table-row-group;
		}

		tr {
			display: table-row;
		}

		th,
		td {
			display: table-cell;
		}

		thead th {
			position: sticky;
			/* Offset sticky headers by the toolbar height so headers sit below any sticky toolbar */
			top: 0px;
			z-index: 2;
			color: var(--imag-text-color);
			background-color: var(--imag-bg-color);
			text-align: left;
			font-weight: 600;
			padding: 0.6rem 0.75rem;
			vertical-align: middle;
			border-bottom: 1px solid var(--imag-90);

			button {
				display: inline-flex;
				align-items: center;
				gap: 0.5rem;
				background: transparent;
				border: none;
				color: inherit;
				cursor: pointer;
				font: inherit;
				padding: 0;
			}
		}

		tbody tr {
			transition: background 120ms ease-in-out;
			background-color: var(--imag-bg-color);

			&:nth-child(even) {
				background-color: color-mix(
					in srgb,
					var(--imag-bg-color) 80%,
					white 15%
				);
			}

			&:hover {
				background: color-mix(in srgb, var(--imag-bg-color) 70%, white 10%);
			}

			&.selected-card {
				background: color-mix(in srgb, var(--imag-bg-color) 60%, white 12%);
			}

			/* Table row selection accent: show a left indicator inside the preview cell */
			&.selected-card td:first-child {
				position: relative;
			}

			&.selected-card td:first-child::before {
				content: "";
				position: absolute;
				left: 4px;
				top: 8px;
				bottom: 8px;
				width: 2px;
				background: var(--imag-primary);
			}

			td {
				padding: 0.6rem 0.75rem;
				vertical-align: middle;
				border-bottom: 1px solid var(--imag-100);
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}
		}
	}

	// Preview column: thumbnail + meta stacked
	.asset-snippet-cell {
		width: 220px;
		max-width: 260px;
		min-width: 160px;
		padding: 0.5rem;
		vertical-align: middle;
		display: flex;
		align-items: center;
		gap: 0.75rem;

		.asset-snippet-inner {
			display: flex;
			align-items: center;
			gap: 0.75rem;
		}

		.asset-table-thumb,
		img {
			width: 6em;
			height: 4em;
			object-fit: contain;
			border-radius: 0.4em;
			flex-shrink: 0;
			background: var(--imag-80);
		}

		.asset-snippet-meta {
			display: flex;
			flex-direction: column;
			gap: 0.25rem;
			overflow: hidden;
		}

		.asset-snippet-name {
			font-weight: 600;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			max-width: 16rem;
		}

		.asset-snippet-sub {
			font-size: 0.85rem;
			color: var(--imag-60);
		}
	}

	// Values columns should wrap gracefully on small widths
	.viz-asset-table-container tbody td:not(.asset-snippet-cell) {
		max-width: 18ch;
	}

	// Responsive adjustments
	@media (max-width: 800px) {
		.asset-snippet-cell {
			width: 160px;
			min-width: 120px;
		}
	}
</style>
