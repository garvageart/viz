<script lang="ts">
	import Button from "$lib/components/Button.svelte";
	import ModalContainer from "./ModalContainer.svelte";
	import type { Snippet } from "svelte";

	interface Props {
		title: string;
		children?: Snippet;
		actions?: Snippet;
		confirmText?: string;
		cancelText?: string;
		onConfirm?: () => void;
		onCancel?: () => void;
	}

	let {
		title,
		children,
		actions,
		confirmText = "Confirm",
		cancelText = "Cancel",
		onConfirm,
		onCancel
	}: Props = $props();
</script>

<ModalContainer heading={title}>
	<div class="confirmation-modal">
		<div class="confirmation-content">
			{#if children}
				{@render children()}
			{/if}
		</div>

		<div class="confirm-actions">
			{#if actions}
				{@render actions()}
			{:else}
				<Button onclick={onCancel}>{cancelText}</Button>
				<Button
					class="onconfirm-btn"
					style="background-color: var(--viz-primary); color: var(--viz-10-dark);"
					onclick={onConfirm}
				>
					{confirmText}
				</Button>
			{/if}
		</div>
	</div>
</ModalContainer>

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
