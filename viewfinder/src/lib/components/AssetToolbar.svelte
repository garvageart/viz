<script lang="ts">
	import type { Snippet } from "svelte";
	import type { SvelteHTMLElements } from "svelte/elements";

	let {
		children,
		stickyToolbar = true,
		...props
	}: {
		children: Snippet;
		stickyToolbar?: boolean;
	} & SvelteHTMLElements["div"] = $props();
</script>

<div
	{...props}
	class="viz-toolbar-container {props.class ?? ''}"
	style={`${stickyToolbar === true ? "position: sticky; top: 0px;" : "position: relative;"} ${props.style ?? ""}`}
>
	{@render children?.()}
</div>

<style lang="scss">
	:global(:root) {
		/* expose toolbar height as a CSS variable for other components to use */
		--viz-toolbar-height: 4em;
	}

	.viz-toolbar-container {
		z-index: 99;
		padding: 0.4em 2em;
		background-color: var(--viz-100);
		backdrop-filter: blur(5px);
		border-bottom: 1px solid var(--viz-60);
		font-size: 0.8em;
		width: 100%;
		max-width: 100%;
		display: flex;
		align-items: center;
		flex-direction: row;
		box-sizing: border-box;
	}
</style>
