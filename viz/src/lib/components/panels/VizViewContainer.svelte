<script lang="ts">
	import { page } from "$app/state";
	import type { Snippet } from "svelte";

	let { children, name, style }: { children: Snippet; name: string; style?: string } = $props();
</script>

<svelte:head>
	{#if page.url.pathname !== "/"}
		<title>{name}</title>
	{/if}
</svelte:head>
<div class="viz-view-container" style="padding: 1em 3em; {style}" data-view-name={name}>
	{@render children()}
</div>

<style>
	.viz-view-container {
		white-space: wrap;
		display: flex;
		align-items: flex-start;
		flex-direction: column;
		overflow-y: auto;
	}
</style>
