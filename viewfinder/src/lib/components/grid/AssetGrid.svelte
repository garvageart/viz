<script lang="ts" generics="T extends { uid: string } & Record<string, any>">
    import { dev } from "$app/environment";
    import hotkeys from "hotkeys-js";
    import { DateTime } from "luxon";
    import { type Snippet, untrack } from "svelte";
    import type { SvelteHTMLElements } from "svelte/elements";
    import { type Instance, type Props as TippyProps, delegate, followCursor } from "tippy.js";
    import "tippy.js/dist/tippy.css";
    import { type ImageAsset, getFullImagePath } from "$lib/api";
    import { PhotoGridVirtualizer } from "$lib/components/virtualizer/PhotoGridVirtualizer.svelte.js";
    import { debugMode, isLayoutPage, isMobile, sort, tableColumnSettings } from "$lib/states/index.svelte";
    import { selectionManager } from "$lib/states/selection.svelte";
    import type { AssetGridArray, AssetGridView, AssetSortBy } from "$lib/types/asset";
    import type { CardVisualState, SvelteSnippet } from "$lib/types/snippet";
    import { tryParseDate } from "$lib/utils/dates";
    import { getScrollParent } from "$lib/utils/dom";
    import { snakeToTitle } from "$lib/utils/strings";
    import TableColumnSelectorModal from "../modals/TableColumnSelectorModal.svelte";
    import { modalsManager } from "../modals/manager/ModalManager.svelte";
    import PhotoTooltip from "../tooltips/PhotoTooltip.svelte";
    import { mountTooltipComponent } from "../tooltips/tooltip";
    import MaterialIcon from "../ui/MaterialIcon.svelte";

    export interface AssetGridProps<T extends { uid: string } & Record<string, any>> {
        data: T[];
        assetSnippet: SvelteSnippet<[T, CardVisualState]>;
        customSnippet?: Snippet;
        assetGridArray?: AssetGridArray<T>;
        view?: AssetGridView;
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
        customSnippet,
        assetGridArray = $bindable(),
        columnCount = $bindable(),
        searchValue = $bindable(""),
        noAssetsMessage = "No assets found",
        assetDblClick,
        assetClick,
        disableOutsideUnselect = $bindable(false),
        disableMultiSelection = $bindable(false),
        onassetcontext = $bindable(),
        view = $bindable("grid"),
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

    // HTML Elements & Virtualizer
    let assetGridDisplayEl: HTMLDivElement | undefined = $state();
    let containerWidth = $state(0);
    let viewportHeight = $state(800);

    const virtualizer = new PhotoGridVirtualizer({ bufferPx: 600 });

    let allAssetsData = $derived(data);

    // Compute grid layout parameters
    let isListView = $derived(view === "list" || sort.display === "list");

    // TODO: pass this in as configuration perhaps?
    let gridItemWidth = $derived(view === "custom" ? 352 : 270);
    let gridGap = $state(8);
    let gridRowHeight = $derived(view === "custom" ? 264 : 260);

    // Column count: use explicit prop if set, otherwise compute
    let computedColumnCount = $derived.by(() => {
        if (isListView) {
            return 1;
        }

        if (containerWidth <= 0) {
            return columnCount && columnCount > 0 ? columnCount : 4;
        }

        return Math.max(1, Math.floor((containerWidth + gridGap) / (gridItemWidth + gridGap)));
    });

    // Expose columnCount back to parent
    $effect(() => {
        columnCount = computedColumnCount;
    });

    // Build assetGridArray from virtualizer rows (for backward compat with AssetsShell)
    let internalGridArray = $derived.by(() => {
        if (isListView) {
            return undefined;
        }
        const array: { asset: T; row: number; column: number; columnSize: number; size: number; rowSize: number }[][] =
            [];
        let rowIndex = 0;
        for (const row of virtualizer.rows) {
            if (row.type !== "images") {
                continue;
            }
            const gridRow = row.items.map((item, col) => ({
                asset: item.asset as T,
                row: rowIndex,
                column: col,
                columnSize: item.width,
                size: item.width * row.height,
                rowSize: row.height
            }));
            array.push(gridRow);
            rowIndex++;
        }
        return array;
    });

    $effect(() => {
        assetGridArray = internalGridArray;
    });

    // Scroll position tracking
    let scrollTop = $state(0);
    let gridOffsetTop = $state(0);
    let usingExternalScroll = $state(false);
    let scrollParent: HTMLElement | Window | undefined = $state();
    let isSyncingScroll = false;

    function computeContentWidth(el: HTMLElement): number {
        const style = window.getComputedStyle(el);
        const pl = parseFloat(style.paddingLeft) || 0;
        const pr = parseFloat(style.paddingRight) || 0;
        return el.clientWidth - pl - pr;
    }

    function updateVirtualizerLayout() {
        if (!assetGridDisplayEl) {
            return;
        }

        const width = computeContentWidth(assetGridDisplayEl);
        if (width <= 0) {
            return;
        }

        containerWidth = width;

        if (isListView) {
            virtualizer.updateList(allAssetsData, width, 54);
        } else {
            virtualizer.updateGrid(allAssetsData, width, {
                columns: columnCount && columnCount > 0 ? columnCount : undefined,
                itemWidth: gridItemWidth,
                rowHeight: gridRowHeight,
                aspectRatio: view === "custom" ? 3 / 4 : undefined,
                gap: gridGap
            });
        }

        // Compute viewport height
        let vH = viewportHeight;
        if (scrollParent instanceof HTMLElement) {
            vH = scrollParent.clientHeight;
        } else {
            vH = window.innerHeight;
        }

        virtualizer.updateScroll(scrollTop, vH);
    }

    // Scroll + Resize handling
    $effect(() => {
        if (!assetGridDisplayEl) {
            return;
        }

        const parent = getScrollParent(assetGridDisplayEl);

        function recomputeOffset() {
            if (!assetGridDisplayEl || !(parent instanceof HTMLElement)) {
                return;
            }
            const parentRect = parent.getBoundingClientRect();
            const gridRect = assetGridDisplayEl.getBoundingClientRect();
            gridOffsetTop = gridRect.top - parentRect.top + parent.scrollTop;
        }

        function updateScrollPosition() {
            if (!assetGridDisplayEl) {
                return;
            }

            containerWidth = computeContentWidth(assetGridDisplayEl);

            if (parent instanceof HTMLElement) {
                viewportHeight = parent.clientHeight;
                scrollTop = Math.max(0, parent.scrollTop - gridOffsetTop);
            } else {
                const rect = assetGridDisplayEl.getBoundingClientRect();
                viewportHeight = window.innerHeight;
                scrollTop = Math.max(0, -rect.top);
            }

            virtualizer.updateScroll(scrollTop, viewportHeight);
        }

        recomputeOffset();
        updateScrollPosition();

        if (parent !== assetGridDisplayEl && parent !== window) {
            usingExternalScroll = true;
            scrollParent = parent;

            parent.addEventListener("scroll", updateScrollPosition, { passive: true });
            window.addEventListener("resize", updateScrollPosition, { passive: true });

            const ro = new ResizeObserver(() => {
                recomputeOffset();
                updateScrollPosition();
                updateVirtualizerLayout();
            });
            ro.observe(assetGridDisplayEl);
            if (parent instanceof HTMLElement) {
                ro.observe(parent);
            }

            requestAnimationFrame(() => {
                updateVirtualizerLayout();
            });

            return () => {
                parent.removeEventListener("scroll", updateScrollPosition);
                window.removeEventListener("resize", updateScrollPosition);
                ro.disconnect();
            };
        }

        // Self-scrolling case
        updateVirtualizerLayout();

        const ro = new ResizeObserver(() => {
            recomputeOffset();
            updateScrollPosition();
            updateVirtualizerLayout();
        });
        ro.observe(assetGridDisplayEl);

        return () => {
            ro.disconnect();
        };
    });

    // Re-run layout when data changes
    $effect(() => {
        const _data = data;
        const _view = view;
        const _sortDisplay = sort.display;

        if (assetGridDisplayEl) {
            untrack(() => {
                updateVirtualizerLayout();
            });
        }
    });

    function handleGridScroll(_e: Event) {
        if (usingExternalScroll || !assetGridDisplayEl) {
            return;
        }
        scrollTop = assetGridDisplayEl.scrollTop;
        virtualizer.updateScroll(scrollTop, viewportHeight);
    }

    // Tippy tooltip delegation
    $effect(() => {
        if (!assetGridDisplayEl || view !== "custom" || isMobile) {
            return;
        }

        const delegatedTippy = delegate(assetGridDisplayEl, {
            target: ".basic-grid-card",
            theme: "viz no-padding",
            followCursor: "initial",
            plugins: [followCursor],
            arrow: false,
            delay: [600, 0],
            interactive: true,
            onShow(instance: Instance<TippyProps>) {
                const cardEl = instance.reference as HTMLElement;
                const assetId = cardEl.getAttribute("data-asset-id");
                const asset = allAssetsData.find((a) => a.uid === assetId);
                if (!asset || !("image_paths" in asset) || !("image_metadata" in asset)) {
                    return false;
                }

                const imageAsset = asset as unknown as ImageAsset;

                const { node, destroy } = mountTooltipComponent(PhotoTooltip, {
                    asset: imageAsset,
                    clickHandler: (e: MouseEvent & { currentTarget: EventTarget & HTMLElement }) => {
                        instance.hide();
                        if (assetDblClick) {
                            assetDblClick(
                                e as unknown as MouseEvent & {
                                    currentTarget: EventTarget & (HTMLDivElement | HTMLTableRowElement);
                                },
                                asset
                            );
                        }
                    }
                });
                (instance as ExtendedTippyInstance)._destroyComponent = destroy;
                instance.setContent(node);
            },
            onHidden(instance: Instance<TippyProps>) {
                const extInst = instance as ExtendedTippyInstance;
                const destroy = extInst._destroyComponent;
                if (destroy) {
                    destroy();
                    extInst._destroyComponent = undefined;
                }
                instance.setContent("");
            },
            popperOptions: {
                modifiers: [
                    {
                        name: "preventOverflow",
                        options: {
                            boundary: "window",
                            altBoundary: true,
                            padding: 12
                        }
                    }
                ]
            }
        });

        return () => {
            delegatedTippy.destroy();
        };
    });

    // Table column keys (safe: only primitive values)
    let tableKeys: string[] = $state([] as string[]);

    $effect(() => {
        if (allAssetsData.length === 0) {
            tableKeys = [];
            return;
        }

        const sample = allAssetsData[0];
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

    interface ExtendedTippyInstance extends Instance<TippyProps> {
        _destroyComponent?: () => void;
    }

    function getAssetThumbSrc(asset: Record<string, any>): string {
        return getFullImagePath(asset.image_paths?.thumbnail ?? asset.image_paths?.preview ?? "");
    }

    function getAssetAltText(asset: Record<string, any>): string {
        return asset.name ?? asset.image_metadata?.file_name ?? "";
    }

    // Format a value for display: dates are formatted with Luxon, objects stringified, null/undefined -> ''
    function formatValueForKey(obj: Record<string, any> | undefined, key?: string) {
        let v: any = undefined;
        if (key) {
            v = getNestedValue(obj, key);
            if (v === undefined && obj) {
                v = obj[key];
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
        if (!assetGridDisplayEl || !virtualizer.rows.length) {
            return;
        }

        // Find the row containing this asset
        for (const row of virtualizer.rows) {
            if (row.type !== "images") {
                continue;
            }
            if (row.items.some((item) => item.asset.uid === asset.uid)) {
                const scroller = usingExternalScroll ? scrollParent : assetGridDisplayEl;
                if (!scroller) {
                    return;
                }

                if (scroller instanceof HTMLElement) {
                    const rowTop = row.top;
                    const rowBottom = row.top + row.height;
                    const viewportTop = usingExternalScroll ? scroller.scrollTop - gridOffsetTop : scroller.scrollTop;
                    const viewportBottom = viewportTop + scroller.clientHeight;
                    const scrollPaddingTop = 100;

                    if (rowTop < viewportTop + scrollPaddingTop || rowBottom > viewportBottom) {
                        if (usingExternalScroll) {
                            scroller.scrollTop = Math.max(0, rowTop + gridOffsetTop - scrollPaddingTop);
                        } else {
                            scroller.scrollTop = Math.max(0, rowTop - scrollPaddingTop);
                        }
                    }
                }
                break;
            }
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

        const validKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Tab"];
        if (!validKeys.includes(e.key) && !e.shiftKey && !e.metaKey) {
            return;
        }

        // Find the asset in virtualizer rows
        let assetRowIdx = -1;
        let assetColIdx = -1;

        for (let r = 0; r < virtualizer.rows.length; r++) {
            const row = virtualizer.rows[r];
            if (row.type !== "images") {
                continue;
            }
            for (let c = 0; c < row.items.length; c++) {
                if (row.items[c].asset.uid === asset.uid) {
                    assetRowIdx = r;
                    assetColIdx = c;
                    break;
                }
            }
            if (assetRowIdx !== -1) {
                break;
            }
        }

        if (assetRowIdx === -1) {
            if (dev) {
                console.warn(`Can't find asset ${asset.uid} in virtualizer rows`);
            }
            return;
        }

        let targetRowIdx = assetRowIdx;
        let targetColIdx = assetColIdx;

        switch (e.key) {
            case "ArrowRight":
                targetColIdx++;
                break;
            case "ArrowLeft":
                targetColIdx--;
                break;
            case "ArrowUp":
                targetRowIdx--;
                break;
            case "ArrowDown":
                targetRowIdx++;
                break;
            case "Tab":
                if (e.shiftKey) {
                    targetColIdx--;
                    if (targetColIdx < 0) {
                        targetRowIdx--;
                        const prevRow = virtualizer.rows[targetRowIdx];
                        if (prevRow && prevRow.type === "images") {
                            targetColIdx = prevRow.items.length - 1;
                        } else if (e.shiftKey && targetRowIdx < 0) {
                            return; // Let browser handle tab out
                        }
                    }
                } else {
                    targetColIdx++;
                    const currentRow = virtualizer.rows[assetRowIdx];
                    if (currentRow && currentRow.type === "images" && targetColIdx >= currentRow.items.length) {
                        targetRowIdx++;
                        targetColIdx = 0;
                        const nextRow = virtualizer.rows[targetRowIdx];
                        if (!nextRow || nextRow.type !== "images") {
                            return; // Let browser handle tab out
                        }
                    }
                }
                break;
        }

        // Clamp to valid range
        targetRowIdx = Math.max(0, Math.min(virtualizer.rows.length - 1, targetRowIdx));
        const targetRow = virtualizer.rows[targetRowIdx];
        if (!targetRow || targetRow.type !== "images") {
            return;
        }
        targetColIdx = Math.max(0, Math.min(targetRow.items.length - 1, targetColIdx));

        const targetItem = targetRow.items[targetColIdx];
        if (!targetItem) {
            return;
        }

        // Find and focus the DOM element
        const el = assetGridDisplayEl?.querySelector(`[data-asset-id="${targetItem.asset.uid}"]`) as HTMLElement;
        if (el) {
            el.focus();
            handleImageCardSelect(targetItem.asset as T, e as unknown as MouseEvent);
        }
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
        class:max-width-column={computedColumnCount !== undefined && computedColumnCount > 1}
        class:selected-card={isSelected}
        role="button"
        tabindex={isDisabled ? -1 : 0}
        onclick={(e) => {
            if (isDisabled) {
                return;
            }
            if ((e.currentTarget as HTMLElement).dataset.longPressHandled === "true") {
                return;
            }
            e.preventDefault();
            handleImageCardSelect(assetData, e);
        }}
        onkeydown={(e) => {
            e.preventDefault();
            handleKeydownCardSelect(assetData, e);
        }}
        ontouchstart={(e: TouchEvent) => {
            if (isMobile && !isDisabled) {
                const target = e.currentTarget as HTMLElement;
                const timer = setTimeout(() => {
                    e.preventDefault();
                    e.stopPropagation();
                    selection.toggle(assetData);
                    target.dataset.longPressHandled = "true";
                    setTimeout(() => {
                        delete target.dataset.longPressHandled;
                    }, 150);
                }, 500);
                target.dataset.longPressTimer = String(timer);
            }
        }}
        ontouchend={(e: TouchEvent) => {
            const target = e.currentTarget as HTMLElement;
            const timer = target.dataset.longPressTimer;
            if (timer) {
                clearTimeout(Number(timer));
                delete target.dataset.longPressTimer;
            }
        }}
        ontouchcancel={(e: TouchEvent) => {
            const target = e.currentTarget as HTMLElement;
            const timer = target.dataset.longPressTimer;
            if (timer) {
                clearTimeout(Number(timer));
                delete target.dataset.longPressTimer;
            }
        }}
        ondblclick={(e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                return;
            }

            assetDblClick?.(e, assetData);
        }}
        oncontextmenu={(e: MouseEvent & { currentTarget: HTMLElement }) => {
            if (isMobile && e.currentTarget.dataset.longPressHandled === "true") {
                e.preventDefault();
                e.stopPropagation();
                delete e.currentTarget.dataset.longPressHandled;
                return;
            }
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
    {@const asset = assetData}
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
        onscroll={handleGridScroll}
    >
        <table>
            <thead
                oncontextmenu={(e) => {
                    e.preventDefault();
                    openColumnSelector();
                }}
            >
                <tr>
                    <th class="preview-header"> Preview </th>
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
                                        iconName={sort.by === key && sort.order === "ASC"
                                            ? "arrow_upward"
                                            : "arrow_downward"}
                                    />
                                </span>
                            </button>
                        </th>
                    {/each}
                    <th class="settings-header">
                        <button class="column-selector-btn" onclick={openColumnSelector} title="Select columns">
                            <MaterialIcon iconName="settings" />
                        </button>
                    </th>
                </tr>
            </thead>
            <tbody>
                {#each virtualizer.visibleRows as row (row.id)}
                    {#if row.type === "images"}
                        {#if row.top > 0 && virtualizer.visibleRows.indexOf(row) === 0}
                            <tr class="virtual-spacer" style="height: {row.top}px;">
                                <td colspan={visibleKeys.length + 2}></td>
                            </tr>
                        {/if}
                        {@render assetComponentListOption(row.items[0].asset as T)}
                    {/if}
                {/each}
                {#if virtualizer.visibleRows.length > 0}
                    {@const lastRow = virtualizer.visibleRows[virtualizer.visibleRows.length - 1]}
                    {@const bottomPad = virtualizer.totalHeight - lastRow.top - lastRow.height}
                    {#if bottomPad > 0}
                        <tr class="virtual-spacer" style="height: {bottomPad}px;">
                            <td colspan={visibleKeys.length + 2}></td>
                        </tr>
                    {/if}
                {/if}
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
{:else if isListView}
    {@render assetTable()}
{:else if view === "custom"}
    {#if customSnippet}
        {@render customSnippet()}
    {/if}
{:else}
    <div
        bind:this={assetGridDisplayEl}
        class="viz-asset-grid-container {assetGridDisplayProps.class}"
        class:is-active={selectionManager.activeScopeId === scopeId}
        {...assetGridDisplayProps}
        use:unselectImagesOnClickOutsideAssetContainer
        onclick={handleContainerClick}
        onscroll={handleGridScroll}
    >
        <div class="grid-virtual-content" style="height: {virtualizer.totalHeight}px;">
            {#each virtualizer.visibleRows as row (row.id)}
                {#if row.type === "images"}
                    <div
                        class="grid-row"
                        style="position: absolute; top: {row.top}px; left: 0; right: 0; height: {row.height}px;"
                    >
                        {#each row.items as item (item.asset.uid)}
                            <div
                                class="grid-item"
                                style="position: absolute; left: {item.left}px; width: {item.width}px; height: {row.height}px;"
                            >
                                {@render assetComponentCard(item.asset as T)}
                            </div>
                        {/each}
                    </div>
                {/if}
            {/each}
        </div>
    </div>
{/if}

<style lang="scss">
    .viz-asset-grid-container {
        box-sizing: border-box;
        margin: var(--viz-spacing-xxl) auto;
        width: 100%;
        max-width: 100%;
        text-overflow: clip;
        overflow-y: auto;
        position: relative;

        &.is-basic-view {
            gap: var(--viz-spacing-sm);
        }
    }

    .grid-virtual-content {
        position: relative;
        width: 100%;
    }

    .grid-row {
        display: flex;
        justify-content: space-between;
        align-items: stretch;
        gap: var(--viz-spacing-sm);
        left: 0;
        right: 0;
    }

    .grid-item {
        height: 100%;
        position: static;
    }

    .max-width-column {
        max-width: 100%;
    }

    .basic-grid-card {
        overflow: hidden;
        background-color: var(--viz-surface-panel);
        border: 1px solid transparent;
        cursor: pointer;
        transition: border-color 0.15s ease;
        width: 100%;
        height: 100%;

        &:hover {
            border-color: var(--viz-primary);
        }

        &.selected-card {
            border-color: var(--viz-primary);
            box-shadow: 0 0 0 2px var(--viz-primary);
        }

        .basic-thumb-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }
    }

    .asset-card {
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        outline: none;
        transition: background-color 120ms ease-in-out;
        width: 100%;
        height: 100%;

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
            color: var(--viz-text-primary);
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
            color: var(--viz-text-primary);
            background-color: var(--viz-surface-panel);
            text-align: left;
            font-weight: 600;
            padding: var(--viz-spacing-sm) var(--viz-spacing-md);
            vertical-align: middle;
            border-bottom: 2px solid var(--viz-border-subtle);

            &.settings-header {
                width: 3.5rem;
                min-width: 3.5rem;
                text-align: right;
                padding-right: var(--viz-spacing-md);

                .column-selector-btn {
                    background: transparent;
                    border: none;
                    color: var(--viz-text-secondary);
                    cursor: pointer;
                    padding: var(--viz-spacing-xxs);
                    border-radius: var(--viz-border-radius-pill);
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    transition:
                        background-color 0.2s,
                        color 0.2s;

                    &:hover {
                        background-color: var(--viz-surface-hover);
                        color: var(--viz-text-primary);
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
                transition:
                    background-color 0.2s,
                    color 0.2s;

                &:hover {
                    background-color: var(--viz-surface-hover);
                    color: var(--viz-text-primary);
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
            background-color: var(--viz-surface-panel);

            &:nth-child(even) {
                background-color: var(--viz-surface-card);
            }

            &:hover {
                background-color: var(--viz-surface-hover);
            }

            &.selected-card {
                background-color: color-mix(in srgb, var(--viz-surface-panel) 85%, var(--viz-primary) 15%);

                td {
                    border-bottom-color: color-mix(in srgb, var(--viz-border-subtle) 50%, var(--viz-primary) 50%);
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
                border-bottom: 1px solid var(--viz-border-subtle);
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

    /* Preview column: thumbnail + meta stacked */
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
            background: var(--viz-surface-panel);
            border: var(--viz-border-thin);
        }

        .asset-table-thumb-fallback {
            width: 5.5em;
            height: 3.6em;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: var(--viz-surface-panel);
            border-radius: var(--viz-border-radius-md);
            color: var(--viz-text-secondary);
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
            color: var(--viz-text-secondary);
        }
    }

    /* Values columns should wrap gracefully on small widths */
    .viz-asset-table-container tbody td:not(.asset-snippet-cell) {
        max-width: 18ch;
    }
</style>
