<script lang="ts" module>
	export type DropdownOption<T> = {
		title: string;
		icon?: MaterialSymbol;
		disabled?: boolean;
	};
</script>

<script lang="ts" generics="T">
	import { isEqual } from "lodash-es";
	import MaterialIcon from "./MaterialIcon.svelte";
	import type { MaterialSymbol } from "material-symbols";
	import ContextMenu, { type MenuItem } from "$lib/context-menu/ContextMenu.svelte";

	interface Props {
		class?: string;
		options: DropdownOption<T>[];
		selectedOption?: DropdownOption<T>;
		showMenu?: boolean;
		controlable?: boolean;
		title: string;
		icon?: MaterialSymbol;
		onSelect?: (option: DropdownOption<T>) => void;
	}

	let { options, selectedOption = $bindable(options[0]), showMenu = $bindable(false), title, icon, onSelect }: Props = $props();

	let buttonEl: HTMLElement | null = $state(null);
	let menuAnchor: HTMLElement | { x: number; y: number } | null = $state(null);

	// Build MenuItem array for ContextMenu
	function buildMenuItems(): MenuItem[] {
		return options.map((opt, idx) => ({
			id: `opt-${idx}`,
			label: opt.title,
			// prefer explicit option icon, otherwise show a check for the selected option
			icon: opt.icon ?? (isEqual(selectedOption, opt) ? ("check" as any) : undefined),
			disabled: opt.disabled,
			action: (e) => handleOptionSelect(opt as any)
		}));
	}

	let menuItems: MenuItem[] = $state([]);

	function handleOptionSelect(option: DropdownOption<T>) {
		onSelect?.(option);
		selectedOption = option;
		showMenu = false;
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === "Escape") {
			showMenu = false;
		}
	}}
	onclick={(e) => {
		if (!document.querySelector(".viz-dropdown-container")?.contains(e.target as Node)) {
			showMenu = false;
		}
	}}
/>

<div class="viz-dropdown-container">
	<button
		class="viz-dropdown-button"
		bind:this={buttonEl}
		onclick={() => {
			menuItems = buildMenuItems();
			if (showMenu) {
				showMenu = false;
			} else {
				showMenu = true;
			}
		}}
		{title}
	>
		{#if selectedOption}
			<span class="viz-dropdown-icon">
				{#if selectedOption.icon}
					<MaterialIcon iconName={selectedOption.icon} />
				{:else if icon}
					<MaterialIcon iconName={icon} />
				{/if}
			</span>
			<p class="viz-dropdown-title">
				{selectedOption.title}
			</p>
		{:else}
			<p class="viz-dropdown-title">
				{title}
			</p>
		{/if}
	</button>

	<div class="dropdown-menu-container">
		<ContextMenu bind:showMenu items={menuItems} />
	</div>
</div>

<style lang="scss">
	.viz-dropdown-container {
		position: relative;
		display: inline-block;
	}

	.dropdown-menu-container {
		position: absolute;
		top: 100%;
		left: 0;
		z-index: 1000;
	}

	.viz-dropdown-title {
		margin: 0em 0.2rem;
		text-wrap: nowrap;
	}

	.viz-dropdown-button {
		display: flex;
		align-items: center;
		padding: 0.5em 0.5em;
		border-radius: 10em;
		text-wrap: nowrap;
		cursor: pointer;

		&:focus {
			outline: 2px solid var(--imag-60);
			background-color: var(--imag-80);
		}

		&:hover {
			background-color: var(--imag-90);
		}

		&:active {
			background-color: var(--imag-80);
		}
	}
</style>
