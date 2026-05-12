<script lang="ts">
	import Button from "$lib/components/Button.svelte";
	import InputText from "$lib/components/dom/InputText.svelte";
	import { modalsManager } from "../modals/manager/ModalManager.svelte";
	import { untrack } from "svelte";

	interface Props {
		id: string;
		initialName: string;
		onRename: (newName: string) => Promise<void>;
	}

	let { id, initialName, onRename }: Props = $props();

	let newName = $state(untrack(() => initialName));
	let loading = $state(false);

	async function handleRename() {
		loading = true;
		try {
			await onRename(newName);
			modalsManager.close(id);
		} finally {
			loading = false;
		}
	}

	function handleCancel() {
		modalsManager.dismiss(id, "cancel");
	}
</script>

<div class="rename-modal">
	<h2>Rename Session</h2>
	<p>Enter a new name for this session to help you identify it later.</p>
	<InputText label="Session Name" bind:value={newName} placeholder="e.g. Chrome on MacBook" />
	<div class="modal-actions">
		<Button hoverColor="var(--viz-80)" onclick={handleCancel}>Cancel</Button>
		<Button onclick={handleRename} disabled={loading}>
			{loading ? "Renaming..." : "Rename Session"}
		</Button>
	</div>
</div>

<style lang="scss">
	.rename-modal {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		color: var(--viz-text-color);
		width: 100%;

		h2 {
			margin: 0;
			font-size: 1.5rem;
		}

		p {
			color: var(--viz-40);
			margin: 0;
			font-size: 0.95rem;
		}
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		margin-top: 0.5rem;
	}
</style>
