<script lang="ts">
	import { toastState } from "$lib/toast-notifcations/notif-state.svelte";

	interface Props {
		label: string;
		value?: string;
		description?: string;
		disabled?: boolean;
		onchange?: (value: string) => void;
	}

	let {
		label,
		value = $bindable(""),
		description = "",
		disabled = false,
		onchange
	}: Props = $props();

	let error = $state<string | null>(null);

	function JSONValidate(event: Event) {
		const target = event.target as HTMLTextAreaElement;
		const newValue = target.value;

		try {
			JSON.parse(newValue);
			value = newValue;
			if (onchange) {
				onchange(newValue);
			}
		} catch (e) {
			toastState.addToast({
				dismissible: true,
				message: "Invalid JSON",
				type: "error"
			});
		}
	}
</script>

<div class="json-container" class:disabled>
	<div class="header">
		<div class="label-group">
			<label for="json-{label}" class="label">{label}</label>
			{#if description}
				<span class="description">{description}</span>
			{/if}
		</div>
	</div>

	<textarea
		id="json-{label}"
		{value}
		onblur={JSONValidate}
		{disabled}
		class="json-input"
		class:error={!!error}
		rows="5"
	></textarea>
</div>

<style lang="scss">
	.json-container {
		display: flex;
		flex-direction: column;
		padding: 1rem 0;
		border-bottom: 1px solid var(--viz-80);
		width: 100%;
		gap: 0.5rem;
		max-height: 10rem;

		&.disabled {
			opacity: 0.5;
		}
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.label-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.label {
		font-weight: 500;
		color: var(--viz-text-color);
	}

	.description {
		font-size: 0.875rem;
		color: var(--viz-40);
	}

	.json-input {
		width: 100%;
		padding: 0.5rem;
		border-radius: 0.375rem;
		background-color: var(--viz-100);
		color: var(--viz-text-color);
		border: 1px solid var(--viz-80);
		outline: none;
		font-family: var(--viz-code-font);
		resize: vertical;

		&:focus {
			border-color: var(--viz-70);
		}

		&.error {
			border-color: var(--viz-error-color);
		}

		&:disabled {
			cursor: not-allowed;
		}
	}
</style>
