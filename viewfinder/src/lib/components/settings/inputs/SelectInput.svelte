<script lang="ts">
	interface Props {
		label: string;
		value?: string;
		options?: string[];
		description?: string;
		disabled?: boolean;
		onchange?: (value: string) => void;
	}

	let {
		label,
		value = $bindable(""),
		options = [],
		description = "",
		disabled = false,
		onchange
	}: Props = $props();

	let selectedValue = $derived.by(() => {
		if (!value) {
			return "";
		}
		// If exact match exists, use it
		if (options.includes(value)) {
			return value;
		}
		// Otherwise try case-insensitive match
		const match = options.find((o) => o.toLowerCase() === value.toLowerCase());
		return match || value;
	});

	function handleChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		value = target.value;
		if (onchange) {
			onchange(value);
		}
	}
</script>

<div class="select-container" class:disabled>
	<div class="label-group">
		<label for="select-{label}" class="label">{label}</label>
		{#if description}
			<span class="description">{description}</span>
		{/if}
	</div>
	<select
		id="select-{label}"
		value={selectedValue}
		onchange={handleChange}
		{disabled}
		class="select-input"
	>
		{#each options as option}
			<option value={option}>{option}</option>
		{/each}
	</select>
</div>

<style lang="scss">
	.select-container {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--viz-spacing-std) 0; // UI Spacing Token
		border-bottom: 1px solid var(--viz-80);
		width: 100%;

		&.disabled {
			opacity: 0.5;
		}
	}

	.label-group {
		display: flex;
		flex-direction: column;
		gap: var(--viz-spacing-xs); // UI Spacing Token
	}

	.label {
		font-weight: 500;
		color: var(--viz-text-color);
	}

	.description {
		font-size: var(--viz-font-size-sm); // UI Typography Token
		color: var(--viz-text-color);
	}

	.select-input {
		padding: var(--viz-spacing-sm) 2rem var(--viz-spacing-sm) var(--viz-spacing-std); // UI Padding Tokens
		border-radius: 0; // Flat sharp corners aligned with redesign
		background-color: var(--viz-100);
		color: var(--viz-text-color);
		border: none;
		box-shadow: 0 -1px 0 var(--viz-60) inset; // Crisp border hairline
		outline: none;
		cursor: pointer;
		appearance: none;
		background-repeat: no-repeat;
		background-position: right var(--viz-spacing-md) center; // UI Spacing Token
		background-size: var(--viz-font-size-sm); // UI Typography Token
		font-family: var(--viz-display-font);
		min-height: 2.5rem; // Matched with InputText

		// Premium, high-contrast, scalable chevron SVG arrow (light/dark adaptive)
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23888888' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");

		&:hover:not(:disabled) {
			box-shadow: 0 -1px 0 var(--viz-40) inset;
		}

		&:focus {
			box-shadow: 0 -2px 0 var(--viz-primary) inset;
		}

		&:focus-visible {
			outline: 2px solid var(--viz-primary);
			outline-offset: 1px;
		}

		&:disabled {
			cursor: not-allowed;
		}
	}
</style>
