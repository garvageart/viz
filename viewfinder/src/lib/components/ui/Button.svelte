<script lang="ts">
	import type { HTMLButtonAttributes } from "svelte/elements";

	interface Props extends HTMLButtonAttributes {
		hoverColor?: string;
		variant?: "primary" | "small" | "mini";
		element?: HTMLButtonElement;
	}

	let {
		children,
		hoverColor = "var(--viz-80)",
		variant = "primary",
		element = $bindable(),
		...props
	}: Props = $props();
</script>

<button
	{...props}
	bind:this={element}
	class="{variant} {props.class || ''}"
	aria-label={props["aria-label"] ?? props.title}
	style:--button-hover-bg={hoverColor}
>
	{@render children?.()}
</button>

<style lang="scss">
	button {
		cursor: pointer;
		color: var(--viz-text-color);
		font-weight: 500;
		font-size: var(--viz-font-size-std);
		letter-spacing: 0.02em;
		height: max-content;
		background-color: var(--viz-90);
		border: var(--viz-border-thin);
		padding: var(--viz-spacing-sm) var(--viz-spacing-std);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-direction: row;
		text-align: center;
		position: relative;
		transition: background-color 150ms cubic-bezier(0.4, 0, 0.2, 1) 0ms, border-color 150ms ease;
		border-radius: var(--viz-border-radius-pill);
		outline: none;

		&:focus-visible {
			box-shadow: 0 0 0 2px var(--viz-bg-color), 0 0 0 4px var(--viz-primary);
		}

		&:disabled {
			cursor: not-allowed;
			opacity: 0.5;
			background-color: var(--viz-95);
			border-color: var(--viz-80);
		}

		&:hover:not(:disabled) {
			background-color: var(--button-hover-bg);
			border-color: var(--viz-70);
		}

		&:active:not(:disabled) {
			background-color: var(--viz-75);
		}

		&.small {
			font-size: var(--viz-font-size-sm);
			padding: var(--viz-spacing-xs) var(--viz-spacing-md);
		}

		&.mini {
			font-size: var(--viz-font-size-xs);
			padding: var(--viz-spacing-xxs) var(--viz-spacing-sm);
		}
	}

</style>
