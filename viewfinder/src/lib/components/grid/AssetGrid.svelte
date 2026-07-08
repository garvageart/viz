<script lang="ts" generics="T extends { uid: string } & Record<string, any>">
    import { dev } from "$app/environment";
    import { getFullImagePath } from "$lib/api";
    import { debugMode, isLayoutPage, sort, tableColumnSettings } from "$lib/states/index.svelte";
    import { selectionManager } from "$lib/states/selection.svelte";
    import type { AssetGridArray, AssetSortBy } from "$lib/types/asset";
    import type { CardVisualState, SvelteSnippet } from "$lib/types/snippet";
    import { tryParseDate } from "$lib/utils/dates";
    import { buildGridArray } from "$lib/utils/dom";
    import { snakeToTitle } from "$lib/utils/strings";
    import hotkeys from "hotkeys-js";
    import { DateTime } from "luxon";
    import { untrack } from "svelte";
    import type { SvelteHTMLElements } from "svelte/elements";
    import type { AssetGridView } from "../grid/PhotoAssetGrid.svelte";
    import TableColumnSelectorModal from "../modals/TableColumnSelectorModal.svelte";
    import { modalsManager } from "../modals/manager/ModalManager.svelte";
    import MaterialIcon from "../ui/MaterialIcon.svelte";

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

    export interface AssetGridProps<T extends { uid: string } & Record<string, any>> {
        data: T[];
        assetSnippet: SvelteSnippet<[T, CardVisualState]>;
        assetGridArray?: AssetGridArray<T>;
        view?: Omit<AssetGridView, "grid">;
        assetGridDisplayProps?: SvelteHTMLElements["div"];
        columnCount?: number;
        searchValue?: string;
        noAssetsMessage?: string;
        disableMultiSelection?: boolean;
        assetClick?: () => void;
        assetDblClick?: (
            e: MouseEvent & {
                currentTarget: EventTarget & (HTMLDivElement | HTMLTableRowElement);
            },
            asset: T
        ) => void;
        /** Disable clearing selection when clicking in other grids (useful when multiple grids share one selection set) */
        disableOutsideUnselect?: boolean;
        onassetcontext?: (detail: { asset: T; anchor: { x: number; y: number } | HTMLElement }) => void;
        /** optional explicit column list for table view (order matters). If omitted, inferred from data. */
        columns?: string[];
        /** table config: thumbnail_key is dot-path to thumbnail in each asset, columns overrides visible keys */
        table?: { thumbnail_key?: string; columns?: string[] };
        /** Unique identifier for selection state management */
        scopeId?: string;
        disabledUids?: Set<string>;
    }

    let {
        data = $bindable(),
        assetSnippet,
        assetGridArray = $bindable(),
        columnCount = $bindable(),
        searchValue = $bindable(""),
        noAssetsMessage = "No assets found",
        assetDblClick,
        assetClick,
        disableOutsideUnselect = $bindable(false),
        disableMultiSelection = $bindable(false),
        onassetcontext = $bindable(),
        view = $bindable("thumbnails"),
        assetGridDisplayProps = $bindable({}),
        columns = $bindable(),
        table = $bindable(),
        scopeId = "default",
        disabledUids = new Set()
    }: AssetGridProps<T> = $props();

    // Selection Management
    let selection = $derived(selectionManager.getScope<T>(scopeId));
    let selectedUIDs = $derived(selection.selectedUids);

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
            // Filter and sort by the order of tableColumnSettings.value
            return tableColumnSettings.value.filter((key) => tableKeys.includes(key));
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
    function formatValueForKey(obj: Record<string, any> | undefined, key?: string) {
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
            return dt.setZone("local").toLocaleString(DateTime.DATETIME_FULL);
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

        const element = assetGridDisplayEl.querySelector(`[data-asset-id="${asset.uid}"]`) as HTMLElement;
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

    let lastActiveUID: string | null = null;

    $effect(() => {
        const currentActive = selection.active;
        if (currentActive && assetGridDisplayEl) {
            const activeUid = currentActive.uid;
            untrack(() => {
                if (activeUid !== lastActiveUID) {
                    lastActiveUID = activeUid;
                    scrollToAsset(currentActive);
                }
            });
        } else if (!currentActive) {
            lastActiveUID = null;
        }
    });

    $effect(() => {
        if (!assetGridDisplayEl || allAssetsData.length === 0) {
            return;
        }

        const updateGridArray = () => {
            if (!assetGridDisplayEl) {
                return;
            }

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
        if (disabledUids.has(asset.uid)) {
            return;
        }

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

        assetClick?.();
    }

    function handleKeydownCardSelect(asset: T, e: KeyboardEvent) {
        if (disabledUids.has(asset.uid)) {
            return;
        }
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
        const positionIndexInGrid = imageInGridArray.row * columnCount + imageInGridArray.column;
        const imageGridChildren = assetGridDisplayEl?.children;

        // Mimic click since we already have a handler for that in `handleImageCardSelect()`
        const focusAndSelectElement = (element: HTMLElement | undefined, step: number) => {
            // out of bounds
            if (!element) {
                return;
            }

            // check if disabled and find the next non-disabled element in the direction of step
            const assetId = element.getAttribute("data-asset-id");
            if (assetId && disabledUids.has(assetId)) {
                let targetElement: HTMLElement | undefined = undefined;
                let nextIndex = positionIndexInGrid + step;

                while (nextIndex >= 0 && nextIndex < (imageGridChildren?.length ?? 0)) {
                    const candElement = imageGridChildren?.item(nextIndex) as HTMLElement;
                    const candAssetId = candElement?.getAttribute("data-asset-id");
                    if (candAssetId && !disabledUids.has(candAssetId)) {
                        targetElement = candElement;
                        break;
                    }

                    nextIndex += step;
                }

                if (!targetElement) {
                    // out of bounds
                    return;
                }
                element = targetElement;
            }

            // maybe unnessary to blur but i wanna make sure lmao
            (imageGridChildren?.item(positionIndexInGrid) as HTMLElement).blur();
            element.focus();

            const targetAssetId = element.getAttribute("data-asset-id");
            const targetAsset = allAssetsData.find((a) => a.uid === targetAssetId);
            if (targetAsset) {
                handleImageCardSelect(targetAsset, e as unknown as MouseEvent);
            } else {
                element.click();
            }
        };

        switch (e.key) {
            case "ArrowRight":
                const elementRight = imageGridChildren?.item(positionIndexInGrid + 1) as HTMLElement;
                focusAndSelectElement(elementRight, 1);
                break;
            case "ArrowLeft":
                const elementLeft = imageGridChildren?.item(positionIndexInGrid - 1) as HTMLElement;
                focusAndSelectElement(elementLeft, -1);
                break;
            case "ArrowUp":
                const elementUp = imageGridChildren?.item(positionIndexInGrid - columnCount) as HTMLElement;
                focusAndSelectElement(elementUp, -columnCount);
                break;
            case "ArrowDown":
                const elementDown = imageGridChildren?.item(positionIndexInGrid + columnCount) as HTMLElement;
                focusAndSelectElement(elementDown, columnCount);
                break;
            case "Tab":
                // to break out of the grid by tabbing and focusing we need to let
                // the browser handle the tabbing if we are at the edge of the grid boundary (first and last elements)
                if (e.shiftKey) {
                    if (positionIndexInGrid > 0) {
                        e.preventDefault();
                    }
                    focusAndSelectElement(imageGridChildren?.item(positionIndexInGrid - 1) as HTMLElement, -1);
                } else {
                    if (positionIndexInGrid < imageGridChildren?.length! - 1) {
                        e.preventDefault();
                    }
                    focusAndSelectElement(imageGridChildren?.item(positionIndexInGrid + 1) as HTMLElement, 1);
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

    function shouldKeepSelection(target: HTMLElement | null): boolean {
        if (!target) {
            return false;
        }

        // 1. Keep if clicking an image card/photo
        if (target.closest(".asset-photo, .asset-card")) {
            return true;
        }

        // 2. Keep if clicking interactive elements (buttons, links, form controls)
        if (
            target.closest(
                "button, a, input, select, textarea, [role='button'], [role='menuitem'], [role='tab'], [role='checkbox']"
            )
        ) {
            return true;
        }

        // 3. Keep if clicking custom interactive components (rating, label dropdowns, menus, modals, scrubber)
        if (
            target.closest(
                ".star-rating, .label-selector, .context-menu, .dropdown-content, .dropdown-menu, .timeline-scrubber, [role='dialog'], .viz-modal"
            )
        ) {
            return true;
        }

        return false;
    }

    function handleContainerClick(e: MouseEvent) {
        onFocus();
        const target = e.target as HTMLElement;
        if (shouldKeepSelection(target)) {
            return;
        }
        selection.clear();
    }

    function unselectImagesOnClickOutsideAssetContainer(element: HTMLElement) {
        if (disableOutsideUnselect) {
            return;
        }

        const clickHandler = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            // Check if we should preserve the selection
            if (shouldKeepSelection(target)) {
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
        if (selection.size === 0 && !selection.active) {
            return;
        }

        selection.clear();
    });

    function openColumnSelector() {
        modalsManager.open(
            TableColumnSelectorModal,
            {
                availableKeys: tableKeys
            },
            { heading: "Table Columns" }
        );
    }
</script>

{#snippet assetComponentCard(assetData: T)}
    {@const isSelected = selectedUIDs.has(assetData.uid) || selection.active?.uid === assetData.uid}
    {@const isDisabled = disabledUids.has(assetData.uid)}
    <div
        class="asset-card"
        class:disabled-asset={isDisabled}
        data-asset-id={assetData.uid}
        class:max-width-column={columnCount !== undefined && columnCount > 1}
        class:selected-card={isSelected}
        role="button"
        tabindex={isDisabled ? -1 : 0}
        onclick={(e) => {
            if (isDisabled) {
                return;
            }
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
            if (!selection.has(assetData) || selection.size <= 1) {
                selection.select(assetData);
            }
            onassetcontext?.({
                asset: assetData,
                anchor: { x: e.clientX, y: e.clientY }
            });
        }}
    >
        {#if isDisabled}
            <div class="disabled-overlay"></div>
        {/if}
        {@render assetSnippet(assetData, { isSelected })}
    </div>
{/snippet}

{#snippet assetComponentListOption(assetData: T)}
    {@const isSelected = selection.has(assetData) || selection.active?.uid === assetData.uid}
    {@const isDisabled = disabledUids.has(assetData.uid)}
    {@const asset = assetData as unknown as DisplayableAsset}
    <tr
        class="asset-card"
        class:disabled-asset={isDisabled}
        data-asset-id={assetData.uid}
        class:selected-card={isSelected}
        role="button"
        tabindex={isDisabled ? -1 : 0}
        onclick={(e) => {
            if (isDisabled) {
                return;
            }
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
        oncontextmenu={(e: MouseEvent & { currentTarget: HTMLElement }) => {
            e.preventDefault();
            if (isDisabled) {
                return;
            }
            if (!selection.has(assetData) || selection.size <= 1) {
                selection.select(assetData);
            }
            onassetcontext?.({
                asset: assetData,
                anchor: { x: e.clientX, y: e.clientY }
            });
        }}
    >
        <td class="asset-snippet-cell">
            <div class="asset-snippet-inner" title={formatValueForKey(asset, "name")}>
                {#if getNestedValue(asset, table?.thumbnail_key) || asset.image_paths}
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
                    <div class="asset-table-thumb-fallback">
                        <MaterialIcon iconName="image" />
                    </div>
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
        <td class="actions-cell"></td>
    </tr>
{/snippet}

{#snippet assetTable()}
    <div
        bind:this={assetGridDisplayEl}
        class="viz-asset-table-container {assetGridDisplayProps.class}"
        class:is-active={selectionManager.activeScopeId === scopeId}
        {...assetGridDisplayProps}
        use:unselectImagesOnClickOutsideAssetContainer
        onclick={handleContainerClick}
        onfocusin={onFocus}
    >
        <table>
            <thead
                oncontextmenu={(e) => {
                    e.preventDefault();
                    openColumnSelector();
                }}
            >
                <tr>
                    <th class="preview-header">
                        Preview
                    </th>
                    {#each visibleKeys as key}
                        <th>
                            <button
                                onclick={() => {
                                    if (sort.by === key) {
                                        sort.order = sort.order === "ASC" ? "DESC" : "ASC";
                                    } else {
                                        sort.by = key as AssetSortBy;
                                    }
                                }}
                            >
                                <span>{snakeToTitle(key)}</span>
                                <span class="sort-icon" class:active={sort.by === key}>
                                    <MaterialIcon
                                        iconName={sort.by === key && sort.order === "ASC" ? "arrow_upward" : "arrow_downward"}
                                    />
                                </span>
                            </button>
                        </th>
                    {/each}
                    <th class="settings-header">
                        <button
                            class="column-selector-btn"
                            onclick={openColumnSelector}
                            title="Select columns"
                        >
                            <MaterialIcon iconName="settings" />
                        </button>
                    </th>
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
        onclick={handleContainerClick}
        onfocusin={onFocus}
    >
        {#each allAssetsData as asset}
            {@render assetComponentCard(asset)}
        {/each}
    </div>
{/if}

<style lang="scss">
    .viz-asset-grid-container {
        box-sizing: border-box;
        padding: 0 1rem;
        display: grid;
        gap: 1em;
        width: 100%;
        max-width: 100%;
        text-overflow: clip;
        justify-content: center;
        grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
    }

    .asset-card {
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        outline: none;
        transition: background-color 120ms ease-in-out;

        &:focus,
        &:focus-visible {
            outline: none;
        }
    }

    .asset-card.disabled-asset {
        cursor: not-allowed;
        pointer-events: none;
        opacity: 0.65;
        position: relative;

        .disabled-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.45);
            z-index: 5;
            pointer-events: none;
        }
    }

    .viz-asset-table-container {
        width: 100%;
        margin: var(--viz-spacing-md) 0;
        background: transparent;
        box-sizing: border-box;
        overflow-x: auto;

        table {
            width: 100%;
            table-layout: auto;
            border-collapse: separate;
            border-spacing: 0;
            font-size: var(--viz-font-size-lg);
            color: var(--viz-text-color);
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
            top: 0px;
            z-index: 2;
            color: var(--viz-text-color);
            background-color: var(--viz-90);
            text-align: left;
            font-weight: 600;
            padding: var(--viz-spacing-sm) var(--viz-spacing-md);
            vertical-align: middle;
            border-bottom: 2px solid var(--viz-60);

            &.settings-header {
                width: 3.5rem;
                min-width: 3.5rem;
                text-align: right;
                padding-right: var(--viz-spacing-md);

                .column-selector-btn {
                    background: transparent;
                    border: none;
                    color: var(--viz-40);
                    cursor: pointer;
                    padding: var(--viz-spacing-xxs);
                    border-radius: var(--viz-border-radius-pill);
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    transition: background-color 0.2s, color 0.2s;

                    &:hover {
                        background-color: var(--viz-80);
                        color: var(--viz-text-color);
                    }

                    :global(.material-symbols-outlined) {
                        font-size: 1.125rem;
                    }
                }
            }

            button {
                display: inline-flex;
                align-items: center;
                gap: var(--viz-spacing-xs);
                background: transparent;
                border: none;
                color: inherit;
                cursor: pointer;
                font: inherit;
                padding: var(--viz-spacing-xs) var(--viz-spacing-sm);
                border-radius: var(--viz-border-radius-pill);
                transition: background-color 0.2s, color 0.2s;

                &:hover {
                    background-color: var(--viz-80);
                    color: var(--viz-text-color);
                }

                .sort-icon {
                    display: inline-flex;
                    align-items: center;
                    font-size: var(--viz-font-size-std);
                    opacity: 0;
                    transition: opacity 0.2s;

                    &.active {
                        opacity: 1;
                        color: var(--viz-primary);
                    }
                }

                &:hover .sort-icon {
                    opacity: 0.5;
                    &.active {
                        opacity: 1;
                    }
                }
            }
        }

        tbody tr {
            transition: background-color 120ms ease-in-out;
            background-color: var(--viz-100);

            &:nth-child(even) {
                background-color: var(--viz-95);
            }

            &:hover {
                background-color: var(--viz-80);
            }

            &.selected-card {
                background-color: color-mix(in srgb, var(--viz-100) 85%, var(--viz-primary) 15%);
                
                td {
                    border-bottom-color: color-mix(in srgb, var(--viz-60) 50%, var(--viz-primary) 50%);
                }
            }

            /* Table row selection accent: show a left indicator inside the preview cell */
            &.selected-card td:first-child,
            &:focus-visible td:first-child {
                position: relative;
            }

            &.selected-card td:first-child::before,
            &:focus-visible td:first-child::before {
                content: "";
                position: absolute;
                left: 4px;
                top: var(--viz-spacing-sm);
                bottom: var(--viz-spacing-sm);
                width: 3px;
                border-radius: var(--viz-border-radius-pill);
                background: var(--viz-primary);
            }

            td {
                padding: var(--viz-spacing-sm) var(--viz-spacing-md);
                vertical-align: middle;
                border-bottom: 1px solid var(--viz-60);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            td.actions-cell {
                width: 3.5rem;
                min-width: 3.5rem;
                padding: 0;
            }
        }
    }

    // Preview column: thumbnail + meta stacked
    .asset-snippet-cell {
        min-width: 220px;
        padding: var(--viz-spacing-xs) var(--viz-spacing-sm);
        vertical-align: middle;
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-md);

        .asset-snippet-inner {
            display: flex;
            align-items: center;
            gap: var(--viz-spacing-md);
            overflow: hidden;
            width: 100%;
        }

        .asset-table-thumb,
        img {
            width: 5.5em;
            height: 3.6em;
            object-fit: cover;
            border-radius: var(--viz-border-radius-md);
            flex-shrink: 0;
            background: var(--viz-90);
            border: var(--viz-border-thin);
        }

        .asset-table-thumb-fallback {
            width: 5.5em;
            height: 3.6em;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: var(--viz-90);
            border-radius: var(--viz-border-radius-md);
            color: var(--viz-40);
            border: var(--viz-border-thin);
            flex-shrink: 0;

            :global(.material-symbols-outlined) {
                font-size: 1.25rem;
            }
        }

        .asset-snippet-meta {
            display: flex;
            flex-direction: column;
            gap: var(--viz-spacing-xxs);
            overflow: hidden;
        }

        .asset-snippet-name {
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 14rem;
        }

        .asset-snippet-sub {
            font-size: var(--viz-font-size-std);
            color: var(--viz-40);
        }
    }

    // Values columns should wrap gracefully on small widths
    .viz-asset-table-container tbody td:not(.asset-snippet-cell) {
        max-width: 18ch;
    }
</style>
