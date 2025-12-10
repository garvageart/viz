<script lang="ts">
	import { toggleTheme, getTheme } from "$lib/states/index.svelte";
	import MaterialIcon from "$lib/components/MaterialIcon.svelte";

	let { children } = $props();
</script>

<button
	class="theme-toggle"
	onclick={() => toggleTheme()}
	title="Toggle Theme"
	aria-label="Toggle Theme"
>
	<MaterialIcon
		weight={300}
		iconName={getTheme() === "dark" ? "dark_mode" : "light_mode"}
		style="font-size: 1.5rem; color: var(--imag-100-light);"
	/>
</button>

{@render children()}

<style lang="scss">
	.theme-toggle {
		position: fixed;
		top: 1.5rem;
		right: 1.5rem;
		background: transparent;
		border: none;
		color: var(--imag-100-light);
		cursor: pointer;
		padding: 0.2rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background-color 0.2s;
		z-index: 1000;

		&:hover {
			background-color: var(--imag-90-dark);
		}
	}
</style>
