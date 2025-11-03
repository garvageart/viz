<!--
	Context Menu (accessible, typed, keyboard navigable)
	Inspiration: https://www.w3.org/WAI/ARIA/apg/patterns/menu/
-->
<script module lang="ts">
	// Exported types must live in the module script so other TS files can import them
	import type { MaterialSymbol } from "material-symbols";

	export type MenuItem = {
		id: string;
		label: string;
		action?: (event: MouseEvent | KeyboardEvent) => void;
		disabled?: boolean;
		danger?: boolean;
		separator?: boolean;
		icon?: MaterialSymbol; // optional icon name/class
		shortcut?: string; // optional keyboard shortcut label
		children?: MenuItem[]; // optional submenu
	};
</script>

<script lang="ts">
	import { tick } from "svelte";
	import ContextMenuItem from "./ContextMenuItem.svelte";

	type Anchor = { x: number; y: number } | HTMLElement | null;

	let contextMenu: HTMLDivElement | undefined = $state();
	let activeIndex = $state(0);
	let position = $state<{ top: number; left: number }>({ top: 0, left: 0 });
	let cssPosition = $state("");

	interface Props {
		// Backward-compatible prop; bind:showMenu still works
		showMenu?: boolean;
		// Explicit items list for the menu
		items?: MenuItem[];
		// Optional anchor (viewport coords or an element)
		anchor?: Anchor;
		// Reserved for future floating/portal logic
		floating?: boolean;
		// Svelte 5 event callbacks
		onopen?: () => void;
		onclose?: () => void;
		onselect?: (detail: { item: MenuItem; index: number }) => void;
	}

	let {
		showMenu = $bindable(false),
		items = $bindable([] as MenuItem[]),
		anchor = null,
		onopen,
		onclose,
		onselect
	}: Props = $props();

	function setInitialFocus() {
		// Focus the first enabled item
		const firstEnabled = items.findIndex((i) => !i.disabled && !i.separator);
		activeIndex = firstEnabled === -1 ? 0 : firstEnabled;
		tick().then(() => {
			const current = contextMenu?.querySelector<HTMLButtonElement>(`[data-index="${activeIndex}"]`);
			current?.focus();
		});
	}

	function computePosition() {
		// If no anchor is provided, render in-place (no coordinates)
		if (!contextMenu) return;

		if (!anchor) {
			position = { top: 0, left: 0 };
			return;
		}

		cssPosition = "fixed";
		let x = 0;
		let y = 0;

		if (anchor instanceof HTMLElement) {
			const rect = anchor.getBoundingClientRect();
			// Typical dropdown: left-aligned, below the anchor
			x = rect.left;
			y = rect.bottom;
		} else if (anchor && typeof (anchor as any).x === "number") {
			const a = anchor as { x: number; y: number };
			x = a.x;
			y = a.y;
		}

		// Collision handling: keep within viewport
		const menuRect = contextMenu.getBoundingClientRect();
		const maxX = window.innerWidth - menuRect.width - 8;
		const maxY = window.innerHeight - menuRect.height - 8;
		position = {
			left: Math.max(8, Math.min(x, maxX)),
			top: Math.max(8, Math.min(y, maxY))
		};
	}

	$effect(() => {
		if (showMenu) {
			tick().then(() => {
				computePosition();
				setInitialFocus();
				onopen?.();
			});
		} else {
			onclose?.();
		}
	});

	function isEventInside(target: EventTarget | null): boolean {
		if (!contextMenu) {
			return false;
		}

		if (target instanceof Node) {
			return target === contextMenu || contextMenu.contains(target);
		}

		return false;
	}

	function onWindowPointerDown(e: PointerEvent) {
		if (!showMenu) {
			return;
		}

		const path = (e.composedPath && e.composedPath()) || [];
		if (contextMenu && path.includes(contextMenu)) {
			return;
		}

		showMenu = false;
	}

	function onWindowKeyDown(e: KeyboardEvent) {
		if (!showMenu) {
			return;
		}

		const enabled = items.filter((i) => !i.disabled && !i.separator);
		if (enabled.length === 0) {
			return;
		}

		e.preventDefault();
		switch (e.key) {
			case "Escape":
				showMenu = false;
				break;
			case "ArrowDown": {
				let i = activeIndex;
				for (let step = 0; step < items.length; step++) {
					i = (i + 1) % items.length;
					if (!items[i].disabled && !items[i].separator) {
						activeIndex = i;
						focusActive();
						break;
					}
				}
				break;
			}
			case "ArrowUp": {
				let i = activeIndex;
				for (let step = 0; step < items.length; step++) {
					i = (i - 1 + items.length) % items.length;
					if (!items[i].disabled && !items[i].separator) {
						activeIndex = i;
						focusActive();
						break;
					}
				}
				break;
			}
			case "Home":
				activeIndex = items.findIndex((i) => !i.disabled && !i.separator);
				focusActive();
				break;
			case "End":
				for (let i = items.length - 1; i >= 0; i--) {
					if (!items[i].disabled && !items[i].separator) {
						activeIndex = i;
						break;
					}
				}
				focusActive();
				break;
			case "Enter":
			case " ": // Space
				activate(activeIndex, e);
				break;
		}
	}

	function focusActive() {
		tick().then(() => {
			const el = contextMenu?.querySelector<HTMLButtonElement>(`[data-index="${activeIndex}"]`);
			el?.focus();
		});
	}

	function activate(index: number, event: MouseEvent | KeyboardEvent) {
		const item = items[index];
		if (!item || item.disabled || item.separator) {
			return;
		}

		item.action?.(event);
		onselect?.({ item, index });
		showMenu = false;
	}
</script>

<svelte:window onpointerdown={onWindowPointerDown} onkeydown={onWindowKeyDown} />

{#if showMenu}
	<div
		class="context-menu"
		role="menu"
		bind:this={contextMenu}
		style="z-index: 990; {cssPosition === '' ? '' : `position: ${cssPosition}; top:${position.top}px; left:${position.left}px;`}"
	>
		<div class="context-menu-options">
			<ul role="menu" aria-orientation="vertical">
				{#each items as item, i}
					{#if item.separator}
						<li class="separator" role="separator" aria-hidden="true"></li>
					{:else}
						<ContextMenuItem {item} index={i} active={i === activeIndex} onselect={(detail) => activate(i, detail.event)} />
					{/if}
				{/each}
			</ul>
		</div>
	</div>
{/if}

<style>
	.context-menu {
		min-width: 10rem;
		list-style: none;
	}

	.context-menu-options {
		display: inline-flex;
		background-color: var(--imag-100);
		color: var(--imag-text-color);
		/* allow submenus to overflow the parent container */
		overflow: visible;
		flex-direction: column;
		border-radius: 0.3em;
		box-shadow:
			0 10px 30px rgba(0, 0, 0, 0.35),
			0 2px 8px rgba(0, 0, 0, 0.3);
	}

	ul {
		margin: 0;
		padding: 0px;
		list-style: none;
	}

	.separator {
		height: 1px;
		margin: 4px 6px;
		background: var(--imag-40);
	}
</style>
