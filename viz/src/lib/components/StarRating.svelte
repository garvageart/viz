<script lang="ts">
	import MaterialIcon from "$lib/components/MaterialIcon.svelte";
	import IconButton from "./IconButton.svelte";

	interface Props {
		/**
		 * The current rating value (1-5).
		 */
		value: number | null;
		/**
		 * If true, the rating is read-only (display mode).
		 * @default false
		 */
		readonly?: boolean;
		/**
		 * Alias for readonly, for backward compatibility.
		 */
		static?: boolean;
		/**
		 * Callback when a rating is set.
		 * @param rating The new rating (1-5) or null if cleared.
		 */
		onChange?: (rating: number | null) => void;
	}

	let {
		value = $bindable(null),
		readonly = false,
		static: isStatic = false,
		onChange
	}: Props = $props();

	const isReadonly = $derived(readonly || isStatic);

	// Interaction state
	let hoverValue = $state<number | null>(null);
	let displayValue = $derived(hoverValue ?? value ?? 0);

	function handleSelect(star: number) {
		if (isReadonly) return;

		// if clicking the current value, clear it.
		const newValue = value === star ? 0 : star;

		if (onChange) {
			onChange(newValue);
		} else {
			value = newValue;
		}
	}

	function handleClear(e: MouseEvent) {
		e.stopPropagation();
		if (isReadonly) return;
		if (onChange) {
			onChange(0);
		} else {
			value = 0;
		}
	}
</script>

<div
	class="star-rating"
	class:readonly={isReadonly}
	class:interactive={!isReadonly}
	role={isReadonly ? "img" : "radiogroup"}
	aria-label="Star Rating"
	onmouseleave={() => {
		hoverValue = null;
	}}
>
	{#each { length: 5 } as _, i}
		{@const star = i + 1}
		{@const filled = star <= displayValue}

		{#if isReadonly}
			<div class="star-item static" class:filled>
				<MaterialIcon iconName="star" iconStyle={"sharp"} fill={filled} />
			</div>
		{:else}
			<button
				class="star-item interactive"
				class:filled
				type="button"
				aria-label={`Rate ${star} stars`}
				aria-pressed={value === star}
				onmouseenter={() => {
					hoverValue = star;
				}}
				onclick={() => handleSelect(star)}
			>
				<MaterialIcon iconName="star" iconStyle={"sharp"} fill={filled} />
			</button>
		{/if}
	{/each}

	{#if !isReadonly && value !== null && value !== 0}
		<IconButton
			iconName="close"
			variant="mini"
			aria-label="Clear rating"
			onclick={handleClear}
			class="clear-rating-btn"
			style="margin-left: 0.5rem;"
		/>
	{/if}
</div>

<style lang="scss">
	.star-rating {
		display: inline-flex;
		align-items: center;
		gap: 0.1em;
		color: var(--imag-text-color);

		&.readonly {
			pointer-events: none;
		}
	}

	.star-item {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: inherit;
		transition:
			color 0.15s ease,
			transform 0.1s ease;

		&.filled {
			color: var(--imag-text-color);
		}
	}

	.star-item.interactive {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		outline: none;

		&:hover {
			color: var(--imag-text-color);
		}

		&:focus-visible {
			color: var(--imag-text-color);
		}
	}
</style>
