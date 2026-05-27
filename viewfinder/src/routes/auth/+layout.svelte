<script lang="ts">
	import { toggleTheme, getTheme } from "$lib/states/index.svelte";
	import IconButton from "$lib/components/ui/IconButton.svelte";
	import { toggleFullscreen } from "$lib/utils/misc";

	let { children } = $props();
</script>

<IconButton
	class="fullscreen-toggle"
	iconName="fullscreen"
	hoverColor="var(--viz-70-light)"
	onclick={() => toggleFullscreen()}
	title="Toggle Fullscreen"
	aria-label="Toggle Fullscreen"
/>

<IconButton
	class="theme-toggle"
	iconName={getTheme() === "dark" ? "dark_mode" : "light_mode"}
	hoverColor="var(--viz-70-light)"
	onclick={() => toggleTheme()}
	title="Toggle Theme"
	aria-label="Toggle Theme"
/>

{@render children()}

<style lang="scss">
	:global(.theme-toggle) {
		position: fixed;
		top: 1.5rem;
		right: 1.5rem;
		background: transparent;
		color: var(--viz-100-light);
		z-index: 1;
	}

	:global(.fullscreen-toggle) {
		position: fixed;
		top: 1.5rem;
		left: 1.5rem;
		background: transparent;
		color: var(--viz-100-light);
		z-index: 1;
	}
</style>
