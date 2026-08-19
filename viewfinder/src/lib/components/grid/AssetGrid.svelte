<script lang="ts" generics="T extends { uid: string } & Record<string, any>">
    import { type ImageAsset } from "@viz/api";
    import hotkeys from "hotkeys-js";
    import { DateTime } from "luxon";
    import { type Snippet, untrack } from "svelte";
    import type { SvelteHTMLElements } from "svelte/elements";
    import { type Instance, type Props as TippyProps, delegate, followCursor, hideAll } from "tippy.js";
    import "tippy.js/dist/tippy.css";
    import AssetImage from "$lib/components/ui/AssetImage.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import { PhotoGridVirtualizer } from "$lib/components/virtualizer/PhotoGridVirtualizer.svelte.js";
    import { debugMode, isLayoutPage, isMobile, tableColumnSettings } from "$lib/states/index.svelte";
    import { selectionManager } from "$lib/states/selection.svelte";
    import { type SortState, photosSort } from "$lib/states/sort.svelte";
    import type { AssetGridArray, AssetGridView, AssetSortBy } from "$lib/types/asset";
    import type { CardVisualState } from "$lib/types/snippet";
    import { tryParseDate } from "$lib/utils/dates";
    import { getScrollParent } from "$lib/utils/dom";
    import { isAssetImage } from "$lib/utils/images";
    import { snakeToTitle } from "$lib/utils/strings";
    import TableColumnSelectorModal from "../modals/TableColumnSelectorModal.svelte";
    import { modalsManager } from "../modals/manager/ModalManager.svelte";
    import PhotoTooltip from "../tooltips/PhotoTooltip.svelte";
    import { mountTooltipComponent } from "../tooltips/tooltip";
    import MaterialIcon from "../ui/MaterialIcon.svelte";
    import Table from "../ui/Table.svelte";

    export interface AssetGridProps<T extends { uid: string } & Record<string, any>> {
        data: T[];
        assetSnippet: Snippet<[T, CardVisualState]>;
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
        /** Sort state that drives display mode and table-header sorting */
        sortState?: SortState;
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
        disabledUids = new Set(),
        sortState = photosSort
    }: AssetGridProps<T> = $props();

    // Selection Management
    let selection = $derived(selectionManager.getScope<T>(scopeId));
    let selectedUIDs = $derived(selection.selectedUids);

    function onFocus() {
        selectionManager.setActive(scopeId);
    }

    // Sync data source and register active selection scope
    $effect(() => {
        if (data) {
            selection.setSource(data);
        }
        selectionManager.setActive(scopeId);
    });

    // HTML Elements & Virtualizer
    let assetGridDisplayEl: HTMLDivElement | undefined = $state();
    let containerWidth = $state(0);
    let viewportHeight = $state(800);

    const virtualizer = new PhotoGridVirtualizer({ bufferPx: 600 });

    let allAssetsData = $derived(data);

    // Compute grid layout parameters
    let isListView = $derived(view === "list" || sortState.value.display === "list");

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

    // List view: the virtualizer assumes a fixed row height. We measure the real
    // rendered row height so spacers match the actual content height, otherwise
    // the content jumps when a virtual spacer appears/disappears.
    const LIST_ROW_HEIGHT_FALLBACK = 54;
    let listRowHeight = $state(LIST_ROW_HEIGHT_FALLBACK);

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
            virtualizer.updateList(allAssetsData, width, listRowHeight);
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

        function onResize() {
            recomputeOffset();
            untrack(() => {
                updateScrollPosition();
                updateVirtualizerLayout();
            });
        }

        recomputeOffset();
        untrack(() => {
            updateScrollPosition();
        });

        const ro = new ResizeObserver(onResize);
        ro.observe(assetGridDisplayEl);

        if (parent !== assetGridDisplayEl && parent !== window) {
            usingExternalScroll = true;
            scrollParent = parent;

            parent.addEventListener("scroll", updateScrollPosition, { passive: true });
            window.addEventListener("resize", updateScrollPosition, { passive: true });
            if (parent instanceof HTMLElement) {
                ro.observe(parent);
            }

            requestAnimationFrame(() => {
                untrack(() => {
                    updateVirtualizerLayout();
                });
            });

            return () => {
                parent.removeEventListener("scroll", updateScrollPosition);
                window.removeEventListener("resize", updateScrollPosition);
                ro.disconnect();
            };
        }

        // Self-scrolling case
        untrack(() => {
            updateVirtualizerLayout();
        });

        return () => {
            ro.disconnect();
        };
    });

    // Re-run layout when data changes
    $effect(() => {
        if (assetGridDisplayEl) {
            void allAssetsData;
            untrack(() => {
                updateVirtualizerLayout();
            });
        }
    });

    // Measure the real list row height so the virtualizer's assumed height matches
    // the rendered rows. Without this, spacer heights are off and the table content
    // shifts when a virtual spacer is added/removed while scrolling.
    $effect(() => {
        if (!assetGridDisplayEl || !isListView) {
            return;
        }

        const rowEl = assetGridDisplayEl.querySelector("tbody tr.asset-card");
        if (!rowEl) {
            return;
        }

        const height = rowEl.getBoundingClientRect().height;
        if (Math.abs(height - listRowHeight) > 1) {
            listRowHeight = height;
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
        if (!assetGridDisplayEl || isListView || isMobile) {
            return;
        }

        const delegatedTippy = delegate(assetGridDisplayEl, {
            target: ".asset-card, .basic-grid-card",
            theme: "viz no-padding",
            followCursor: "initial",
            plugins: [followCursor],
            arrow: false,
            delay: [600, 0],
            interactive: true,
            onShow(instance: Instance<TippyProps>) {
                hideAll({ duration: 0, exclude: instance });

                const cardEl = instance.reference as HTMLElement;
                const assetId = cardEl.getAttribute("data-asset-id");
                const asset = allAssetsData.find((a) => a.uid === assetId);
                if (!isAssetImage(asset)) {
                    return false;
                }

                const imageAsset = asset;

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

    // Virtual scroll offset spacers rendered OUTSIDE the table so they never
    // influence column-width layout (a colspan cell inside the table caused the
    // columns to shift a few px when a spacer appeared/disappeared while scrolling).
    let tableTopSpacerHeight = $derived.by(() => {
        const firstImage = virtualizer.visibleRows.find((r) => r.type === "images");
        if (!firstImage || firstImage.top <= 0) {
            return 0;
        }
        return firstImage.top;
    });

    let tableBottomSpacerHeight = $derived.by(() => {
        const images = virtualizer.visibleRows.filter((r) => r.type === "images");
        if (images.length === 0) {
            return 0;
        }
        const last = images[images.length - 1];
        return Math.max(0, virtualizer.totalHeight - last.top - last.height);
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

    // The table uses table-layout: fixed so columns don't shift as virtualized rows
    // change, but we still want content-appropriate widths. Derive each column's
    // width from the widest displayed value so e.g. a short "created_at" column
    // doesn't stretch to fill half the table.
    const PREVIEW_COLUMN_WIDTH = "calc(2 * var(--viz-spacing-sm) + 5.5em + var(--viz-spacing-md) + 14rem)";

    let tableColumnWidths = $derived.by(() => {
        const widths: Record<string, string> = {};
        for (const key of visibleKeys) {
            let maxChars = key.length;
            for (let i = 0; i < allAssetsData.length; i++) {
                const text = formatValueForKey(allAssetsData[i], key);
                if (text.length > maxChars) {
                    maxChars = text.length;
                }
            }
            // ~0.6em average glyph width at the table font-size, plus horizontal
            // cell padding; cap so a single huge value doesn't blow the column up.
            const chars = Math.min(maxChars + 1, 40);
            widths[key] = `calc(${chars} * 0.6em + 2 * var(--viz-spacing-md))`;
        }
        return widths;
    });

    // Inspecting/Debugging
    if (debugMode) {
        $inspect("selected asset", selection.active);
    }

    let selectionAnchor = $state<T | null>(null);

    function getNavigableImages(): T[] {
        const list: T[] = [];
        for (const row of virtualizer.rows) {
            if (row.type !== "images") {
                continue;
            }

            for (const item of row.items) {
                const asset = item.asset as T;
                if (disabledUids.has(asset.uid)) {
                    continue;
                }
                list.push(asset);
            }
        }

        if (list.length > 0) {
            return list;
        }

        return (allAssetsData || []).filter((img) => !disabledUids.has(img.uid));
    }

    function getAssetPosition(assetId: string | undefined) {
        if (!assetId) {
            return null;
        }

        const rows = virtualizer.rows;
        for (let r = 0; r < rows.length; r++) {
            const row = rows[r];
            if (row.type !== "images") {
                continue;
            }

            for (let i = 0; i < row.items.length; i++) {
                const item = row.items[i];
                if (item.asset.uid === assetId) {
                    return {
                        rowIndex: r,
                        centerX: item.left + item.width / 2
                    };
                }
            }
        }

        return null;
    }

    function scrollToAsset(asset: T, forceToTop = false) {
        if (!assetGridDisplayEl || !asset?.uid || !virtualizer.rows.length) {
            return;
        }

        const scroller = usingExternalScroll ? scrollParent : assetGridDisplayEl;
        if (!scroller || !(scroller instanceof HTMLElement)) {
            return;
        }

        const rowData = virtualizer.getRowForAsset(asset.uid);
        if (!rowData) {
            return;
        }

        const { rowTop, rowHeight } = rowData;
        const rowBottom = rowTop + rowHeight;
        const visualBuffer = 20;

        const viewportTop = usingExternalScroll ? scroller.scrollTop - gridOffsetTop : scroller.scrollTop;
        const viewportBottom = viewportTop + scroller.clientHeight;

        const isAboveViewport = rowTop < viewportTop;
        const isBelowViewport = rowBottom > viewportBottom - visualBuffer;
        const shouldScroll = forceToTop || isAboveViewport || isBelowViewport;

        if (!shouldScroll) {
            return;
        }

        let targetScrollTop = viewportTop;
        if (forceToTop || isAboveViewport) {
            targetScrollTop = rowTop;
        } else if (isBelowViewport) {
            targetScrollTop = rowBottom - scroller.clientHeight + visualBuffer;
        }

        const targetOffset = usingExternalScroll ? targetScrollTop + gridOffsetTop : targetScrollTop;
        scroller.scrollTop = Math.max(0, targetOffset);
    }

    let lastActiveUID: string | null = null;

    $effect(() => {
        const currentActive = selection.active;
        if (!currentActive) {
            lastActiveUID = null;
            return;
        }

        if (!assetGridDisplayEl) {
            return;
        }

        const activeUid = currentActive.uid;
        if (activeUid === lastActiveUID) {
            return;
        }

        lastActiveUID = activeUid;
        untrack(() => {
            scrollToAsset(currentActive, false);
        });
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
            selection.selectRange(asset, selectionAnchor, (img) => !disabledUids.has(img.uid));
        } else if (e.ctrlKey) {
            selection.toggle(asset);
            if (selection.has(asset)) {
                selectionAnchor = asset;
            } else if (selectionAnchor?.uid === asset.uid) {
                selectionAnchor = selection.active || null;
            }
        } else {
            selection.select(asset);
            selectionAnchor = asset;
        }

        assetClick?.();
    }

    function focusAssetElement(uid: string) {
        const el = assetGridDisplayEl?.querySelector(`[data-asset-id="${uid}"]`) as HTMLElement | null;
        if (el) {
            el.focus();
        }
    }

    function handleKeydownCardSelect(asset: T, e: KeyboardEvent) {
        if (disabledUids.has(asset.uid)) {
            return;
        }

        const key = e.key;
        if (key === "Enter") {
            e.preventDefault();
            assetDblClick?.(
                e as unknown as MouseEvent & { currentTarget: EventTarget & (HTMLDivElement | HTMLTableRowElement) },
                asset
            );
            return;
        }

        const isEsc = key === "Escape" || key === "Esc";
        if (isEsc) {
            e.preventDefault();
            selection.clear();
            return;
        }

        const isLeft = key === "ArrowLeft" || key === "Left" || (key === "Tab" && e.shiftKey);
        const isRight = key === "ArrowRight" || key === "Right" || (key === "Tab" && !e.shiftKey);
        const isUp = key === "ArrowUp" || key === "Up";
        const isDown = key === "ArrowDown" || key === "Down";
        const isNavKey = isLeft || isRight || isUp || isDown;

        if (!isNavKey) {
            return;
        }

        hideAll({ duration: 0 });

        e.preventDefault();

        const navList = getNavigableImages();
        if (!navList.length) {
            return;
        }

        onFocus();

        const activeId = asset.uid || selection.active?.uid;
        const currentIndex = activeId ? navList.findIndex((a) => a.uid === activeId) : -1;

        const isHorizontal = isLeft || isRight;
        if (isHorizontal) {
            const targetIndex = isLeft ? currentIndex - 1 : currentIndex + 1;
            const isValidIndex = targetIndex >= 0 && targetIndex < navList.length;
            if (!isValidIndex) {
                return;
            }

            const targetAsset = navList[targetIndex];

            handleImageCardSelect(targetAsset, e as unknown as MouseEvent);
            scrollToAsset(targetAsset, false);
            focusAssetElement(targetAsset.uid);
            return;
        }

        const pos = getAssetPosition(activeId);
        if (!pos) {
            const fallbackIndex = isUp ? Math.max(0, currentIndex - 1) : Math.min(navList.length - 1, currentIndex + 1);
            const targetAsset = navList[fallbackIndex];

            handleImageCardSelect(targetAsset, e as unknown as MouseEvent);
            scrollToAsset(targetAsset, false);
            focusAssetElement(targetAsset.uid);
            return;
        }

        const rows = virtualizer.rows;
        const step = isUp ? -1 : 1;
        let targetRowIndex = pos.rowIndex + step;

        while (targetRowIndex >= 0 && targetRowIndex < rows.length) {
            const row = rows[targetRowIndex];
            if (row.type !== "images") {
                targetRowIndex += step;
                continue;
            }

            const hasRealAsset = row.items.some((item) => !disabledUids.has(item.asset.uid));
            if (hasRealAsset) {
                break;
            }

            targetRowIndex += step;
        }

        if (targetRowIndex < 0) {
            const firstNav = navList[0];
            handleImageCardSelect(firstNav, e as unknown as MouseEvent);
            scrollToAsset(firstNav, false);
            focusAssetElement(firstNav.uid);
            return;
        }

        if (targetRowIndex >= rows.length) {
            const lastNav = navList[navList.length - 1];
            handleImageCardSelect(lastNav, e as unknown as MouseEvent);
            scrollToAsset(lastNav, false);
            focusAssetElement(lastNav.uid);
            return;
        }

        const targetRow = rows[targetRowIndex];
        if (targetRow.type !== "images") {
            return;
        }

        const realItems = targetRow.items.filter((item) => !disabledUids.has(item.asset.uid));
        if (realItems.length === 0) {
            return;
        }

        let closestItem = realItems[0];
        let minDiff = Number.MAX_VALUE;

        for (const item of realItems) {
            const itemCenterX = item.left + item.width / 2;
            const diff = Math.abs(itemCenterX - pos.centerX);
            if (diff < minDiff) {
                minDiff = diff;
                closestItem = item;
            }
        }

        const targetAsset = closestItem.asset as T;
        handleImageCardSelect(targetAsset, e as unknown as MouseEvent);
        scrollToAsset(targetAsset, false);
        focusAssetElement(targetAsset.uid);
    }

    function shouldKeepSelection(target: HTMLElement | null): boolean {
        if (!target) {
            return false;
        }

        // 1. Interactive inputs, textareas, dropdowns, and editable fields keep selection
        if (target.closest("input, textarea, select, [contenteditable]")) {
            return true;
        }

        // 2. Modals, dialogs, popover menus, and floating overlay containers keep selection
        if (target.closest("dialog, [role='dialog'], [role='menu'], [role='listbox'], .viz-modal")) {
            return true;
        }

        // 3. Selection toolbar & explicit selection-preserving controls keep selection
        if (target.closest(".selection-toolbar, [data-keep-selection]")) {
            return true;
        }

        // 4. Asset cards keep selection
        return Boolean(target.closest("[data-asset-id]"));
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

    hotkeys("escape", () => {
        if (selection.size === 0 && !selection.active) {
            return;
        }
        selection.clear();
    });

    hotkeys("enter", (e) => {
        if (selectionManager.activeScopeId !== scopeId) {
            return;
        }
        const activeAsset = selection.active ?? (selection.size > 0 ? selection.selectedItems[0] : null);
        if (!activeAsset) {
            return;
        }
        e.preventDefault();
        assetDblClick?.(
            e as unknown as MouseEvent & { currentTarget: EventTarget & (HTMLDivElement | HTMLTableRowElement) },
            activeAsset
        );
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
        onfocus={() => {
            onFocus();
        }}
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
            e.stopPropagation();
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
        onfocus={() => {
            onFocus();
        }}
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
            e.stopPropagation();
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
                    <div class="asset-table-thumb-wrapper">
                        <AssetImage
                            asset={asset as unknown as ImageAsset}
                            resolution="thumbnail"
                            class="asset-table-thumb"
                            alt={asset.name}
                        />
                    </div>
                {:else}
                    <div class="asset-table-thumb-fallback">
                        <MaterialIcon iconName="image" />
                    </div>
                {/if}
                <div class="asset-snippet-meta">
                    <div class="asset-snippet-name">
                        {asset.name}
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

{#snippet assetTableHeader()}
    <th class="preview-header" style={`width: ${PREVIEW_COLUMN_WIDTH};`}> Preview </th>
    {#each visibleKeys as key}
        <th style={`width: ${tableColumnWidths[key]};`}>
            <button
                class="header-sort-btn"
                onclick={() => {
                    if (sortState.value.by === key) {
                        sortState.value.order = sortState.value.order === "ASC" ? "DESC" : "ASC";
                    } else {
                        sortState.value.by = key as AssetSortBy;
                    }
                }}
            >
                <span>{snakeToTitle(key)}</span>
                <span class="sort-icon" class:active={sortState.value.by === key}>
                    <MaterialIcon
                        iconName={sortState.value.by === key && sortState.value.order === "ASC"
                            ? "arrow_upward"
                            : "arrow_downward"}
                    />
                </span>
            </button>
        </th>
    {/each}
    <th class="settings-header">
        <Button
            class="column-selector-btn"
            iconName="view_column"
            onclick={openColumnSelector}
            title="Select columns"
            variant="primary"
        />
    </th>
{/snippet}

{#snippet assetTableBody()}
    {#each virtualizer.visibleRows as row (row.id)}
        {#if row.type === "images"}
            {@render assetComponentListOption(row.items[0].asset as T)}
        {/if}
    {/each}
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
        {#if tableTopSpacerHeight > 0}
            <div class="virtual-spacer" style="height: {tableTopSpacerHeight}px;"></div>
        {/if}
        <Table
            data={allAssetsData}
            header={assetTableHeader}
            body={assetTableBody}
            onheadercontextmenu={(e) => {
                e.preventDefault();
                openColumnSelector();
            }}
        />
        {#if tableBottomSpacerHeight > 0}
            <div class="virtual-spacer" style="height: {tableBottomSpacerHeight}px;"></div>
        {/if}
    </div>
{/snippet}

{#if allAssetsData.length === 0}
    {#if searchValue}
        <div class="no-results">
            <span>No results found for "{searchValue}"</span>
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
        width: 100%;
        max-width: 100%;
        text-overflow: clip;
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
        background-color: var(--viz-surface-panel);
        border: 1px solid transparent;
        cursor: pointer;
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

        :global {
            .viz-table-container {
                width: 100%;
                border: none;
                border-radius: 0;
                background: transparent;
                overflow: visible;
            }

            .viz-table {
                width: 100%;
                table-layout: fixed;
                border-spacing: 0;
                color: var(--viz-text-primary);
                display: table;

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

                thead {
                    th {
                        position: sticky;
                        top: 0px;
                        z-index: 2;
                        color: var(--viz-text-primary);
                        background-color: color-mix(in srgb, var(--viz-surface-base) 72%, transparent);
                        backdrop-filter: blur(8px);
                        -webkit-backdrop-filter: blur(8px);
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
                        }

                        .header-sort-btn {
                            display: inline-flex;
                            align-items: center;
                            gap: var(--viz-spacing-xs);
                            background: transparent;
                            border-bottom: 2px solid transparent;
                            padding: var(--viz-spacing-std) initial;
                            color: inherit;
                            cursor: pointer;
                            font: inherit;

                            &:hover {
                                border-bottom-color: var(--viz-primary);

                                .sort-icon {
                                    opacity: 0.5;

                                    &.active {
                                        opacity: 1;
                                    }
                                }
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
                        }
                    }
                }

                tbody {
                    tr {
                        transition: background-color 120ms ease-in-out;
                        background-color: transparent;

                        &:hover {
                            background-color: var(--viz-surface-hover);
                        }

                        &.selected-card {
                            background-color: color-mix(in srgb, var(--viz-primary) 12%, transparent);

                            td {
                                border-bottom-color: color-mix(
                                    in srgb,
                                    var(--viz-border-subtle) 50%,
                                    var(--viz-primary) 50%
                                );
                            }
                        }

                        /* Table row selection accent: show a left indicator inside the preview cell */
                        &.selected-card td:first-child,
                        &:focus-visible td:first-child {
                            position: relative;

                            &::before {
                                content: "";
                                position: absolute;
                                left: 4px;
                                top: var(--viz-spacing-sm);
                                bottom: var(--viz-spacing-sm);
                                width: 3px;
                                border-radius: var(--viz-border-radius-pill);
                                background: var(--viz-primary);
                            }
                        }
                    }

                    td {
                        padding: var(--viz-spacing-sm) var(--viz-spacing-md);
                        vertical-align: middle;
                        border-bottom: 1px solid var(--viz-border-subtle);
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;

                        &.actions-cell {
                            width: 3.5rem;
                            min-width: 3.5rem;
                            padding: 0;
                        }
                    }
                }
            }
        }
    }

    /* Preview column: thumbnail + meta stacked */
    .asset-snippet-cell {
        /* idk about this hardcoded value but it makes sense based on the virtualisation */
        min-width: 220px;
        padding: var(--viz-spacing-xs) var(--viz-spacing-sm);
        vertical-align: middle;

        .asset-snippet-inner {
            display: flex;
            align-items: center;
            gap: var(--viz-spacing-md);
            overflow: hidden;
            width: 100%;
        }

        .asset-table-thumb-wrapper {
            width: 5.5em;
            height: 3.6em;
            max-height: 3.6em;
            flex-shrink: 0;
            border: var(--viz-border-thin);
            background: var(--viz-surface-panel);
            overflow: hidden;

            :global(.asset-image-container),
            :global(.asset-table-thumb),
            :global(img) {
                width: 100%;
                height: 100%;
                max-height: 3.6em;
                object-fit: cover;
            }
        }

        .asset-table-thumb {
            width: 5.5em;
            height: 3.6em;
            max-height: 3.6em;
            object-fit: cover;
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

    /* With table-layout: fixed, columns are sized from the header row, so value
       cells clip/ellipsize instead of driving column widths (prevents jitter
       as virtualized rows change). */
</style>
