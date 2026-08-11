<script lang="ts" generics>
    import hotkeys, { type HotkeysEvent } from "hotkeys-js";
    import { DateTime } from "luxon";
    import { type Snippet, onMount, untrack } from "svelte";
    import { SvelteSet } from "svelte/reactivity";
    import { fade } from "svelte/transition";
    import { type Instance, type Props as TippyProps, delegate, followCursor } from "tippy.js";
    import "tippy.js/dist/tippy.css";
    import { type ImageAsset, getFullImagePath } from "$lib/api";
    import ImageLabelViewer from "$lib/components/image-tools/ImageLabelViewer.svelte";
    import StarRating from "$lib/components/image-tools/StarRating.svelte";
    import PhotoTooltip from "$lib/components/tooltips/PhotoTooltip.svelte";
    import { mountTooltipComponent } from "$lib/components/tooltips/tooltip";
    import AssetImage, { type ImageResolution } from "$lib/components/ui/AssetImage.svelte";
    import Checkbox from "$lib/components/ui/Checkbox.svelte";
    import Favourite from "$lib/components/ui/Favourite.svelte";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import {
        type PhotoGridConfig,
        PhotoGridVirtualizer
    } from "$lib/components/virtualizer/PhotoGridVirtualizer.svelte.js";
    import { VizMimeTypes } from "$lib/constants";
    import { DragData } from "$lib/drag-drop/data";
    import type { ConsolidatedGroup, ImageWithDateLabel } from "$lib/photo-layout";
    import { filterManager } from "$lib/states/filter.svelte";
    import { debugMode, isLayoutPage, isMobile } from "$lib/states/index.svelte";
    import { selectionManager } from "$lib/states/selection.svelte";
    import type { CardVisualState } from "$lib/types/snippet";
    import { getScrollParent } from "$lib/utils/dom";
    import { getImageLabel, getTakenAt } from "$lib/utils/images";
    import { debounce } from "$lib/utils/misc";
    import TimelineScrubber from "./TimelineScrubber.svelte";

    interface ExtendedTippyInstance extends Instance<TippyProps> {
        _destroyComponent?: () => void;
    }

    interface PhotoSpecificProps {
        data: ImageAsset[];
        allData?: ImageAsset[];
        groupedData?: ConsolidatedGroup[];
        photoCardSnippet?: Snippet<[ImageAsset, ImageResolution, CardVisualState]>;
        gridConfig?: PhotoGridConfig;
        showDateHeaders?: boolean;
        scopeId?: string;
        searchValue?: string;
        noAssetsMessage?: string;
        disabledUids?: Set<string>;
        stickyHeaderHeight?: number;
        assetClick?: () => void;
        assetDblClick?: (
            e: MouseEvent & {
                currentTarget: EventTarget & (HTMLDivElement | HTMLTableRowElement);
            },
            asset: ImageAsset
        ) => void;
        onassetcontext?: (detail: { asset: ImageAsset; anchor: { x: number; y: number } | HTMLElement }) => void;
        onLoadMore?: () => Promise<void> | void;
        onselectAll?: () => void;
        disableOutsideUnselect?: boolean;
    }

    let {
        data = $bindable([]),
        allData = $bindable(),
        groupedData,
        gridConfig = {},
        showDateHeaders = false,
        scopeId = "default",
        searchValue = $bindable(""),
        disabledUids = new Set(),
        stickyHeaderHeight,
        assetClick,
        assetDblClick,
        onassetcontext,
        onLoadMore,
        onselectAll,
        disableOutsideUnselect = false
    }: PhotoSpecificProps = $props();

    // Selection Management
    let selection = $derived(selectionManager.getScope<ImageAsset>(scopeId));
    let selectedUIDs = $derived(selection.selectedUids);
    let selectionAnchor = $state<ImageAsset | null>(null);

    // Sync data source to selection scope so filters can access it
    $effect(() => {
        const source = allData || data;
        if (source) {
            selection.setSource(source);
        }
    });

    // Apply filters
    // If we have grouped data, we assume the parent has already filtered it or passed it correctly.
    // However, if `data` is passed (flat mode), we filter it locally.
    // For the timeline view, `data` might be the flattened version of `groupedData`.
    let filteredData = $derived(filterManager.apply(data) as ImageAsset[]);

    // this is sort weird to track idk
    function onFocus() {
        selectionManager.setActive(scopeId);
    }

    // Short-cuts / hotkeys handling
    function handleSelectAll(e: KeyboardEvent) {
        if (selectionManager.activeScopeId !== scopeId) {
            return;
        }

        e.preventDefault();

        if (onselectAll) {
            onselectAll();
        } else {
            // Select filtered data, not hidden or disabled data
            const selectionData = filteredData.filter((img) => !disabledUids.has(img.uid));
            selection.selectMultiple(selectionData);
        }
    }

    function handleEscape(e: KeyboardEvent) {
        if (selectionManager.activeScopeId !== scopeId) {
            return;
        }
        if (selection.selected.size === 0 && !selection.active) {
            return;
        }

        e.preventDefault();
        selection.clear();
    }

    function getAssetPosition(assetId: string) {
        const rows = virtualizer.rows;
        for (let r = 0; r < rows.length; r++) {
            const row = rows[r];
            if (row.type === "header") {
                continue;
            }
            let currentX = 0;
            for (let i = 0; i < row.items.length; i++) {
                const item = row.items[i];
                if (item.asset.uid === assetId) {
                    return {
                        rowIndex: r,
                        centerX: currentX + item.width / 2
                    };
                }
                currentX += item.width + virtualizer.gridGap;
            }
        }
        return null;
    }

    function handleKeyNav(e: KeyboardEvent, handler: HotkeysEvent) {
        if (selectionManager.activeScopeId !== scopeId) {
            return;
        }

        e.preventDefault();

        if (!filteredData.length) {
            return;
        }

        onFocus();

        suppressScrollOnce = false; // Reset scroll suppression so keyboard moves scroll targeted item into view
        scrollToTopOnNext = true; // Keyboard nav always scrolls the selected row to the top of the viewport

        if (!selection.active) {
            const searchList = allData && allData.length > 0 ? allData : filteredData;
            const firstEnabled = searchList.find((img) => !disabledUids.has(img.uid));
            if (firstEnabled) {
                handleImageCardSelect(firstEnabled, e);
            }
            return;
        }

        const activeId = selection.active.uid;
        const searchList = allData && allData.length > 0 ? allData : filteredData;
        const globalIndex = searchList.findIndex((a) => a.uid === activeId);

        if (globalIndex === -1) {
            return;
        }

        if (handler.key.endsWith("left") || handler.key.endsWith("right")) {
            if (handler.key.endsWith("left")) {
                let targetIndex = -1;
                for (let i = globalIndex - 1; i >= 0; i--) {
                    if (!disabledUids.has(searchList[i].uid)) {
                        targetIndex = i;
                        break;
                    }
                }
                if (targetIndex !== -1) {
                    // Boundary: Try to go to previous global item
                    handleImageCardSelect(searchList[targetIndex], e);
                }
            } else {
                let targetIndex = -1;
                for (let i = globalIndex + 1; i < searchList.length; i++) {
                    if (!disabledUids.has(searchList[i].uid)) {
                        targetIndex = i;
                        break;
                    }
                }
                if (targetIndex !== -1) {
                    // Boundary: Try to go to next global item
                    handleImageCardSelect(searchList[targetIndex], e);
                }
            }
        } else {
            const pos = getAssetPosition(activeId);
            if (!pos) {
                return;
            }

            const rows = virtualizer.rows;

            let targetRowIndex = pos.rowIndex + (handler.key.endsWith("up") ? -1 : 1);

            // Skip header rows
            while (targetRowIndex >= 0 && targetRowIndex < rows.length) {
                const row = rows[targetRowIndex];
                if (row.type === "header") {
                    targetRowIndex += handler.key.endsWith("up") ? -1 : 1;
                    continue;
                }

                const nonDisabledItems = row.items.filter((item) => !disabledUids.has(item.asset.uid));
                if (nonDisabledItems.length > 0) {
                    break;
                }

                targetRowIndex += handler.key.endsWith("up") ? -1 : 1;
            }

            // Vertical Boundary Checks
            if (targetRowIndex < 0) {
                // Moved UP past top
                if (searchList) {
                    // Fallback: Select previous global item (effectively wrapping to end of previous group)
                    let targetIndex = -1;
                    for (let i = globalIndex - 1; i >= 0; i--) {
                        if (!disabledUids.has(searchList[i].uid)) {
                            targetIndex = i;
                            break;
                        }
                    }
                    if (targetIndex !== -1) {
                        handleImageCardSelect(searchList[targetIndex], e);
                    }
                }
                return;
            }

            if (targetRowIndex >= rows.length) {
                // Moved DOWN past bottom
                if (searchList) {
                    // Fallback: Select next global item (effectively wrapping to start of next group)
                    let targetIndex = -1;
                    for (let i = globalIndex + 1; i < searchList.length; i++) {
                        if (!disabledUids.has(searchList[i].uid)) {
                            targetIndex = i;
                            break;
                        }
                    }
                    if (targetIndex !== -1) {
                        handleImageCardSelect(searchList[targetIndex], e);
                    }
                }
                return;
            }

            // Local column navigation
            const targetRow = rows[targetRowIndex];
            if (targetRow.type === "header") {
                return; // Should not happen due to skip loop
            }

            const nonDisabledItems = targetRow.items.filter((item) => !disabledUids.has(item.asset.uid));
            if (nonDisabledItems.length === 0) {
                return;
            }

            let closestItem = nonDisabledItems[0];
            let minDiff = Number.MAX_VALUE;
            let currentX = 0;

            for (const item of targetRow.items) {
                const itemCenterX = currentX + item.width / 2;
                if (!disabledUids.has(item.asset.uid)) {
                    const diff = Math.abs(itemCenterX - pos.centerX);

                    if (diff < minDiff) {
                        minDiff = diff;
                        closestItem = item;
                    }
                }
                currentX += item.width + virtualizer.gridGap;
            }

            handleImageCardSelect(closestItem.asset as ImageAsset, e);
        }
    }

    onMount(() => {
        hotkeys("ctrl+a", handleSelectAll);
        hotkeys("escape", handleEscape);
        hotkeys("left,right,up,down,shift+left,shift+right,shift+up,shift+down", handleKeyNav);

        return () => {
            hotkeys.unbind("ctrl+a", handleSelectAll);
            hotkeys.unbind("escape", handleEscape);
            hotkeys.unbind("left,right,up,down,shift+left,shift+right,shift+up,shift+down", handleKeyNav);
        };
    });

    // Styling stuff
    const assetLookup = $derived(new Map(data.map((a: ImageAsset) => [a.uid, a])));

    function getAssetFromElement(el: HTMLElement): ImageAsset | undefined {
        const assetId = el.dataset.assetId;
        if (!assetId) {
            return undefined;
        }

        return assetLookup.get(assetId) ?? allData?.find((a: ImageAsset) => a.uid === assetId);
    }

    $effect(() => {
        if (!photoGridEl || isMobile) {
            return;
        }

        // Initialize delegated Tippy instance on the grid container
        const delegatedTippy = delegate(photoGridEl, {
            target: ".asset-photo", // Delegate tooltips to elements matching this selector
            theme: "viz no-padding",
            followCursor: "initial",
            plugins: [followCursor],
            arrow: false,
            delay: [600, 0],
            interactive: true,
            onShow(instance: Instance<TippyProps>) {
                const assetEl = instance.reference as HTMLElement;
                const asset = getAssetFromElement(assetEl);
                if (!asset) {
                    return false; // Don't show tooltip if asset data isn't found
                }

                const { node, destroy } = mountTooltipComponent(PhotoTooltip, {
                    asset,
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
    let isMultiSelecting = $derived(selection.size > 1);

    const groupLookup = $derived.by(() => {
        const map = new Map<string, ImageAsset[]>();
        if (groupedData) {
            for (const g of groupedData) {
                map.set(g.label, g.allImages);
            }
        }
        return map;
    });

    async function handleGroupSelect(label: string) {
        const images = groupLookup.get(label);
        if (!images) {
            return;
        }

        const enabledImages = images.filter((i) => !disabledUids.has(i.uid));
        if (enabledImages.length === 0) {
            return;
        }

        const allSelected = enabledImages.every((i) => selectedUIDs.has(i.uid));

        if (allSelected) {
            for (const img of enabledImages) {
                selection.remove(img);
            }
            // Clear anchor if it was part of this group
            if (selection.active && enabledImages.some((i) => i.uid === selection.active?.uid)) {
                selection.active = undefined;
            }
        } else {
            selection.addMultiple(enabledImages);
            // Set anchor to first item of group for shift-selection without auto-scrolling to bottom
            if (enabledImages.length > 0) {
                suppressScrollOnce = true;
                selection.active = enabledImages[0];
            }

            // If onLoadMore is provided and this group reaches the end of the currently loaded list,
            // load more pages programmatically until the whole group is loaded.
            if (onLoadMore) {
                let currentImages = enabledImages;
                let lastImage = currentImages[currentImages.length - 1];
                let searchList = allData && allData.length > 0 ? allData : data;

                while (lastImage && searchList.length > 0 && searchList[searchList.length - 1].uid === lastImage.uid) {
                    const beforeLength = searchList.length;
                    await onLoadMore();

                    const afterList = allData && allData.length > 0 ? allData : data;
                    if (afterList.length <= beforeLength) {
                        break;
                    }
                    searchList = afterList;

                    const updatedImages = groupLookup.get(label) || [];
                    const newlyLoadedInGroup = updatedImages.filter(
                        (i) => !disabledUids.has(i.uid) && !selectedUIDs.has(i.uid)
                    );

                    if (newlyLoadedInGroup.length === 0) {
                        break;
                    }

                    selection.addMultiple(newlyLoadedInGroup);
                    currentImages = updatedImages.filter((i) => !disabledUids.has(i.uid));
                    if (currentImages.length > 0) {
                        suppressScrollOnce = true;
                        selection.active = currentImages[0];
                        lastImage = currentImages[currentImages.length - 1];
                    } else {
                        break;
                    }
                }
            }
        }
    }

    // Virtualized photo-grid state
    // We use a stable instance and update its config via effect to avoid recreation and potential scroll jumps.
    // svelte-ignore state_referenced_locally
    const virtualizer = new PhotoGridVirtualizer(gridConfig);
    $effect(() => {
        virtualizer.updateConfig(gridConfig);
    });

    let scrollTop: number = $state(0);
    let usingExternalScroll = $state(false);
    let scrollParent: HTMLElement | Window | undefined = $state();
    let isSyncingScroll = false; // Flag to prevent loop
    let isScrubbing = $state(false);
    let suppressScrollOnce = false;
    let scrollToTopOnNext = false; // When true, keyboard nav scrolls selected row to the top of the viewport

    let photoGridEl: HTMLDivElement | undefined = $state();
    let gridContainerEl: HTMLDivElement | undefined = $state();

    // absolute container metrics for the scrubber
    let containerScrollTop = $state(0);
    let containerScrollHeight = $state(0);
    let containerViewportHeight = $state(0);
    let gridOffsetTop = $state(0);
    let gridContentHeight = $state(0);
    let gridRightInset = $state(0);

    let scrubberTopOffset = $derived(stickyHeaderHeight !== undefined ? stickyHeaderHeight : gridOffsetTop);

    const dateLabel = $derived(virtualizer.getDateLabel(scrollTop));

    // For the scrubber, we want it to represent the entire scrollable area of the grid-container.
    // We pass values that make its internal ratio calculation match the container's.
    // Scrubber track will be positioned below the sticky toolbar.
    const scrubberTotalHeight = $derived(
        usingExternalScroll ? Math.max(0, gridContentHeight - scrubberTopOffset) : virtualizer.totalHeight
    );
    const scrubberViewportHeight = $derived(
        usingExternalScroll ? containerViewportHeight - scrubberTopOffset : virtualizer.viewportHeight
    );
    let scrubberScrollTop = $derived(usingExternalScroll ? Math.max(0, containerScrollTop - gridOffsetTop) : scrollTop);
    let scrubberScrollTopState = $derived(scrubberScrollTop);

    $effect(() => {
        if (isScrubbing) {
            if (usingExternalScroll && scrollParent instanceof HTMLElement) {
                isSyncingScroll = true;
                const pageScroll = Math.max(0, scrubberScrollTopState + gridOffsetTop);
                scrollParent.scrollTop = pageScroll;
                // Derived containerScrollTop will update via scroll event,
                // but we force update for virtualizer responsiveness.
                containerScrollTop = pageScroll;
                scrollTop = Math.max(0, pageScroll - gridOffsetTop);
                virtualizer.updateScroll(scrollTop, containerViewportHeight);
                requestAnimationFrame(() => {
                    isSyncingScroll = false;
                });
            } else {
                scrollTop = scrubberScrollTopState;
                virtualizer.updateScroll(scrollTop, virtualizer.viewportHeight);
            }
        }
    });

    // Bounded retry counter to handle initial mount timing without infinite loops
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

        if (availableWidth <= 0) {
            requestAnimationFrame(() => updateVirtualGrid());
            return;
        }

        // Dynamically adjust targetRowHeight based on available width if not explicitly locked in gridConfig.
        // This ensures more photos fit proportionally in a row on smaller viewports or narrow split-panes.
        let targetHeight = gridConfig.targetRowHeight || 240;
        if (!gridConfig.targetRowHeight) {
            if (availableWidth < 600) {
                targetHeight = 140;
            } else if (availableWidth < 900) {
                targetHeight = 180;
            } else if (availableWidth < 1200) {
                targetHeight = 220;
            } else {
                targetHeight = 260;
            }
        }
        virtualizer.updateConfig({
            ...gridConfig,
            targetRowHeight: targetHeight
        });

        let vH = photoGridEl.clientHeight;

        // If using external scroll, grid might be fully expanded, so clientHeight is huge.
        // We want the viewport height.
        if (usingExternalScroll || vH === 0) {
            vH = window.innerHeight;
            // Try to get actual scroll parent height if possible
            if (scrollParent instanceof HTMLElement) {
                vH = scrollParent.clientHeight;
            }
        }

        // Pass to virtualizer
        if (groupedData && groupedData.length > 0) {
            if (showDateHeaders) {
                virtualizer.update(groupedData, availableWidth);
            } else {
                // If headers are off, flatten the grouped data to keep the date labels/badges
                const flatWithLabels = groupedData.flatMap((g) => g.allImages);
                virtualizer.updateFlat(flatWithLabels, availableWidth);
            }
        } else if (allData && allData.length > 0) {
            // Fallback to allData if groupedData is not present (might already be labelled)
            virtualizer.updateFlat(allData, availableWidth);
        } else {
            virtualizer.updateFlat(filteredData, availableWidth);
        }

        virtualizer.updateScroll(scrollTop, vH);
    }

    function scrollToAsset(asset: ImageAsset, forceToTop = false) {
        if (!photoGridEl || !virtualizer.rows.length) {
            return;
        }

        // Find the scroll container
        const scroller = usingExternalScroll ? scrollParent : photoGridEl;
        if (!scroller) {
            return;
        }

        for (const row of virtualizer.rows) {
            if (row.type === "header") {
                continue;
            }
            if (row.items.some((i) => i.asset.uid === asset.uid)) {
                // If using external scroll we know offsets
                if (usingExternalScroll && scroller instanceof HTMLElement) {
                    const rowTop = row.top;
                    const rowBottom = row.top + row.height;
                    const viewportTop = scroller.scrollTop - gridOffsetTop;
                    const viewportBottom = viewportTop + scroller.clientHeight;
                    const scrollPaddingTop = 100; // Offset for sticky header/toolbar

                    if (forceToTop || rowTop < viewportTop + scrollPaddingTop || rowBottom > viewportBottom) {
                        // Scroll so that the selected row is at the top of the viewport
                        scroller.scrollTop = Math.max(0, rowTop + gridOffsetTop - scrollPaddingTop);
                    }
                    return;
                }

                // Default (internal scroll within photoGridEl)
                if (scroller instanceof HTMLElement) {
                    const rowTop = row.top;
                    const rowBottom = row.top + row.height;
                    const viewportTop = scroller.scrollTop;
                    const viewportBottom = scroller.scrollTop + scroller.clientHeight;
                    const scrollPaddingTop = 100; // Offset for sticky header/toolbar

                    if (forceToTop || rowTop < viewportTop + scrollPaddingTop || rowBottom > viewportBottom) {
                        scroller.scrollTop = Math.max(0, rowTop - scrollPaddingTop);
                    }
                }
                break;
            }
        }
    }

    let lastActiveUID: string | null = null;

    $effect(() => {
        const currentActive = selection.active;
        if (currentActive && photoGridEl) {
            const activeUid = currentActive.uid;
            untrack(() => {
                if (activeUid !== lastActiveUID) {
                    lastActiveUID = activeUid;
                    if (!suppressScrollOnce) {
                        scrollToAsset(currentActive, scrollToTopOnNext);
                    }
                }
                suppressScrollOnce = false;
                scrollToTopOnNext = false;
            });
        } else if (!currentActive) {
            lastActiveUID = null;
            suppressScrollOnce = false;
            scrollToTopOnNext = false;
        }
    });

    // Action to initialize grid and setup observers
    function initGrid(node: HTMLDivElement) {
        photoGridEl = node;
        let resizeObserver: ResizeObserver | undefined;

        // Detect external scroll parent
        const parent = getScrollParent(node);

        const updateMetrics = () => {
            if (!photoGridEl || !gridContainerEl || !scrollParent || !(scrollParent instanceof HTMLElement)) return;

            const parentRect = scrollParent.getBoundingClientRect();
            const gridRect = gridContainerEl.getBoundingClientRect();

            // Accurate offset calculation relative to scrollable content start.
            // The scrubber is anchored to the grid-container (not the inner
            // viz-photo-grid-container), so measure that element.
            gridOffsetTop = Math.max(0, gridRect.top - parentRect.top + scrollParent.scrollTop);
            containerViewportHeight = scrollParent.clientHeight;
            containerScrollHeight = scrollParent.scrollHeight;
            containerScrollTop = scrollParent.scrollTop;
            gridContentHeight = gridContainerEl.scrollHeight;
            // Overhang so the scrubber hugs the right edge of the scroll container
            // even when the grid is inset by ancestor padding.
            gridRightInset = Math.max(0, parentRect.left + scrollParent.clientWidth - gridRect.right);

            // Update virtualizer's view of things
            virtualizer.viewportHeight = containerViewportHeight;
            scrollTop = Math.max(0, containerScrollTop - gridOffsetTop);
            virtualizer.updateScroll(scrollTop, containerViewportHeight);

            if (debugMode) {
                console.log("[PhotoGrid Scroller] Metrics updated:", {
                    gridOffsetTop,
                    gridContentHeight,
                    containerScrollTop,
                    containerScrollHeight,
                    containerViewportHeight,
                    relativeScrollTop: scrollTop,
                    totalImagesHeight: virtualizer.totalHeight
                });
            }
        };

        if (parent !== node && parent !== window) {
            usingExternalScroll = true;
            scrollParent = parent;

            // Hide native scrollbar on parent
            if (scrollParent instanceof HTMLElement) {
                scrollParent.classList.add("scrollbar-hidden");
            }

            // Attach listener
            const onExternalScroll = () => {
                if (!photoGridEl) {
                    return;
                }
                if (isSyncingScroll || isScrubbing) {
                    return;
                }
                updateMetrics();
            };

            parent.addEventListener("scroll", onExternalScroll, { passive: true });

            // Initial check
            updateMetrics();

            resizeObserver = new ResizeObserver(() => {
                updateMetrics();
                updateVirtualGrid();
            });
            resizeObserver.observe(node);
            resizeObserver.observe(parent as HTMLElement);

            // Defer initial layout to after the browser has painted so clientWidth
            // reflects the actual pane dimensions. The ResizeObserver provides further
            // updates if the size changes after this.
            requestAnimationFrame(() => {
                if (photoGridEl) {
                    updateVirtualGrid();
                }
            });

            return {
                destroy() {
                    if (scrollParent instanceof HTMLElement) {
                        scrollParent.classList.remove("scrollbar-hidden");
                    }
                    parent.removeEventListener("scroll", onExternalScroll);
                    resizeObserver?.disconnect();
                    photoGridEl = undefined;
                }
            };
        }

        // Initial synchronous layout to prevent flash
        if (filteredData.length > 0) {
            updateVirtualGrid();
        }

        const debouncedUpdate = debounce(() => requestAnimationFrame(() => untrack(() => updateVirtualGrid())), 100);
        resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.target === node) {
                    if (!usingExternalScroll) {
                        virtualizer.viewportHeight = entry.contentRect.height;
                    } else if (scrollParent instanceof HTMLElement) {
                        virtualizer.viewportHeight = scrollParent.clientHeight;
                    }
                }
            }
            debouncedUpdate();
        });
        resizeObserver.observe(node);

        return {
            destroy() {
                resizeObserver?.disconnect();
                photoGridEl = undefined;
            }
        };
    }

    // Re-run layout when data changes
    $effect(() => {
        // Explicitly depend on data sources to ensure layout updates
        // Update: Mhmmmm???? idk
        void data;
        void groupedData;
        void filteredData;

        if (photoGridEl) {
            untrack(() => {
                updateVirtualGrid();
            });
        }
    });

    function handleGridScroll(_e: Event) {
        if (usingExternalScroll) {
            return;
        }

        if (photoGridEl) {
            scrollTop = photoGridEl.scrollTop;
            virtualizer.updateScroll(scrollTop, virtualizer.viewportHeight);
        }
    }

    // Sync scrollTop to internal scroll
    $effect(() => {
        if (!usingExternalScroll && photoGridEl && Math.abs(photoGridEl.scrollTop - scrollTop) > 1) {
            photoGridEl.scrollTop = scrollTop;
        }
        // No explicit update call here needed because the virtualizer is updated via bindings or events
        // But if scrollTop is changed programmatically (scrubber), we need to ensure virtualizer knows.
        if (!usingExternalScroll) {
            virtualizer.updateScroll(scrollTop, virtualizer.viewportHeight);
        }
    });

    // Lightbox prefetch helpers
    // Simple in-memory cache to avoid repeated prefetches for the same asset UID
    const lightboxPrefetchCache = new SvelteSet<string>();
    const loadedImageUIDs = new SvelteSet<string>();

    function prefetchLightboxImage(asset: ImageAsset) {
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

    function handleImageCardSelect(asset: ImageAsset, e: MouseEvent | KeyboardEvent) {
        if (disabledUids.has(asset.uid)) {
            return;
        }
        onFocus(); // Ensure this grid is active on click

        // Only suppress scroll for mouse clicks — keyboard nav explicitly manages
        // suppressScrollOnce and scrollToTopOnNext in handleKeyNav, and we must not override those.
        if (e instanceof MouseEvent) {
            suppressScrollOnce = true;
        }

        if (e.shiftKey) {
            const selectionData = allData && allData.length > 0 ? allData : filteredData;
            const ids = selectionData.map((i: ImageAsset) => i.uid);
            const endIndex = ids.indexOf(asset.uid);
            const anchor = selectionAnchor || selection.active;
            const startIndex = anchor ? ids.indexOf(anchor.uid) : -1;

            // If both start and end are found, do range selection
            if (startIndex !== -1 && endIndex !== -1) {
                selection.selected.clear();

                const start = Math.min(startIndex, endIndex);
                const end = Math.max(startIndex, endIndex);

                for (let i = start; i <= end; i++) {
                    selection.add(selectionData[i]);
                }
                selection.active = asset;
            } else {
                selection.add(asset);
                selection.active = asset;
                selectionAnchor = asset;
            }
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
                "button, a, input, select, textarea, label, .checkbox-wrapper, [role='button'], [role='menuitem'], [role='tab'], [role='checkbox']"
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

        // Don't clear if clicking on header
        if (target.closest(".inline-grid-header")) {
            return;
        }

        // Scrollbar check
        const element = e.currentTarget as HTMLElement;
        if (target === element) {
            const rect = element.getBoundingClientRect();
            // check if click is on vertical scrollbar (right side)
            if (e.clientX >= rect.right - (element.offsetWidth - element.clientWidth)) {
                return;
            }
            // check if click is on horizontal scrollbar (bottom)
            if (e.clientY >= rect.bottom - (element.offsetHeight - element.clientHeight)) {
                return;
            }
        }

        selection.clear();
    }

    function handleOuterContainerClick(e: MouseEvent) {
        onFocus();
        const target = e.target as HTMLElement;
        if (shouldKeepSelection(target)) {
            return;
        }
        selection.clear();
    }

    function unselectImagesOnClickOutsideAssetContainer(element: HTMLElement) {
        const clickHandler = (e: MouseEvent) => {
            if (disableOutsideUnselect) {
                return;
            }
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
</script>

{#snippet inlineHeader(label: string)}
    {@const groupImages = groupLookup.get(label) || []}
    {@const allSelected = groupImages.length > 0 && groupImages.every((i) => selectedUIDs.has(i.uid))}
    <div class="inline-grid-header">
        <div class="header-content">
            <Checkbox
                class={!allSelected ? "header-select-btn" : ""}
                variant="round"
                size="large"
                checked={allSelected}
                onclick={(e) => {
                    e.stopPropagation();
                }}
                onchange={(e) => {
                    e.stopPropagation();
                    onFocus();
                    handleGroupSelect(label);
                }}
            />

            <h3>{label}</h3>
        </div>
    </div>
{/snippet}

{#snippet inlineDateTile(label: string)}
    <div class="inline-date-tile">
        <span class="date-text">{label}</span>
    </div>
{/snippet}

{#snippet defaultPhotoCard(asset: ImageWithDateLabel)}
    {@const isSelected = selectedUIDs.has(asset.uid) || selection.active?.uid === asset.uid}
    {@const isCached = loadedImageUIDs.has(asset.uid)}
    {@const isDisabled = disabledUids.has(asset.uid)}
    <div
        class="asset-photo"
        class:is-cached={isCached}
        class:disabled-asset={isDisabled}
        draggable={!isDisabled}
        ondragstart={(e: DragEvent) => {
            if (isDisabled) {
                return;
            }

            if (!selectedUIDs.has(asset.uid)) {
                selection.select(asset);
            }
            // When dragging, if multiple selected use that set, otherwise drag the single asset
            const uids = selection.size > 1 ? selection.selectedItems.map((i) => i.uid) : [asset.uid];
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
            if ((e.currentTarget as HTMLElement).dataset.longPressHandled === "true") {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            handleImageCardSelect(asset, e);
        }}
        onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleImageCardSelect(asset, e);
            }
        }}
        // this is fucking shocking gosh
        // i think using an action here would be better
        // something like use:handleTouch
        ontouchstart={(e: TouchEvent) => {
            if (isMobile && !isDisabled) {
                const target = e.currentTarget as HTMLElement;
                const timer = setTimeout(() => {
                    e.preventDefault();
                    e.stopPropagation();

                    selection.toggle(asset);
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
        oncontextmenu={(e: MouseEvent & { currentTarget: HTMLElement }) => {
            if (isMobile && e.currentTarget.dataset.longPressHandled === "true") {
                e.preventDefault();
                e.stopPropagation();
                delete e.currentTarget.dataset.longPressHandled;
                return;
            }

            e.preventDefault();
            e.stopPropagation();
            suppressScrollOnce = true;
            if (!selectedUIDs.has(asset.uid) || selection.size <= 1) {
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
        <div class="image-metadata-display">
            {#if asset.image_metadata?.rating}
                <div class="left-side">
                    <StarRating static={true} value={asset.image_metadata?.rating} />
                </div>
            {/if}
            {#if asset.image_metadata?.label || asset.favourited}
                <div class="right-side">
                    {#if asset.image_metadata?.label}
                        <ImageLabelViewer variant="compact" enableSelection={false} label={getImageLabel(asset)} />
                    {/if}
                    {#if asset.favourited}
                        <Favourite />
                    {/if}
                </div>
            {/if}
        </div>
        {#if asset.image_paths}
            <div class="tile-image-container" style={`height: 100%;`}>
                <AssetImage
                    {asset}
                    resolution="thumbnail"
                    draggable="false"
                    class="tile-image"
                    alt={asset?.name ?? asset?.image_metadata?.file_name ?? ""}
                    loading="lazy"
                    initialLoaded={isCached}
                    onload={() => {
                        loadedImageUIDs.add(asset.uid);
                    }}
                />
            </div>
            {#if isSelected && isMultiSelecting}
                <div class="multi-select-ring" transition:fade={{ duration: 120 }}></div>
            {/if}
        {:else}
            <div class="tile-image-fallback">
                <MaterialIcon iconName="image" size="2.5rem" />
                <span class="fallback-filename">{asset?.name ?? asset?.image_metadata?.file_name ?? asset?.uid}</span>
            </div>
        {/if}

        {#if !isMobile}
            <div class="photo-overlay">
                <div class="photo-overlay-inner">
                    <div class="photo-name">{asset?.name}</div>
                    <div class="photo-meta">
                        <div class="photo-date">
                            {DateTime.fromJSDate(getTakenAt(asset)).toFormat("dd LLL yyyy • HH:mm")}
                        </div>
                    </div>
                </div>
            </div>
        {/if}

        {#if isDisabled}
            <div class="disabled-overlay"></div>
        {/if}
    </div>
{/snippet}

<div
    bind:this={gridContainerEl}
    class="grid-container"
    class:use-external-scroll={usingExternalScroll}
    onclick={handleOuterContainerClick}
    role="presentation"
>
    {#if debugMode}
        <div
            style="position: sticky; top: 0; left: 0; z-index: 9999; background: rgba(0,0,0,0.8); color: lime; padding: 0.5rem; pointer-events: none; font-size: 11px; white-space: pre-wrap; line-height: 1.3;"
        >
            Data: {data?.length} | Filtered: {filteredData?.length} | Rows: {virtualizer.rows?.length} | Visible: {virtualizer
                .visibleRows?.length} | TotalH: {virtualizer.totalHeight}
            | Scroll: {scrollTop} | Ext: {usingExternalScroll}
        </div>
    {/if}

    <div
        use:initGrid
        class="viz-photo-grid-container no-select scrollbar-hidden"
        class:is-active={selectionManager.activeScopeId === scopeId}
        class:use-external-scroll={usingExternalScroll}
        onscroll={handleGridScroll}
        use:unselectImagesOnClickOutsideAssetContainer
        onclick={handleContainerClick}
        // FIXME: this is triggering haphazardly
        onkeydown={onFocus}
        role="grid"
        aria-label="Photo Grid"
        tabindex="0"
    >
        <div style={`height: ${virtualizer.totalHeight}px; position: relative; width: 100%;`}>
            {#each virtualizer.visibleRows as row (row.id)}
                {#if row.type === "header"}
                    <div
                        class="header-row"
                        style={`position: absolute; top: ${row.top}px; left: 0; right: 0; height: ${row.height}px; width: 100%;`}
                    >
                        {@render inlineHeader(row.label)}
                    </div>
                {:else if row.type === "images"}
                    <div
                        class="justified-row"
                        style={`position:absolute; top:${row.top}px; left:0; right:0; height:${row.height}px;`}
                    >
                        {#each row.items as item (item.asset.uid)}
                            <div
                                style={`position: absolute; left: ${item.left}px; width: ${item.width}px; height:${row.height}px;`}
                                class="justified-item"
                            >
                                {#if (item.asset as ImageWithDateLabel).isHeaderItem}
                                    {@render inlineDateTile((item.asset as ImageWithDateLabel).headerLabel || "")}
                                {:else}
                                    {@render defaultPhotoCard(item.asset as ImageWithDateLabel)}
                                {/if}
                            </div>
                        {/each}
                    </div>
                {/if}
            {/each}
        </div>
    </div>

    <div class="scrubber-wrapper" style={usingExternalScroll ? `right: -${gridRightInset}px;` : undefined}>
        <div
            class="scrubber-sticky-container"
            style={usingExternalScroll
                ? `position: sticky; top: ${scrubberTopOffset}px; height: ${scrubberViewportHeight}px;`
                : "height: 100%;"}
        >
            <TimelineScrubber
                bind:scrollTop={scrubberScrollTopState}
                totalHeight={scrubberTotalHeight}
                viewportHeight={scrubberViewportHeight}
                {dateLabel}
                bind:isDragging={isScrubbing}
            />
        </div>
    </div>
</div>

<style lang="scss">
    /* Photo grid (virtualized) styles */
    .grid-container {
        position: relative;
        height: 100%;
        width: 100%;
        margin: auto;
        overflow: hidden;
        flex: 1;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;

        &.use-external-scroll {
            height: auto;
            overflow: visible;
            contain: none;
        }

        @media (max-width: 768px) {
            padding: 0 0.5rem;
            margin: 0.5em auto;
        }
    }

    .viz-photo-grid-container {
        box-sizing: border-box;
        width: 100%;
        max-width: 100%;
        overflow-y: scroll;
        height: 100%;
        scrollbar-gutter: stable;

        &.use-external-scroll {
            height: auto;
            overflow-y: visible;
            margin-bottom: 0;
        }
    }

    .scrubber-wrapper {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        width: 2.5rem; /* Width of scrubber area */
        pointer-events: none;
        z-index: 10;

        @media (max-width: 768px) {
            opacity: 0;
            transition: opacity 0.2s ease;

            &:active,
            &:hover {
                opacity: 1;
                pointer-events: auto;
            }
        }
    }

    .scrubber-sticky-container {
        width: 100%;
        position: relative;
        pointer-events: auto;
    }

    :global(.scrollbar-hidden)::-webkit-scrollbar {
        display: none;
    }
    :global(.scrollbar-hidden) {
        scrollbar-width: none;
    }

    .justified-row .asset-photo {
        width: 100%;
        height: 100%;
    }

    .inline-grid-header {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        box-sizing: border-box;
        justify-content: center;

        .header-content {
            width: fit-content;
            max-width: 100%;
            display: flex;
            align-items: center;
            gap: var(--viz-spacing-xs);

            &:hover :global(.header-select-btn) {
                width: 1.5rem;
                opacity: 1;
            }

            @media (max-width: 768px) {
                gap: var(--viz-spacing-sm);

                &:hover :global(.header-select-btn) {
                    margin-right: 0;
                }
            }
        }

        :global(.header-select-btn) {
            flex-shrink: 0;
            width: 0;
            opacity: 0;
            margin-right: 0;

            transition:
                width 0.2s ease-out,
                opacity 0.2s ease-out,
                margin-right 0.2s ease-out,
                color 0.15s;

            @media (max-width: 768px) {
                order: 1;
                opacity: 1;
                margin-right: 0;
            }
        }

        h3 {
            font-size: var(--viz-font-size-2xl);
            font-weight: 500;
            color: var(--viz-text-primary);
            margin: 0;
            white-space: nowrap;
            text-overflow: ellipsis;
        }
    }

    .image-metadata-display {
        position: absolute;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-sizing: border-box;
        padding: 0.3rem;
        z-index: 2;
        font-size: 0.5rem;
        width: 100%;

        .left-side {
            display: flex;
            align-items: center;
            gap: 0.3rem;
        }

        .right-side {
            display: flex;
            align-items: center;
            gap: 0.3rem;
        }
    }

    .asset-photo {
        position: relative;
        overflow: hidden;

        &:focus,
        &:focus-visible {
            outline: none;
            box-shadow: none;
        }
    }

    .asset-photo.disabled-asset {
        cursor: not-allowed;
        pointer-events: none;
        opacity: 0.65;

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

    .asset-photo.multi-selected-photo {
        outline: 2px solid var(--viz-primary);
        background: var(--viz-surface-base);
    }

    .viz-photo-grid-container.is-active .asset-photo.multi-selected-photo {
        outline-color: var(--viz-primary);
    }

    .asset-photo.selected-photo {
        outline: 2px solid var(--viz-border-subtle);
    }

    .viz-photo-grid-container.is-active .asset-photo.selected-photo {
        outline-color: var(--viz-primary);
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

    :global(.tile-image) {
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
        font-size: var(--viz-font-size-lg);
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

    .tile-image-fallback {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background-color: var(--viz-surface-panel);
        color: var(--viz-text-secondary);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        padding: var(--viz-spacing-sm);
        gap: var(--viz-spacing-xs);
        box-sizing: border-box;
        text-align: center;
        overflow: hidden;

        :global(.material-symbols-outlined) {
            opacity: 0.6;
        }

        .fallback-filename {
            font-size: var(--viz-font-size-std);
            color: var(--viz-text-muted);
            max-width: 90%;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-weight: 500;
        }
    }

    .justified-item {
        container-type: inline-size;
    }

    .inline-date-tile {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        align-items: flex-start;
        padding: 1rem;
        border-left: 3px solid var(--viz-accent);
        font-weight: 500;
        color: var(--viz-text-primary);
        background-color: var(--viz-surface-panel);
        text-align: left;
        font-size: var(--viz-font-size-lg);
        line-height: 1.2;
        box-sizing: border-box;
        position: relative;
        transition: all 0.2s ease;

        .date-text {
            display: block;
            width: min-content;
            word-break: normal;
            overflow-wrap: normal;
            overflow: hidden;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        /* Divider line */
        &::before {
            content: "";
            position: absolute;
            left: 10%;
            top: 10%;
            bottom: 30%;
            width: 0;
        }

        @container (max-width: 5rem) {
            padding: var(--viz-spacing-lg);
            font-size: var(--viz-font-size-std);
            line-height: 1.15;

            &::before {
                top: var(--viz-spacing-xl);
                bottom: var(--viz-spacing-xl);
            }
        }

        /* Inline tile width is 100 */
        /* See PhotoGridVirtualizer.svelte.ts */
        @container (max-width: 100px) {
            padding: var(--viz-spacing-xl);
            font-size: var(--viz-font-size-std);
            line-height: 1.15;

            &::before {
                border-left: 2px solid var(--viz-accent);
                top: var(--viz-spacing-xl);
                bottom: var(--viz-spacing-xl);
            }
        }
    }
</style>
