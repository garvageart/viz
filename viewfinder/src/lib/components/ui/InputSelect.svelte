<script lang="ts">
	import { generateKeyId } from "$lib/utils/layout";
	import type { HTMLSelectAttributes } from "svelte/elements";

	interface Props extends HTMLSelectAttributes {
		label?: string;
		labelPosition?: "top" | "side";
		description?: string;
		children?: import("svelte").Snippet;
		value?: string | number | string[];
	}

	let {
		label,
		labelPosition = "top",
		description,
		children,
		value = $bindable(),
		class: className,
		...props
	}: Props = $props();

	const fallbackId = generateKeyId();
	const selectId = $derived(props.id ?? fallbackId);
</script>

<div
	class="input-container"
	class:disabled={props.disabled}
	class:side-label={labelPosition === "side"}
>
	{#if label}
		<label for={selectId} class="input-label">
			{label}
			{#if props.required}
				<span class="required-asterisk">*</span>
			{/if}
		</label>
	{/if}
	<div class="input-wrapper">
		<select
			id={selectId}
			bind:value
			class="select-input {className || ''}"
			{...props}
		>
			{@render children?.()}
		</select>
	</div>
	{#if description}
		<div class="input-description">{description}</div>
	{/if}
</div>

<style lang="scss">
	.input-container {
		display: flex;
		flex-direction: column;
		min-width: 0%;
		position: relative;
		width: 100%;
		gap: var(--viz-spacing-sm); // UI Spacing Token

		&.side-label {
			flex-direction: row;
			align-items: center;

			.input-label {
				margin-right: var(--viz-spacing-sm); // UI Spacing Token
				margin-bottom: 0;
				white-space: nowrap;
			}
		}

		&.disabled {
			opacity: 0.5;

			select {
				cursor: not-allowed;
			}
		}
	}

	.input-wrapper {
		position: relative;
		width: 100%;
	}

	.input-label {
		font-size: var(--viz-font-size-sm); // UI Typography Token
		font-weight: 500;
		color: var(--viz-40);
	}

	.required-asterisk {
		color: var(--viz-error-color);
		margin-left: var(--viz-spacing-xxs); // UI Spacing Token
	}

	.input-description {
		font-size: var(--viz-font-size-xs); // UI Typography Token
		color: var(--viz-60);
		padding-left: var(--viz-spacing-sm); // UI Spacing Token
	}

	.select-input {
		width: 100%;
		max-width: 100%;
		min-height: 2.5rem; // Standard density height
		color: var(--viz-text-color);
		background-color: var(--viz-100);
		outline: none;
		border: none;
		box-shadow: 0 -1px 0 var(--viz-60) inset;
		font-family: var(--viz-display-font);
		font-size: 1rem;
		padding: var(--viz-spacing-sm) 2rem var(--viz-spacing-sm) var(--viz-spacing-std); // UI Padding Tokens
		cursor: pointer;
		appearance: none;
		background-repeat: no-repeat;
		background-position: right var(--viz-spacing-md) center; // UI Spacing Token
		background-size: var(--viz-font-size-sm); // UI Typography Token

		// Scalable high-contrast neutral chevron SVG arrow (light/dark adaptive)
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23888888' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");

		&:hover:not(:disabled) {
			box-shadow: 0 -1px 0 var(--viz-40) inset;
		}

		&:focus {
			background-color: var(--viz-100);
			box-shadow: 0 -2px 0 var(--viz-primary) inset;
		}

		&:focus-visible {
			outline: 2px solid var(--viz-primary);
			outline-offset: 1px;
		}
	}
</style>
