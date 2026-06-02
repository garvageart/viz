<script lang="ts">
	import { generateRandomString } from "$lib/utils/misc";
	import type { SvelteHTMLElements } from "svelte/elements";

	interface Props {
		label?: string;
		description?: string;
		disabled?: boolean;
		min?: number;
		max?: number;
		step?: number;
		showValue?: boolean;
		valueFormatter?: (val: number) => string;
	}

	let {
		value = $bindable(0),
		label,
		description,
		disabled = false,
		min = 0,
		max = 100,
		step = 1,
		showValue = false,
		valueFormatter = (val) => val.toString(),
		...props
	}: Props & Omit<SvelteHTMLElements["input"], "type"> = $props();

	const inputId = $derived(props.id ?? generateRandomString(6));
</script>

<div class="slider-container" class:disabled>
	<div class="slider-header">
		{#if label}
			<label for={inputId} class="slider-label"
				>{label}
				{#if props.required}
					<span class="required-asterisk">*</span>
				{/if}
			</label>
		{/if}
		{#if showValue}
			<span class="slider-value mono">{valueFormatter(value)}</span>
		{/if}
	</div>

	<input
		{...props}
		id={inputId}
		type="range"
		{min}
		{max}
		{step}
		{disabled}
		bind:value
		oninput={(e) => {
			props.oninput?.(e);
		}}
		onchange={(e) => {
			props.onchange?.(e);
		}}
	/>

	{#if description}
		<div class="slider-description">{description}</div>
	{/if}
</div>

<style lang="scss">
	.slider-container {
		display: flex;
		flex-direction: column;
		width: 100%;
		gap: var(--viz-spacing-xs);
		position: relative;

		&.disabled {
			opacity: 0.5;

			input {
				cursor: not-allowed;
			}
		}
	}

	.slider-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
	}

	.slider-label {
		font-family: var(--viz-display-font), sans-serif;
		font-size: var(--viz-font-size-sm);
		font-weight: 600;
		color: var(--viz-40);
	}

	.required-asterisk {
		color: var(--viz-error-color);
		margin-left: 2px;
	}

	.slider-value {
		font-family: var(--viz-mono-font), monospace;
		font-size: var(--viz-font-size-sm);
		font-weight: 800;
		color: var(--viz-text-color);
	}

	.slider-description {
		font-family: var(--viz-display-font), sans-serif;
		font-size: var(--viz-font-size-xs);
		color: var(--viz-60);
		padding-left: var(--viz-spacing-xxs);
	}

	input[type="range"] {
		width: 100%;
		height: 4px;
		background: var(--viz-90);
		border: var(--viz-border-thin);
		border-radius: 0; // Flat sharp track
		outline: none;
		-webkit-appearance: none;
		appearance: none;
		margin: var(--viz-spacing-sm) 0;

		&::-webkit-slider-runnable-track {
			width: 100%;
			height: 4px;
			background: transparent;
		}

		&::-webkit-slider-thumb {
			-webkit-appearance: none;
			appearance: none;
			width: 6px;
			height: 16px;
			background: var(--viz-text-color);
			border: 1px solid var(--viz-60);
			border-radius: 0; // Flat, sharp tick mark thumb
			cursor: ew-resize;
			margin-top: -6px; // Center vertically on track
			transition: background-color 0.1s, border-color 0.1s;

			&:hover {
				background: var(--viz-primary);
				border-color: var(--viz-primary);
			}
		}

		&::-moz-range-track {
			width: 100%;
			height: 4px;
			background: transparent;
		}

		&::-moz-range-thumb {
			width: 6px;
			height: 16px;
			background: var(--viz-text-color);
			border: 1px solid var(--viz-60);
			border-radius: 0;
			cursor: ew-resize;
			transition: background-color 0.1s, border-color 0.1s;

			&:hover {
				background: var(--viz-primary);
				border-color: var(--viz-primary);
			}
		}

		&:focus-visible {
			&::-webkit-slider-thumb {
				box-shadow: 0 0 0 2px var(--viz-100), 0 0 0 4px var(--viz-primary);
			}
			&::-moz-range-thumb {
				box-shadow: 0 0 0 2px var(--viz-100), 0 0 0 4px var(--viz-primary);
			}
		}
	}
</style>
