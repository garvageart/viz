<script lang="ts">
    import { dev } from "$app/environment";
    import { setContext, untrack } from "svelte";
    import TabGroupDebugOverlay from "$lib/components/workspace/debug/TabGroupDebugOverlay.svelte";
    import { VizMimeTypes } from "$lib/constants";
    import { contextMenu } from "$lib/context-menu";
    import { resetAndReloadLayout } from "$lib/dev/components.svelte";
    import { dragCoordinator } from "$lib/drag-drop/coordinator.svelte";
    import { DragData } from "$lib/drag-drop/data";
    import type { TabGroup } from "$lib/layouts/model.svelte";
    import { type TabDragData, edgeDrag, tabOps } from "$lib/layouts/tab-ops.svelte";
    import { openCollectionTab } from "$lib/layouts/tabs/collection";
    import { workspaceState } from "$lib/states/workspace.svelte";
    import VizView, { invalidationState } from "$lib/views/views.svelte";
    import LoadingContainer from "../overlays/LoadingContainer.svelte";
    import MaterialIcon from "../ui/MaterialIcon.svelte";
    import {
        type TabHandlers,
        buildLayoutContextMenu,
        buildPanelContextMenu,
        buildTabContextMenu
    } from "./workspace-context";

    interface Props {
        group: TabGroup;
    }

    let { group }: Props = $props();

    setContext(
        "content",
        untrack(() => group)
    );

    let activeView = $derived(group.activeView);
    let Comp = $derived(activeView?.component);
    let isFocused = $derived(workspaceState.workspace?.activeGroupId === group.id);

    $effect(() => {
        const view = activeView;
        void invalidationState.version;
        if (view?.path) {
            untrack(() => {
                view.getComponentData();
            });
        }
    });

    function handleFocus() {
        workspaceState.workspace?.setActiveGroup(group.id);
    }

    let showDebugOverlay = $state(false);

    // Scrollbar and Dragging
    let headerEl: HTMLElement | undefined = $state();
    let scrollLeft = $state(0);
    let clientWidth = $state(0);
    let scrollWidth = $state(0);
    let isHoveringHeader = $state(false);
    let isDraggingScrollbar = $state(false);

    let tabDropIndex: number | null = $state(null);
    let dropIndicatorLeft = $state(0);
    let dragScrollInterval: ReturnType<typeof setInterval> | null = null;

    const SCROLL_SPEED = 10;
    const SCROLL_THRESHOLD = 50;

    function ensureActiveTabVisible() {
        if (!headerEl) {
            return;
        }

        const activeTab = headerEl.querySelector<HTMLElement>(".tab-button.active");
        if (!activeTab) {
            return;
        }

        const containerRect = headerEl.getBoundingClientRect();
        const tabRect = activeTab.getBoundingClientRect();

        if (containerRect.width === 0 || tabRect.width === 0) {
            return;
        }

        if (tabRect.left < containerRect.left) {
            headerEl.scrollLeft -= containerRect.left - tabRect.left;
        } else if (tabRect.right > containerRect.right) {
            headerEl.scrollLeft += tabRect.right - containerRect.right;
        }
    }

    $effect(() => {
        if (!headerEl) {
            return;
        }

        const currentActiveId = group.activeViewId;
        void currentActiveId;

        const updateMetrics = () => {
            if (headerEl) {
                scrollLeft = headerEl.scrollLeft;
                clientWidth = headerEl.clientWidth;
                scrollWidth = headerEl.scrollWidth;
            }
        };

        ensureActiveTabVisible();
        updateMetrics();

        const resizeObserver = new ResizeObserver(() => {
            ensureActiveTabVisible();
            updateMetrics();
        });
        resizeObserver.observe(headerEl);

        headerEl.addEventListener("scroll", updateMetrics);
        return () => {
            resizeObserver.disconnect();
            headerEl?.removeEventListener("scroll", updateMetrics);
        };
    });

    function handleScrollbarDragStart(event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();
        isDraggingScrollbar = true;

        const startX = event.clientX;
        const startScrollLeft = scrollLeft;
        const thumbWidthRatio = clientWidth / scrollWidth;
        const thumbWidth = Math.max(20, clientWidth * thumbWidthRatio);
        const trackScrollableWidth = clientWidth - thumbWidth;
        const contentScrollableWidth = scrollWidth - clientWidth;
        const pxRatio = contentScrollableWidth / (trackScrollableWidth || 1);

        function onMouseMove(e: MouseEvent) {
            if (!headerEl) {
                return;
            }

            const deltaX = e.clientX - startX;
            headerEl.scrollLeft = startScrollLeft + deltaX * pxRatio;
        }

        function onMouseUp() {
            isDraggingScrollbar = false;
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        }

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
    }

    function handleWheelScroll(event: WheelEvent) {
        if (headerEl) {
            if (event.deltaY !== 0 && Math.abs(event.deltaX) === 0) {
                event.preventDefault();
                headerEl.scrollLeft += event.deltaY;
            }
        }
    }

    function startDragScroll(direction: "left" | "right") {
        if (dragScrollInterval) {
            return;
        }
        dragScrollInterval = setInterval(() => {
            if (headerEl) {
                headerEl.scrollLeft += direction === "right" ? SCROLL_SPEED : -SCROLL_SPEED;
            }
        }, 50);
    }

    function stopDragScroll() {
        if (dragScrollInterval) {
            clearInterval(dragScrollInterval);
            dragScrollInterval = null;
        }
    }

    function handleDragOver(event: DragEvent) {
        if (!headerEl) {
            return;
        }

        const rect = headerEl.getBoundingClientRect();
        if (event.clientX < rect.left + SCROLL_THRESHOLD) {
            startDragScroll("left");
        } else if (event.clientX > rect.right - SCROLL_THRESHOLD) {
            startDragScroll("right");
        } else {
            stopDragScroll();
        }
    }

    // Keyboard Navigation
    function handleKeyDown(event: KeyboardEvent) {
        const views = group.views;
        const activeIndex = views.findIndex((v) => v.id === activeView?.id);
        if (activeIndex === -1) {
            return;
        }

        let nextIndex = -1;
        switch (event.key) {
            case "ArrowRight":
                nextIndex = (activeIndex + 1) % views.length;
                break;
            case "ArrowLeft":
                nextIndex = (activeIndex - 1 + views.length) % views.length;
                break;
            case "Home":
                nextIndex = 0;
                break;
            case "End":
                nextIndex = views.length - 1;
                break;
        }

        if (nextIndex !== -1 && views[nextIndex]) {
            event.preventDefault();
            group.setActive(views[nextIndex].id);
            const button = headerEl?.querySelector(`[role="tab"][aria-selected="true"]`) as HTMLElement;
            button?.focus();
        }
    }

    const menuHandlers: TabHandlers = {
        moveTab: (v, direction) => {
            workspaceState.workspace?.moveTab(v.id, direction);
        },
        closeTab: (v) => {
            group.removeTab(v.id);
            workspaceState.workspace?.cleanupNode(group);
        },
        closeOtherTabs: (v) => {
            group.views = group.views.filter((view) => view.id === v.id || view.locked);
            workspaceState.workspace?.cleanupNode(group);
        },
        closeTabsToRight: (v) => {
            const index = group.views.findIndex((view) => view.id === v.id);
            group.views = group.views.filter((view, i) => i <= index || view.locked);
            workspaceState.workspace?.cleanupNode(group);
        },
        closeAllTabs: () => {
            group.views = group.views.filter((v) => v.locked);
            workspaceState.workspace?.cleanupNode(group);
        },
        closePanel: () => {
            group.views = [];
            workspaceState.workspace?.cleanupNode(group);
        },
        toggleTabLock: (v) => {
            v.locked = !v.locked;
        },
        splitRight: (v) => {
            workspaceState.workspace?.splitGroup(group.id, v, "right");
        },
        splitDown: (v) => {
            workspaceState.workspace?.splitGroup(group.id, v, "bottom");
        }
    };

    function triggerTabContextMenu(event: MouseEvent, view: VizView) {
        event.stopPropagation();

        const items = buildTabContextMenu(view, group, menuHandlers);
        contextMenu.open(items, event, { offsetY: 4 });
    }

    function triggerHeaderContextMenu(event: MouseEvent) {
        event.stopPropagation();

        const items = [...buildLayoutContextMenu(), ...buildPanelContextMenu(group, menuHandlers)];
        contextMenu.open(items, event, { offsetY: 4 });
    }

    // Tab Drag and Drop

    function handleTabDragLeave(event: DragEvent) {
        const target = event.currentTarget as HTMLElement;
        target.classList.remove("drop-target-active");

        if (dragCoordinator.session) {
            dragCoordinator.session.actionLabel = null;
        }
    }

    let isInternalDrag = $state(false);
    let isDropTargetActive = $state(false);

    function handleContentDragStart() {
        isInternalDrag = true;
    }

    function handleContentDragEnd() {
        isInternalDrag = false;
        isDropTargetActive = false;
    }

    function handleContentDragEnter(e: DragEvent) {
        if (isInternalDrag || !e.dataTransfer || edgeDrag.active || !activeView) {
            return;
        }

        for (const type of e.dataTransfer.types) {
            const tabActions = activeView.getTabDropHandler(type);
            if (tabActions) {
                isDropTargetActive = true;

                if (dragCoordinator.session) {
                    dragCoordinator.session.actionLabel = tabActions.label;
                }
                return;
            }
        }
    }

    function handleContentDragOver(e: DragEvent) {
        if (isInternalDrag || !activeView || !e.dataTransfer || edgeDrag.active) {
            return;
        }

        for (const type of e.dataTransfer.types) {
            const tabActions = activeView.getTabDropHandler(type);
            if (tabActions) {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
                return;
            }
        }
    }

    function handleContentDragLeave(e: DragEvent) {
        if (isInternalDrag) {
            return;
        }

        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX >= rect.right || e.clientY < rect.top || e.clientY >= rect.bottom) {
            isDropTargetActive = false;

            if (dragCoordinator.session) {
                dragCoordinator.session.actionLabel = null;
            }
        }
    }

    function handleContentDrop(e: DragEvent) {
        isDropTargetActive = false;

        if (dragCoordinator.session) {
            dragCoordinator.session.actionLabel = null;
        }

        if (isInternalDrag || !activeView) {
            return;
        }

        handleTabDrop(e, activeView);
    }

    function calculateTabDropIndex(clientX: number): { index: number; left: number } {
        if (!headerEl) {
            return { index: 0, left: 0 };
        }

        const tabButtons = Array.from(headerEl.querySelectorAll<HTMLElement>(".tab-button"));
        if (tabButtons.length === 0) {
            return { index: 0, left: 0 };
        }

        for (let i = 0; i < tabButtons.length; i++) {
            const btn = tabButtons[i];
            const rect = btn.getBoundingClientRect();
            const midX = rect.left + rect.width / 2;

            if (clientX < midX) {
                return { index: i, left: btn.offsetLeft };
            }
        }

        const lastBtn = tabButtons[tabButtons.length - 1];
        return {
            index: tabButtons.length,
            left: lastBtn.offsetLeft + lastBtn.offsetWidth
        };
    }

    $effect(() => {
        const onDragEnd = () => {
            tabDropIndex = null;
            stopDragScroll();
        };

        window.addEventListener("dragend", onDragEnd);
        return () => {
            window.removeEventListener("dragend", onDragEnd);
        };
    });

    function handleHeaderDragOver(e: DragEvent) {
        if (!e.dataTransfer || edgeDrag.active) {
            tabDropIndex = null;
            return;
        }

        const mimeType = dragCoordinator.session?.primaryMimeType;
        const isTab = mimeType === VizMimeTypes.TAB_VIEW;
        const isCollection = mimeType === VizMimeTypes.COLLECTION_UIDS;

        if (isTab || isCollection) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = isTab ? "move" : "copy";

            const { index, left } = calculateTabDropIndex(e.clientX);
            tabDropIndex = index;
            dropIndicatorLeft = left;

            handleDragOver(e);
        }
    }

    function handleHeaderDragLeave(e: DragEvent) {
        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();

        if (e.clientX < rect.left || e.clientX >= rect.right || e.clientY < rect.top || e.clientY >= rect.bottom) {
            tabDropIndex = null;
            stopDragScroll();
        }
    }

    // TODO: Change to generalized drop handler
    async function handleHeaderDrop(e: DragEvent) {
        const dropIndex = tabDropIndex;
        tabDropIndex = null;
        stopDragScroll();

        if (!e.dataTransfer || edgeDrag.active) {
            return;
        }

        const mimeType = dragCoordinator.session?.primaryMimeType;

        if (mimeType === VizMimeTypes.TAB_VIEW) {
            const tabData = DragData.getData<TabDragData>(e.dataTransfer, VizMimeTypes.TAB_VIEW);
            if (tabData) {
                e.preventDefault();
                e.stopPropagation();
                const { viewId } = tabData.payload;
                const workspace = workspaceState.workspace;
                if (workspace) {
                    workspace.moveTabToGroup(viewId, group.id, dropIndex ?? undefined);
                }
            }
            return;
        }

        if (mimeType === VizMimeTypes.COLLECTION_UIDS) {
            const collectionData = DragData.getData<{ uid: string; name: string }>(
                e.dataTransfer,
                VizMimeTypes.COLLECTION_UIDS
            );
            if (collectionData) {
                e.preventDefault();
                e.stopPropagation();
                openCollectionTab(
                    group,
                    collectionData.payload.uid,
                    collectionData.payload.name,
                    dropIndex ?? undefined
                );
            }
        }
    }

    function handleTabDragOver(e: DragEvent, view: VizView) {
        if (!e.dataTransfer || edgeDrag.active) {
            return;
        }

        const mimeType = dragCoordinator.session?.primaryMimeType;
        if (!mimeType || mimeType === VizMimeTypes.TAB_VIEW) {
            return;
        }

        const tabActions = view.getTabDropHandler(mimeType);
        if (tabActions) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";

            const target = e.currentTarget as HTMLElement;
            target.classList.add("drop-target-active");

            if (dragCoordinator.session) {
                dragCoordinator.session.actionLabel = tabActions.label;
            }
        }
    }

    async function handleTabDrop(e: DragEvent, view: VizView) {
        if (!e.dataTransfer || edgeDrag.active) {
            return;
        }

        const target = e.currentTarget as HTMLElement;
        target.classList.remove("drop-target-active");

        if (dragCoordinator.session) {
            dragCoordinator.session.actionLabel = null;
        }

        const mimeType = dragCoordinator.session?.primaryMimeType;
        if (!mimeType) {
            return;
        }

        const handler = view.getTabDropHandler(mimeType);
        if (handler) {
            e.preventDefault();
            e.stopPropagation();

            const data = DragData.getData(e.dataTransfer, mimeType);
            if (data) {
                await handler.dropHandler(data.payload, view);
            }
            return;
        }

        if (mimeType === VizMimeTypes.COLLECTION_UIDS) {
            const data = DragData.getData<{ uid: string; name: string }>(e.dataTransfer, VizMimeTypes.COLLECTION_UIDS);
            if (data) {
                e.preventDefault();
                e.stopPropagation();
                openCollectionTab(group, data.payload.uid, data.payload.name);
            }
        }
    }
