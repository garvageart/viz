<script lang="ts" generics="T extends { uid: string } & Record<string, any>">
    import hotkeys from "hotkeys-js";
    import { type Snippet, untrack } from "svelte";
    import type { MouseEventHandler, SvelteHTMLElements } from "svelte/elements";
    import { type Instance, type Props as TippyProps, delegate, followCursor, hideAll } from "tippy.js";
    import "tippy.js/dist/tippy.css";
    import { PhotoGridVirtualizer } from "$lib/components/virtualizer/PhotoGridVirtualizer.svelte.js";
    import { debugMode, isLayoutPage, isMobile } from "$lib/states/index.svelte";
    import { selectionManager } from "$lib/states/selection.svelte";
    import { type SortState, photosSort } from "$lib/states/sort.svelte";
    import type { AssetGridArray, AssetSortBy, AssetViewType } from "$lib/types/asset";
    import type { CardVisualState } from "$lib/types/snippet";
    import { getScrollParent } from "$lib/utils/dom";
    import { isAssetImage } from "$lib/utils/images";
    import PhotoTooltip from "../tooltips/PhotoTooltip.svelte";
    import { mountTooltipComponent } from "../tooltips/tooltip";
    import Table, { type TableColumn } from "../ui/Table.svelte";

    export interface AssetViewProps<T extends { uid: string } & Record<string, any>> {
        data: T[];
        assetSnippet: Snippet<[T, CardVisualState]>;
        customSnippet?: Snippet;
        assetGridArray?: AssetGridArray<T>;
        type?: AssetViewType;
        assetGridDisplayProps?: SvelteHTMLElements["div"];
        columnCount?: number;
        searchValue?: string;
        noAssetsMessage?: string;
        disableMultiSelection?: boolean;
        assetClick?: () => void;
        assetDblClick?: (e: Parameters<MouseEventHandler<HTMLDivElement | HTMLTableRowElement>>[0], asset: T) => void;
        /** Disable clearing selection when clicking in other grids (useful when multiple grids share one selection set) */
        disableOutsideUnselect?: boolean;
        onassetcontext?: (detail: { asset: T; anchor: { x: number; y: number } | HTMLElement }) => void;
        /** Optional explicit column definitions or property keys for table view */
        columns?: TableColumn<T>[];
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
        onassetcontext,
        type = $bindable("grid"),
        assetGridDisplayProps = $bindable({}),
        columns = $bindable(),
        scopeId = "default",
        disabledUids = new Set(),
        sortState = photosSort
    }: AssetViewProps<T> = $props();

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
    let isListView = $derived(type === "list" || sortState.value.display === "list");

    // TODO: pass this in as configuration perhaps?
    let gridItemWidth = $derived(type === "custom" ? 352 : 270);
    let gridGap = $state(8);
    let gridRowHeight = $derived(type === "custom" ? 264 : 260);

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
                aspectRatio: type === "custom" ? 3 / 4 : undefined,
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
            void allAssetsData?.length;
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
            target: ".asset-card",
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

    interface ExtendedTippyInstance extends Instance<TippyProps> {
        _destroyComponent?: () => void;
    }

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

    function handleImageCardSelect(asset: T, e: MouseEvent | KeyboardEvent) {
        if (disabledUids.has(asset.uid)) {
            return;
        }

        onFocus(); // Ensure this grid is active on click

        if (e.shiftKey && (e as KeyboardEvent).key !== "Tab") {
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
        if (target.closest(".viz-toolbar-container, .selection-toolbar, [data-keep-selection]")) {
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
        <Table
            name="asset-grid"
            data={allAssetsData}
            {columns}
            selectable={true}
            selectedKeys={Array.from(selectedUIDs)}
            columnsEditable={true}
            resizable={true}
            onrowdblclick={(e, asset) => {
                if (assetDblClick) {
                    assetDblClick(e, asset);
                }
            }}
            onselectionchange={(keys, rows) => {
                if (keys.length === 0) {
                    selection.clear();
                } else if (keys.length >= allAssetsData.length) {
                    selection.selectAll();
                } else {
                    selection.selectMultiple(rows);
                }
            }}
            sort={{
                key: sortState.value.by,
                order: sortState.value.order === "ASC" ? "asc" : "desc"
            }}
            onsort={(s) => {
                if (s.key) {
                    sortState.value.by = s.key as AssetSortBy;
                    sortState.value.order = s.order === "asc" ? "ASC" : "DESC";
                }
            }}
        />
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
{:else if type === "custom"}
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
    }

    .viz-asset-table-container {
        box-sizing: border-box;
        width: 100%;
        max-width: 100%;
        padding: 0 var(--viz-spacing-xl);
        margin: var(--viz-spacing-md) 0;
        position: relative;
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
</style>
