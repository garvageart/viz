<script lang="ts" generics="T extends ScopeItem">
    import Table, { type TableColumn } from "#lib/components/ui/Table.svelte";
    import { PhotoGridVirtualizer } from "#lib/components/virtualizer/PhotoGridVirtualizer.svelte.js";
    import { KbdShortcutTier, KeybindAction, keyboardManager } from "#lib/keyboard/keyboard.svelte.js";
    import { debugMode, isLayoutPage, isMobile } from "#lib/states/index.svelte.js";
    import {
        type ScopeIdFor,
        type ScopeItem,
        SelectionScope,
        SelectionScopeNames,
        selectionManager
    } from "#lib/states/selection.svelte.js";
    import { type SortState, photosSort } from "#lib/states/sort.svelte.js";
    import type { EntityGridArray, EntitySortBy, EntityViewType } from "#lib/types/asset.js";
    import type { CardVisualState } from "#lib/types/snippet.js";
    import { getScrollParent } from "#lib/utils/dom.js";
    import { type Snippet, untrack } from "svelte";
    import type { MouseEventHandler, SvelteHTMLElements } from "svelte/elements";
    import { hideAll } from "tippy.js";
    import "tippy.js/dist/tippy.css";
    import { touchSelectionAction } from "./actions";

    export interface EntityViewProps<T extends ScopeItem> {
        data: T[];
        entitySnippet: Snippet<[T, CardVisualState]>;
        customSnippet?: Snippet;
        entityGridArray?: EntityGridArray<T>;
        type?: EntityViewType;
        entityGridDisplayProps?: SvelteHTMLElements["div"];
        columnCount?: number;
        searchValue?: string;
        noEntityMessage?: string;
        disableMultiSelection?: boolean;
        entityClick?: () => void;
        entityDblClick?: (e: Parameters<MouseEventHandler<HTMLDivElement | HTMLTableRowElement>>[0], entity: T) => void;
        /** Disable clearing selection when clicking in other grids (useful when multiple grids share one selection set) */
        disableOutsideUnselect?: boolean;
        /** Fetches the next page of data; triggered when the viewport nears the bottom of loaded content */
        onLoadMore?: () => Promise<void> | void;
        oncontext?: (detail: { entity: T; anchor: { x: number; y: number } | HTMLElement }) => void;
        /** Optional explicit column definitions or property keys for table view */
        columns?: TableColumn<T>[];
        /** Unique identifier for selection state management */
        scopeId?: ScopeIdFor<T>;
        disabledUids?: Set<string>;
        /** Sort state that drives display mode and table-header sorting */
        sortState?: SortState;
    }

    let {
        data = $bindable(),
        entitySnippet,
        customSnippet,
        entityGridArray = $bindable(),
        searchValue = "",
        noEntityMessage,
        disableMultiSelection = false,
        disableOutsideUnselect = false,
        onLoadMore,
        columnCount = $bindable(),
        entityClick,
        entityDblClick,
        oncontext,
        type = $bindable("grid"),
        entityGridDisplayProps = $bindable({}),
        columns = $bindable(),
        scopeId = SelectionScopeNames.DEFAULT as ScopeIdFor<T>,
        disabledUids = new Set(),
        sortState = photosSort
    }: EntityViewProps<T> = $props();

    // Selection Management
    let selection = $derived(selectionManager.getScope(scopeId) as SelectionScope<T>);

    function onFocus() {
        selectionManager.setActive(scopeId);
    }

    // Sync data source
    $effect(() => {
        if (data) {
            selection.setSource(data, (item) => item.uid);
        }
    });

    // HTML Elements & Virtualizer
    let entityGridDisplayEl: HTMLDivElement | undefined = $state();
    let containerWidth = $state(0);
    let viewportHeight = $state(800);

    const virtualizer = new PhotoGridVirtualizer<T>({ bufferPx: 600 });

    let allEntityData = $derived(data);

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

    // Build entityGridArray from virtualizer rows (for backward compat with AssetsShell)
    let internalGridArray = $derived.by(() => {
        if (isListView) {
            return undefined;
        }

        const array: EntityGridArray<T> = [];

        let rowIndex = 0;
        for (const row of virtualizer.rows) {
            if (row.type !== "images") {
                continue;
            }

            const gridRow = row.items.map((item, col) => ({
                entity: item.asset,
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
        entityGridArray = internalGridArray;
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

    // Load-more is owned by the visible "view": fire when the viewport nears
    // the bottom of the *loaded* content (loadedHeight), not the estimated
    // total height (totalHeight).
    let isLoadingMore = false;
    const loadMoreThreshold = 600;

    function loadMoreIfNearBottom(scrollPos: number, viewportHeight: number, contentOffsetTop = 0) {
        if (!onLoadMore || isLoadingMore) {
            return;
        }

        const loadedBottom = contentOffsetTop + virtualizer.loadedHeight;
        const viewportBottom = scrollPos + viewportHeight;
        if (loadedBottom - viewportBottom < loadMoreThreshold) {
            isLoadingMore = true;
            Promise.resolve(onLoadMore()).finally(() => {
                isLoadingMore = false;
            });
        }
    }

    function computeContentWidth(el: HTMLElement): number {
        const style = window.getComputedStyle(el);
        const pl = parseFloat(style.paddingLeft) || 0;
        const pr = parseFloat(style.paddingRight) || 0;
        return el.clientWidth - pl - pr;
    }

    function updateVirtualizerLayout() {
        if (!entityGridDisplayEl) {
            return;
        }

        const width = computeContentWidth(entityGridDisplayEl);
        if (width <= 0) {
            return;
        }

        containerWidth = width;

        if (isListView) {
            virtualizer.updateList(allEntityData, width, listRowHeight);
        } else {
            virtualizer.updateGrid(allEntityData, width, {
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
        if (!entityGridDisplayEl) {
            return;
        }

        const parent = getScrollParent(entityGridDisplayEl);

        function recomputeOffset() {
            if (!entityGridDisplayEl || !(parent instanceof HTMLElement)) {
                return;
            }
            const parentRect = parent.getBoundingClientRect();
            const gridRect = entityGridDisplayEl.getBoundingClientRect();
            gridOffsetTop = gridRect.top - parentRect.top + parent.scrollTop;
        }

        function updateScrollPosition() {
            if (!entityGridDisplayEl) {
                return;
            }

            containerWidth = computeContentWidth(entityGridDisplayEl);

            if (parent instanceof HTMLElement) {
                viewportHeight = parent.clientHeight;
                scrollTop = Math.max(0, parent.scrollTop - gridOffsetTop);

                loadMoreIfNearBottom(parent.scrollTop, parent.clientHeight, gridOffsetTop);
            } else {
                const rect = entityGridDisplayEl.getBoundingClientRect();
                viewportHeight = window.innerHeight;
                scrollTop = Math.max(0, -rect.top);

                loadMoreIfNearBottom(scrollTop, window.innerHeight, rect.top + scrollTop);
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
        ro.observe(entityGridDisplayEl);

        if (parent !== entityGridDisplayEl && parent !== window) {
            usingExternalScroll = true;
            scrollParent = parent;

            let scrollRafId: number | null = null;
            const throttledScrollPosition = () => {
                if (scrollRafId !== null) {
                    return;
                }

                scrollRafId = requestAnimationFrame(() => {
                    scrollRafId = null;
                    updateScrollPosition();
                });
            };

            parent.addEventListener("scroll", throttledScrollPosition, { passive: true });
            window.addEventListener("resize", throttledScrollPosition, { passive: true });
            if (parent instanceof HTMLElement) {
                ro.observe(parent);
            }

            untrack(() => {
                updateVirtualizerLayout();
            });
            if (entityGridDisplayEl && parent instanceof HTMLElement) {
                loadMoreIfNearBottom(parent.scrollTop, parent.clientHeight, gridOffsetTop);
            }

            return () => {
                if (scrollRafId !== null) {
                    cancelAnimationFrame(scrollRafId);
                    scrollRafId = null;
                }
                parent.removeEventListener("scroll", throttledScrollPosition);
                window.removeEventListener("resize", throttledScrollPosition);
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
        if (entityGridDisplayEl) {
            void allEntityData?.length;
            untrack(() => {
                updateVirtualizerLayout();
            });
        }
    });

    // Measure the real list row height so the virtualizer's assumed height matches
    // the rendered rows. Without this, spacer heights are off and the table content
    // shifts when a virtual spacer is added/removed while scrolling.
    $effect(() => {
        if (!entityGridDisplayEl || !isListView) {
            return;
        }

        const rowEl = entityGridDisplayEl.querySelector("tbody tr.entity-card");
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
        if (usingExternalScroll || !entityGridDisplayEl) {
            return;
        }
        scrollTop = entityGridDisplayEl.scrollTop;
        virtualizer.updateScroll(scrollTop, viewportHeight);

        loadMoreIfNearBottom(scrollTop, viewportHeight);
    }

    // Inspecting/Debugging
    if (debugMode) {
        $inspect("selected entity", selection.active);
    }

    function getNavigableImages(): T[] {
        const list: T[] = [];
        for (const row of virtualizer.rows) {
            if (row.type !== "images") {
                continue;
            }

            for (const item of row.items) {
                const asset = item.asset;
                if (disabledUids.has(asset.uid)) {
                    continue;
                }
                list.push(asset);
            }
        }

        if (list.length > 0) {
            return list;
        }

        return (allEntityData || []).filter((img) => !disabledUids.has(img.uid));
    }

    function getEntityPosition(entityId: string | undefined) {
        if (!entityId) {
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
                if (item.asset.uid !== entityId) {
                    continue;
                }

                return {
                    rowIndex: r,
                    centerX: item.left + item.width / 2
                };
            }
        }

        return null;
    }

    function scrollToEntity(asset: T, forceToTop = false) {
        if (!entityGridDisplayEl || !asset?.uid || !virtualizer.rows.length) {
            return;
        }

        const scroller = usingExternalScroll ? scrollParent : entityGridDisplayEl;
        if (!scroller || !(scroller instanceof HTMLElement)) {
            return;
        }

        const rowData = virtualizer.getRowForAsset((item) => item.uid === asset.uid);
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

    $effect(() => {
        untrack(() => {
            if (!selection.active) {
                return;
            }

            scrollToEntity(selection.active, false);
        });
    });

    function handleCardSelect(asset: T, e: MouseEvent | KeyboardEvent) {
        if (disabledUids.has(asset.uid)) {
            return;
        }

        onFocus(); // Ensure this grid is active on click

        const isShift = e.shiftKey && (e as KeyboardEvent).key !== "Tab";
        const isAlt = e.altKey;
        const isCtrl = e.ctrlKey || (e as MouseEvent).metaKey;

        if (isShift || isAlt) {
            if (disableMultiSelection) {
                selection.select(asset);
                return;
            }

            const additive = isAlt || isCtrl;
            selection.selectRange(
                asset,
                (img) => {
                    return !disabledUids.has(img.uid);
                },
                additive
            );
        } else if (isCtrl) {
            selection.toggle(asset);
        } else {
            selection.select(asset);
        }

        entityClick?.();
    }

    const handleMobileCardTap = (asset: T): MouseEventHandler<HTMLDivElement> => {
        return (e) => {
            if (disabledUids.has(asset.uid)) {
                return;
            }
            onFocus();

            if (selection.size > 0) {
                selection.toggle(asset);
                entityClick?.();
                return;
            }

            entityDblClick?.(e, asset);
        };
    };

    function handleMobileLongPress(asset: T) {
        if (disabledUids.has(asset.uid)) {
            return;
        }
        onFocus();
        selection.toggle(asset);
        entityClick?.();
    }

    function focusEntityElement(uid: string) {
        const el = entityGridDisplayEl?.querySelector(`[data-entity-id="${uid}"]`) as HTMLElement | null;
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
            entityDblClick?.(
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

            handleCardSelect(targetAsset, e as unknown as MouseEvent);
            scrollToEntity(targetAsset, false);
            focusEntityElement(targetAsset.uid);
            return;
        }

        const pos = getEntityPosition(activeId);
        if (!pos) {
            const fallbackIndex = isUp ? Math.max(0, currentIndex - 1) : Math.min(navList.length - 1, currentIndex + 1);
            const targetAsset = navList[fallbackIndex];

            handleCardSelect(targetAsset, e as unknown as MouseEvent);
            scrollToEntity(targetAsset, false);
            focusEntityElement(targetAsset.uid);
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
            handleCardSelect(firstNav, e as unknown as MouseEvent);
            scrollToEntity(firstNav, false);
            focusEntityElement(firstNav.uid);
            return;
        }

        if (targetRowIndex >= rows.length) {
            const lastNav = navList[navList.length - 1];
            handleCardSelect(lastNav, e as unknown as MouseEvent);
            scrollToEntity(lastNav, false);
            focusEntityElement(lastNav.uid);
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

        const targetAsset = closestItem.asset;
        handleCardSelect(targetAsset, e as unknown as MouseEvent);
        scrollToEntity(targetAsset, false);
        focusEntityElement(targetAsset.uid);
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
        return Boolean(target.closest("[data-entity-id]"));
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

    $effect(() => {
        const unregisterShortcuts = keyboardManager.register([
            {
                action: KeybindAction.SelectAll,
                handler: (e) => {
                    if (selectionManager.activeScopeId !== scopeId) {
                        return;
                    }
                    e.preventDefault();
                    selection.selectMultiple(allEntityData);
                }
            },
            {
                action: KeybindAction.OpenImage,
                handler: (e) => {
                    if (selectionManager.activeScopeId !== scopeId) {
                        return;
                    }
                    const activeAsset = selection.active ?? (selection.size > 0 ? selection.selectedItems[0] : null);
                    if (!activeAsset) {
                        return;
                    }
                    e.preventDefault();
                    entityDblClick?.(
                        e as unknown as MouseEvent & {
                            currentTarget: EventTarget & (HTMLDivElement | HTMLTableRowElement);
                        },
                        activeAsset
                    );
                }
            }
        ]);

        const unregisterEscape = keyboardManager.registerEscape({
            tier: KbdShortcutTier.Canvas,
            handler: () => {
                if (selection.size === 0 && !selection.active) {
                    return;
                }
                selection.clear();
            }
        });

        return () => {
            unregisterShortcuts();
            unregisterEscape();
        };
    });
</script>

{#snippet entityComponentCard(assetData: T)}
    {@const isSelected = selection.has(assetData) || selection.active === assetData}
    {@const isDisabled = disabledUids.has(assetData.uid)}
    <div
        class="entity-card"
        class:disabled-asset={isDisabled}
        data-entity-id={assetData.uid}
        class:max-width-column={computedColumnCount !== undefined && computedColumnCount > 1}
        class:selected-card={isSelected}
        role="button"
        tabindex={isDisabled ? -1 : 0}
        onfocus={() => {
            onFocus();
        }}
        use:touchSelectionAction={{
            disabled: isDisabled,
            onLongPress: () => {
                handleMobileLongPress(assetData);
            }
        }}
        onclick={(e) => {
            if (isDisabled) {
                return;
            }
            e.preventDefault();
            if (isMobile) {
                handleMobileCardTap(assetData)(e);
                return;
            }
            handleCardSelect(assetData, e);
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

            entityDblClick?.(e, assetData);
        }}
        oncontextmenu={(e: MouseEvent & { currentTarget: HTMLElement }) => {
            if (isMobile) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            if (!selection.has(assetData) || selection.size <= 1) {
                selection.select(assetData);
            }
            oncontext?.({
                entity: assetData,
                anchor: { x: e.clientX, y: e.clientY }
            });
        }}
    >
        {#if isDisabled}
            <div class="disabled-overlay"></div>
        {/if}
        {@render entitySnippet(assetData, { isSelected })}
    </div>
{/snippet}

{#snippet entityTable()}
    <div
        bind:this={entityGridDisplayEl}
        class="viz-entity-table-container {entityGridDisplayProps.class}"
        class:is-active={selectionManager.activeScopeId === scopeId}
        {...entityGridDisplayProps}
        use:unselectImagesOnClickOutsideAssetContainer
        onclick={handleContainerClick}
        onscroll={handleGridScroll}
    >
        <Table
            name="entity-table"
            data={allEntityData}
            {columns}
            selectable={true}
            selectedKeys={selection.selectedItems.map((item) => item.uid)}
            columnsEditable={true}
            resizable={true}
            onrowdblclick={(e, asset) => {
                if (entityDblClick) {
                    entityDblClick(e, asset);
                }
            }}
            onselectionchange={(keys, rows) => {
                if (keys.length === 0) {
                    selection.clear();
                } else if (keys.length >= allEntityData.length) {
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
                    sortState.value.by = s.key as EntitySortBy;
                    sortState.value.order = s.order === "asc" ? "ASC" : "DESC";
                }
            }}
        />
    </div>
{/snippet}

{#if allEntityData.length === 0}
    {#if searchValue}
        <div class="no-results">
            <span>No results found for <strong>{searchValue}</strong></span>
        </div>
    {:else}
        <div>
            <span>{noEntityMessage}</span>
        </div>
    {/if}
{:else if isListView}
    {@render entityTable()}
{:else if type === "custom"}
    {#if customSnippet}
        {@render customSnippet()}
    {/if}
{:else}
    <div
        bind:this={entityGridDisplayEl}
        class="viz-entity-table-container {entityGridDisplayProps.class}"
        class:is-active={selectionManager.activeScopeId === scopeId}
        {...entityGridDisplayProps}
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
                                {@render entityComponentCard(item.asset)}
                            </div>
                        {/each}
                    </div>
                {/if}
            {/each}
        </div>
    </div>
{/if}

<style lang="scss">
    .viz-entity-table-container {
        box-sizing: border-box;
        width: 100%;
        max-width: 100%;
        text-overflow: clip;
        position: relative;
    }

    .viz-entity-table-container {
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

    .entity-card {
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

    .entity-card.disabled-asset {
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
