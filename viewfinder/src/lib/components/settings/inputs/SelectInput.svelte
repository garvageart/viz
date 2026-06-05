<script lang="ts">
	import InputSelect from "../../ui/InputSelect.svelte";

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

	// Case-insensitive match logic
	const selectedValue = $derived.by(() => {
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

	function handleChange(newValue: string) {
		value = newValue;
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
	<div class="select-wrapper">
		<InputSelect
			id="select-{label}"
			value={selectedValue}
			onchange={handleChange}
			disabled={disabled}
			options={options}
		/>
	</div>
</div>

<style lang="scss">
	.select-container {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--viz-spacing-std) 0;
		border-bottom: 1px solid var(--viz-80);
		width: 100%;
		gap: var(--viz-spacing-lg);

		&.disabled {
			opacity: 0.5;
		}
	}

	.label-group {
		display: flex;
		flex-direction: column;
		gap: var(--viz-spacing-xs);
		flex: 1;
		min-width: 0;
	}

	.label {
		font-weight: 500;
		color: var(--viz-text-color);
	}

	.description {
		font-size: var(--viz-font-size-sm);
		color: var(--viz-text-color);
	}

	.select-wrapper {
		width: 15rem;
		flex-shrink: 0;
	}
</style>