</script>

<div class="tab-group-panel" use:tabOps.dropTarget={group.id} onclickcapture={handleFocus} role="none">
    {#if isFocused}
        <div class="viz-panel-active-overlay"></div>
    {/if}
    {#if showDebugOverlay}
        <TabGroupDebugOverlay />
    {/if}
    <div
        class="tab-group-header"
        role="toolbar"
        tabindex="-1"
        onmouseenter={() => (isHoveringHeader = true)}
        onmouseleave={() => (isHoveringHeader = false)}
        oncontextmenu={triggerHeaderContextMenu}
        ondragover={handleHeaderDragOver}
        ondragleave={handleHeaderDragLeave}
        ondrop={handleHeaderDrop}
    >
        <div
            bind:this={headerEl}
            class="tab-group-tabs-container"
            role="tablist"
            tabindex="0"
            onwheel={handleWheelScroll}
            onkeydown={handleKeyDown}
            ondragover={handleHeaderDragOver}
            ondragleave={handleHeaderDragLeave}
            ondrop={handleHeaderDrop}
        >
            {#each group.views as view}
                <button
                    class="tab-button"
                    title={view.name}
                    class:active={group.activeViewId === view.id}
                    role="tab"
                    aria-selected={group.activeViewId === view.id}
                    tabindex={group.activeViewId === view.id ? 0 : -1}
                    onclick={() => {
                        group.setActive(view.id);
                    }}
                    oncontextmenu={(e) => triggerTabContextMenu(e, view)}
                    use:tabOps.draggable={{ viewId: view.id, sourceGroupId: group.id, label: view.name }}
                    ondragover={(e) => handleTabDragOver(e, view)}
                    ondragleave={handleTabDragLeave}
                    ondrop={(e) => handleTabDrop(e, view)}
                >
                    <MaterialIcon
                        style={`transform: translateY(${view.opticalCenterFix}px);`}
                        weight={300}
                        iconName="menu"
                    />
                    <span class="tab-name">{view.name}</span>
                    {#if view.locked}
                        <MaterialIcon class="tab-lock" iconName="lock" />
                    {/if}
                </button>
            {/each}

            {#if tabDropIndex !== null}
                <div class="tab-drop-hairline" style:left="{dropIndicatorLeft}px"></div>
            {/if}
        </div>

        {#if scrollWidth > clientWidth}
            <div
                class="viz-custom-scrollbar {isHoveringHeader || isDraggingScrollbar ? 'visible' : ''}"
                onmousedown={handleScrollbarDragStart}
                role="slider"
                tabindex="0"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={Math.round((scrollLeft / (scrollWidth - clientWidth || 1)) * 100)}
            >
                <div
                    class="viz-custom-scrollbar-thumb"
                    style:width="{Math.max(20, (clientWidth / scrollWidth) * clientWidth)}px"
                    style:transform="translateX({(scrollLeft / (scrollWidth - clientWidth || 1)) *
                        (clientWidth - Math.max(20, (clientWidth / scrollWidth) * clientWidth))}px)"
                ></div>
            </div>
        {/if}

        <div class="header-actions">
            {#if dev}
                <button
                    class="header-action-button"
                    class:active={showDebugOverlay}
                    aria-label="Toggle Debug Overlay Zones"
                    title="Toggle Debug Overlay Zones"
                    onclick={() => (showDebugOverlay = !showDebugOverlay)}
                >
                    <MaterialIcon iconName="window" />
                </button>
                <button
                    class="header-action-button"
                    aria-label="Reset and Reload"
                    title="Reset and Reload"
                    onclick={() => resetAndReloadLayout?.()}
                >
                    <MaterialIcon iconName="refresh" />
                </button>
            {/if}
        </div>
    </div>

    <div
        class="tab-group-content"
        role="tabpanel"
        tabindex="0"
        aria-label={activeView?.name ?? "Tab content"}
        ondragstart={handleContentDragStart}
        ondragend={handleContentDragEnd}
        ondragenter={handleContentDragEnter}
        ondragover={handleContentDragOver}
        ondragleave={handleContentDragLeave}
        ondrop={handleContentDrop}
    >
        {#if isDropTargetActive}
            <div class="drop-target-overlay"></div>
        {/if}
        {#if activeView}
            {#if activeView.error}
                <div class="error-container">
                    <h3>Error loading data</h3>
                    <span>{activeView.error}</span>
                </div>
            {:else if activeView.path && !activeView.viewData}
                <div class="loading-overlay">
                    <LoadingContainer />
                </div>
            {:else if Comp}
                {#key `${activeView.id}-${activeView.path}`}
                    <Comp data={activeView.viewData?.data} view={activeView} />
                {/key}
            {/if}
        {:else}
            <div class="empty-group">
                <span>No active view</span>
            </div>
        {/if}
    </div>
</div>

<style lang="scss">
    .tab-group-panel {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        overflow: hidden;
        position: relative;
    }

    .viz-panel-active-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 900;
        box-shadow:
            0 1.5px 0 var(--viz-primary) inset,
            1.5px 0 0 var(--viz-primary) inset,
            -1.5px 0 0 var(--viz-primary) inset,
            0 -1.5px 0 var(--viz-primary) inset;
    }

    .tab-group-header {
        background-color: var(--viz-surface-panel);
        font-size: 1rem;
        display: flex;
        align-items: center;
        position: relative;
        overflow: hidden;
        width: 100%;
        min-width: 0;
        flex-shrink: 0;
        height: var(--viz-panel-header-height);
        transition: background-color 0.2s;

        &:global(.drop-active) {
            background-color: var(--viz-surface-popover);
        }
    }

    .tab-group-tabs-container {
        display: flex;
        align-items: center;
        flex: 1;
        min-width: 0;
        overflow-x: auto;
        overflow-y: hidden;
        height: 100%;
        white-space: nowrap;
        scrollbar-width: none;
        -ms-overflow-style: none;
        position: relative;

        &::-webkit-scrollbar {
            display: none;
        }
    }

    .tab-drop-hairline {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 2px;
        background-color: var(--viz-accent);
        z-index: var(--viz-z-dropzone);
        pointer-events: none;
        transform: translateX(-1px);
        box-shadow: 0 0 4px var(--viz-accent);
    }

    .tab-button {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        position: relative;
        padding: var(--viz-spacing-sm) var(--viz-spacing-xs);
        /* right side wasn't balanced properly */
        padding-right: 0.4rem;
        cursor: default;
        height: 100%;
        max-width: 11em;
        overflow: hidden;
        gap: var(--viz-spacing-xs);
        font-size: var(--viz-font-size-sm);
        font-weight: 450;
        border: none;
        background: transparent;
        color: inherit;
        transition: background-color 0.15s ease;

        * {
            pointer-events: none;
        }

        &:hover {
            background-color: var(--viz-surface-hover);
        }

        &.active {
            box-shadow: 0 -2px 0 0 var(--viz-primary) inset;
        }

        &:global(.drop-target-active) {
            background-color: color-mix(in srgb, var(--viz-primary) 30%, transparent) !important;
            outline: 1.5px solid var(--viz-primary);
            outline-offset: -1.5px;
            z-index: 10;
        }
    }

    .tab-name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .tab-group-content {
        flex: 1;
        position: relative;
        overflow-x: hidden;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        background-color: var(--viz-surface-base);
    }

    .drop-target-overlay {
        position: absolute;
        inset: 0;
        pointer-events: none;
        outline: 2px dashed var(--viz-primary);
        outline-offset: -2px;
        background-color: color-mix(in srgb, var(--viz-primary) 30%, transparent);
        z-index: var(--viz-z-dropzone);
    }

    .viz-custom-scrollbar {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        width: 100%;
        z-index: 10;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s;
    }

    .viz-custom-scrollbar.visible {
        opacity: 1;
        pointer-events: auto;
    }

    .viz-custom-scrollbar-thumb {
        background-color: color-mix(in srgb, var(--viz-text-secondary) 50%, transparent);
        height: 100%;
        cursor: pointer;
        position: absolute;
        top: 0;
        left: 0;
    }

    .header-actions {
        display: flex;
        align-items: center;
        height: 100%;
        flex-shrink: 0;
        background-color: var(--viz-surface-panel);
        z-index: 2;
    }

    .header-action-button {
        background: transparent;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 0.5em;
        cursor: pointer;
        height: 100%;
        color: var(--viz-text-muted);

        &:hover,
        &.active {
            color: var(--viz-primary);
        }
    }

    .loading-overlay,
    .empty-group,
    .error-container {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 2rem;
        text-align: center;
        color: var(--viz-border-subtle);
    }

    .error-container {
        color: var(--viz-error);
    }

    :global(.tab-lock) {
        font-size: 0.9em;
        opacity: 0.7;
        margin-left: 0.25em;
    }

    @media (max-width: 40rem) {
        .tab-group-header {
            height: 2.2rem;
        }

        .tab-button {
            padding: var(--viz-spacing-sm) var(--viz-spacing-sm);
            font-size: var(--viz-font-size-std);
        }
    }
</style>
