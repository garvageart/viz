<script lang="ts">
	import { slide } from "svelte/transition";
	import MaterialIcon from "./MaterialIcon.svelte";

	interface Props {
		open?: boolean;
		children?: import("svelte").Snippet;
		title?: string;
		sidebarWidth?: string;
	}

	let { open = $bindable(true), title, sidebarWidth = "18%", children }: Props = $props();

	let sidebarEl: HTMLElement;
	let sidebarWidthState = $derived(open ? sidebarWidth : "3rem");
</script>

<nav bind:this={sidebarEl} class="viz-sidebar" style:min-width={sidebarWidthState}>
	<div class="sidebar-header" class:closed={!open}>
		{#if open}
			<button class="close-sidebar-button" title="Close Settings Sidebar" onclick={() => (open = !open)}>
				<MaterialIcon iconName="close" />
			</button>
			{#if title}
				<h3 class="sidebar-heading">{title}</h3>
			{/if}
		{:else}
			<button
				id="open-sidebar-button"
				title="Open Settings Sidebar"
				onclick={() => (open = true)}
				out:slide={{ axis: "x", duration: 300 }}
			>
				<MaterialIcon iconName="arrow_right" />
			</button>
		{/if}
	</div>
	{#if open}
		<div class="sidebar-content" transition:slide={{ axis: "x", duration: 300 }}>
			{@render children?.()}
		</div>
	{/if}
</nav>

<style lang="scss">
	.viz-sidebar {
		background-color: var(--imag-100);
		border-right: 1px solid var(--imag-60);
		height: 100%;
		display: flex;
		flex-direction: column;
		position: relative;
		transition: min-width 0.3s ease;
	}

	.sidebar-header {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		border-bottom: 1px solid var(--imag-60);
		transition: border 0.3s ease;

		&.closed {
			border-bottom: 0px;
		}
	}

	.sidebar-content {
		width: 100%;
		height: 100%;
		overflow-y: auto;
	}

	#open-sidebar-button {
		height: 2em;
		min-width: 2em;
		width: 100%;
		top: 2em;
		background-color: var(--imag-80);
	}

	.close-sidebar-button {
		height: 2em;
		min-width: 2em;
	}
</style>
