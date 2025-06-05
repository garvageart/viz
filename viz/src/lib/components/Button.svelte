<script lang="ts">
	import type { HTMLButtonAttributes } from "svelte/elements";

	let { children, ...props }: HTMLButtonAttributes = $props();
</script>

<button {...props}>
	{@render children?.()}
</button>

<style lang="scss">
	button {
		color: var(--imag-text-colour);
		font-weight: 500;
		font-size: 1em;
		height: max-content;
		background-color: var(--imag-button-colour);
		border: none;
		margin: 0.5em;
		padding: 0.5em 1em;
		display: inline-block;
		text-align: center;
		position: relative;
		transition: background-color 150ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
		cursor: pointer;

		&:hover {
			background-color: #326595;
		}
	}
</style>
