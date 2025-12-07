<script lang="ts">
	import MaterialIcon from "../MaterialIcon.svelte";
	import type { TabData } from "$lib/views/tabs.svelte.ts";
	import type TabOps from "$lib/views/tabs.svelte.ts";
	import VizView from "$lib/views/views.svelte";
	import { resetAndReloadLayout } from "$lib/dev/components.svelte";
	import ContextMenu, {
		type MenuItem
	} from "$lib/context-menu/ContextMenu.svelte";
	import {
		buildLayoutContextMenu,
		buildPanelContextMenu,
		buildTabContextMenu
	} from "./subpanel-context";
	import type { TabHandlers } from "./subpanel-context";

	interface Props {
		keyId: string;
		panelViews: VizView[];
		activeView: VizView;
		isPanelLocked: boolean;
		tabDropper: TabOps | undefined;
		dev: boolean;
		onViewActive: (view: VizView) => void;
		onTogglePanelLock: () => void;
		menuHandlers: TabHandlers;
	}

	let {
		keyId,
		panelViews,
		activeView,
		isPanelLocked,
		tabDropper,
		dev: isDevMode,
		onViewActive,
		onTogglePanelLock,
		menuHandlers
	}: Props = $props();

	let headerElement: HTMLElement | undefined = $state();
	let contextMenuItems = $state<MenuItem[]>([]);
	let contextMenuAnchor = $state<{ x: number; y: number } | null>(null);
	let showContextMenu = $state(false);
	let showLayoutContextMenu = $state(false);
	let layoutContextMenuItems = $state<MenuItem[]>([]);
	let layoutContextMenuAnchor = $state<{ x: number; y: number } | null>(null);

	// Action wrappers to handle undefined tabDropper safely
	function safeTabDrop(node: HTMLElement) {
		if (tabDropper) {
			return tabDropper.tabDrop(node);
		}
		return { destroy: () => {} };
	}

	function safeTabDraggable(node: HTMLElement, data: TabData) {
		if (isPanelLocked || (data && data.view && data.view.locked)) {
			return { destroy: () => {} };
		}
		if (tabDropper) {
			return tabDropper.draggable(node, data);
		}
		return { destroy: () => {} };
	}

	function handleWheelScroll(event: WheelEvent) {
		if (headerElement) {
			event.preventDefault();
			headerElement.scrollLeft += event.deltaY;
		}
	}

	let dragScrollInterval: ReturnType<typeof setInterval> | null = null;
	const SCROLL_SPEED = 10;
	const SCROLL_THRESHOLD = 50;

	function startDragScroll(direction: "left" | "right") {
		if (dragScrollInterval) return;
		dragScrollInterval = setInterval(() => {
			if (headerElement) {
				headerElement.scrollLeft +=
					direction === "right" ? SCROLL_SPEED : -SCROLL_SPEED;
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
		if (tabDropper) {
			tabDropper.onDropOver(event);
		}

		if (!headerElement) return;

		const rect = headerElement.getBoundingClientRect();
		const clientX = event.clientX;

		if (clientX < rect.left + SCROLL_THRESHOLD) {
			startDragScroll("left");
		} else if (clientX > rect.right - SCROLL_THRESHOLD) {
			startDragScroll("right");
		} else {
			stopDragScroll();
		}
	}

	function handleDragLeave() {
		stopDragScroll();
	}

	function handleDrop(event: DragEvent) {
		stopDragScroll();
	}

	function triggerTabContextMenu(event: MouseEvent, view: VizView) {
		contextMenuAnchor = { x: event.clientX, y: event.clientY };
		contextMenuItems = buildTabContextMenu(
			view,
			panelViews,
			keyId,
			menuHandlers
		);
		showContextMenu = true;
	}

	function triggerHeaderContextMenu(event: MouseEvent) {
		layoutContextMenuAnchor = { x: event.clientX, y: event.clientY };
		layoutContextMenuItems = [
			...buildLayoutContextMenu(),
			...buildPanelContextMenu(keyId, panelViews)
		];
		showLayoutContextMenu = true;
	}
</script>

<ContextMenu
	bind:showMenu={showContextMenu}
	items={contextMenuItems}
	anchor={contextMenuAnchor}
/>
<ContextMenu
	bind:showMenu={showLayoutContextMenu}
	items={layoutContextMenuItems}
	anchor={layoutContextMenuAnchor}
/>

<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
<div
	bind:this={headerElement}
	class="viz-sub_panel-header {isPanelLocked ? 'locked' : ''}"
	role="tablist"
	tabindex="0"
	use:safeTabDrop
	onwheel={handleWheelScroll}
	oncontextmenu={(e) => triggerHeaderContextMenu(e)}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
>
	{#each panelViews as view, i}
		{#if view.name && view.name.trim() !== ""}
			{@const tabNameId = view.name.toLowerCase().replaceAll(" ", "-")}
			{@const data = { index: i, view: view }}
			<button
				id={tabNameId + "-tab"}
				class="viz-tab-button {activeView?.id === view.id ? 'active-tab' : ''}"
				data-tab-id={view.id}
				role="tab"
				title={view.name}
				aria-label={view.name}
				onclick={() => onViewActive(view)}
				oncontextmenu={(e) => triggerTabContextMenu(e, view)}
				use:safeTabDraggable={data}
			>
				<MaterialIcon
					style={`transform: translateY(${view.opticalCenterFix}px);`}
					weight={200}
					iconName="menu"
				/>
				<span class="viz-sub_panel-name">{view.name}</span>
				{#if view.locked}
					<MaterialIcon class="viz-tab-lock" iconName="lock" />
				{/if}
			</button>
		{/if}
	{/each}

	<div class="header-actions">
		{#if isDevMode}
			<button
				id="viz-debug-button"
				class="viz-tab-button icon-only"
				aria-label="Reset and Reload"
				title="Reset and Reload"
				onclick={() => resetAndReloadLayout()}
			>
				<MaterialIcon iconName="refresh" />
			</button>
		{/if}
		{#if isPanelLocked}
			<button
				class="viz-lock-indicator"
				aria-label="Toggle panel lock"
				title={isPanelLocked ? "Unlock Panel" : "Lock Panel"}
				onclick={() => onTogglePanelLock()}
			>
				<MaterialIcon iconName={isPanelLocked ? "lock" : "lock_open"} />
			</button>
		{/if}
	</div>
</div>

<style lang="scss">
	.viz-sub_panel-header {
		background-color: var(--imag-100);
		font-size: 0.8rem;
		display: flex;
		align-items: center;
		position: relative;
		overflow-x: auto;
		overflow-y: hidden;
		flex-wrap: nowrap;

		&::-webkit-scrollbar {
			display: none;
		}

		-ms-overflow-style: none;
		scrollbar-width: none;
	}

	.viz-sub_panel-header.locked {
		opacity: 0.7;
		pointer-events: auto;
	}

	.viz-tab-button {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		position: relative;
		padding: 0.3em 0.7em;
		cursor: default;
		height: 100%;
		max-width: 11em;
		overflow: hidden;
		gap: 0.3em;
		font-size: 0.9em;
		border: none;
		background: transparent;
		color: inherit;

		&:hover {
			background-color: var(--imag-90);
		}
	}

	.viz-sub_panel-name {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.active-tab {
		box-shadow: 0 -2px 0 0 var(--imag-primary) inset;
	}

	.header-actions {
		position: sticky;
		right: 0;
		background-color: var(--imag-100);
		display: flex;
		align-items: center;
		height: 100%;
		margin-left: auto; /* Push to right if tabs don't fill width */
		box-shadow: -5px 0 5px -5px rgba(0, 0, 0, 0.2); /* Shadow to indicate overlap */
		z-index: 5;
	}

	.viz-lock-indicator,
	#viz-debug-button {
		background: transparent;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 0.5em;
		cursor: pointer;
		height: 100%;
	}

	:global(.viz-tab-lock) {
		width: 1em;
		height: 1em;
		opacity: 0.9;
		margin-left: 0.25em;
		font-size: 0.9em;
	}
</style>
