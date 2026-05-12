<script lang="ts">
	import Button from "$lib/components/Button.svelte";
	import type { Snippet } from "svelte";
	import { modalsManager } from "./manager/ModalManager.svelte";

	interface Props {
		id: string;
		title: string;
		children?: Snippet<[any]>;
		actions?: Snippet<[any]>;
		confirmText?: string;
		cancelText?: string;
		onConfirm?: () => void;
		onCancel?: () => void;
	}

	let {
		id,
		title,
		children,
		actions,
		confirmText = "Confirm",
		cancelText = "Cancel",
		onConfirm,
		onCancel
	}: Props = $props();

	function handleConfirm() {
		if (onConfirm) {
			onConfirm();
		}
		modalsManager.close(id, true);
	}

	function handleCancel() {
		if (onCancel) {
			onCancel();
		}

		modalsManager.dismiss(id, "cancel");
	}
</script>

<div class="confirmation-modal">
	<div class="confirmation-content">
		{#if children}
			{@render children({ id })}
		{/if}
	</div>

	<div class="confirm-actions">
		{#if actions}
			{@render actions({ id })}
		{:else}
			<Button onclick={handleCancel}>{cancelText}</Button>
			<Button
				class="onconfirm-btn"
				style="background-color: var(--viz-primary); color: var(--viz-10-dark);"
				onclick={handleConfirm}
			>
				{confirmText}
			</Button>
		{/if}
	</div>
</div>

<style lang="scss">
	.confirmation-modal {
		display: flex;
		flex-direction: column;
		width: 100%;
		color: var(--viz-text-color);

		.confirmation-content {
			display: flex;
			flex-direction: column;
			gap: 0.5rem;
		}

		.confirm-actions {
			display: flex;
			gap: 1rem;
			justify-content: flex-end;
			margin-top: 0.5rem;
		}
	}

	:global(.onconfirm-btn:hover) {
		background-color: var(--viz-secondary);
	}
</style>
