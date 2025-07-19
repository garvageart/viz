<script lang="ts">
	import { page } from "$app/state";
	import type { Snippet } from "svelte";
	import LoadingContainer from "../LoadingContainer.svelte";
	import { dev } from "$app/environment";
	import type { SvelteHTMLElements } from "svelte/elements";

	interface Props {
		children: Snippet;
		name: string;
		style?: string;
	}

	let { children, name, style, ...props }: SvelteHTMLElements["div"] & Props = $props();
	let isLoading = $state(true);
	const initStyle = $derived(`${isLoading ? "height: 100%;" : ""} ${style}`);
	const pageData = $derived.by(() => {
		if (dev) {
			const randomLatency = dev ? Math.floor(Math.random() * 2000) + 500 : 0; // Random latency between 1 and 3 seconds in dev mode
			return new Promise((resolve) => {
				setTimeout(() => {
					isLoading = false;
					if (dev) {
						console.log("random latency:", randomLatency, "ms");
						console.log("pageData resolved:", page.data);
					}
					resolve(page.data);
				}, randomLatency);
			});
		} else {
			return page.data;
		}
	});
</script>

<svelte:head>
	{#if page.url.pathname !== "/"}
		<title>{name}</title>
	{/if}
</svelte:head>
<div {...props} class="viz-view-container" style={initStyle} data-view-name={name}>
	{#if page.url.pathname === "/"}
		{@render children()}
	{:else}
		{#await pageData}
			<LoadingContainer />
		{:then data}
			{#if data}
				{@render children()}
			{:else}
				<p>No data available</p>
			{/if}
		{:catch error}
			<p>Error loading data: {error.message}</p>
		{/await}
	{/if}
</div>

<style>
	.viz-view-container {
		white-space: wrap;
		display: flex;
		align-items: center;
		flex-direction: column;
		overflow-y: auto;
		max-width: 100%;
	}
</style>
