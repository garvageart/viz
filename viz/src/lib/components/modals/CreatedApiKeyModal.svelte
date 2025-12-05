<script lang="ts">
	import { createApiKey } from "$lib/api";
	import { scopes, Scope } from "$lib/api/constants";
	import Button from "$lib/components/Button.svelte";
	import MaterialIcon from "$lib/components/MaterialIcon.svelte";
	import TextInput from "$lib/components/settings/inputs/TextInput.svelte";
	import { modal } from "$lib/states/index.svelte";
	import { toastState } from "$lib/toast-notifcations/notif-state.svelte";

	let { onClose, onSuccess }: { onClose: () => void; onSuccess: () => void } = $props();

	let name = $state("");
	let description = $state("");
	let creating = $state(false);
	let createdToken = $state<string | null>(null);

	let selectedScopes = $state<string[]>([Scope.FullAccess]); // Default to Full Access

	function toggleScope(scope: string) {
		if (scope === Scope.FullAccess) {
			// If selecting *, clear others or just ensure it's the only one needed (backend handles logic)
			// But for UI UX, if * is selected, maybe disable others or select all?
			// Let's just toggle it.
			if (selectedScopes.includes(Scope.FullAccess)) {
				selectedScopes = [];
			} else {
				selectedScopes = [Scope.FullAccess];
			}
		} else {
			// If * was selected, deselect it when picking specific scopes
			if (selectedScopes.includes(Scope.FullAccess)) {
				selectedScopes = selectedScopes.filter((s) => s !== Scope.FullAccess);
			}

			if (selectedScopes.includes(scope)) {
				selectedScopes = selectedScopes.filter((s) => s !== scope);
			} else {
				selectedScopes = [...selectedScopes, scope];
			}
		}
	}

	function isSelected(scope: string) {
		return selectedScopes.includes(scope);
	}

	async function handleCreate() {
		if (!name) {
			return;
		}

		if (selectedScopes.length === 0) {
			toastState.addToast({ message: "Please select at least one scope", type: "error" });
			return;
		}

		creating = true;
		try {
			const res = await createApiKey({
				name: name,
				description: description || null,
				scopes: selectedScopes
			});

			if (res.status === 201) {
				createdToken = res.data.consumer_key;
				onSuccess();
			} else {
				toastState.addToast({ message: res.data.error || "Failed to create API key", type: "error" });
			}
		} catch (e) {
			toastState.addToast({ message: "Error creating key", type: "error" });
		} finally {
			creating = false;
		}
	}

	function handleCopy() {
		if (createdToken) {
			navigator.clipboard.writeText(createdToken);
			toastState.addToast({
				message: "API Key copied to clipboard",
				type: "success",
				dismissible: true
			});
		}
	}

	function handleClose() {
		modal.show = false;
		onClose();
	}
</script>

<div class="created-key-modal-content">
	{#if createdToken}
		<h3>API Key Created</h3>
		<p>Please copy your new API Key. You won't be able to see it again!</p>
		<div class="key-display">
			<code>{createdToken}</code>
			<Button onclick={handleCopy}>
				<MaterialIcon iconName="content_copy" /> Copy
			</Button>
		</div>
		<div class="modal-actions">
			<Button onclick={handleClose}>Close</Button>
		</div>
	{:else}
		<h3>Create API Key</h3>
		<div class="form-content">
			<TextInput label="Name" bind:value={name} />
			<TextInput label="Description" bind:value={description} />

			<div class="scopes-section">
				<h4>Scopes</h4>
				<div class="scopes-list">
					{#each scopes as scope}
						<label class="scope-item">
							<input type="checkbox" checked={isSelected(scope.value)} onchange={() => toggleScope(scope.value)} />
							<div class="scope-info">
								<span class="scope-value">{scope.value}</span>
								<span class="scope-label">{scope.label}</span>
							</div>
						</label>
					{/each}
				</div>
			</div>
		</div>
		<div class="modal-actions">
			<Button hoverColor="var(--imag-80)" onclick={handleClose}>Cancel</Button>
			<Button onclick={handleCreate} disabled={creating || !name || selectedScopes.length === 0}>
				{creating ? "Creating..." : "Create Key"}
			</Button>
		</div>
	{/if}
</div>

<style lang="scss">
	.created-key-modal-content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
		width: 100%;
		max-height: 80vh; /* ensure it fits in modal */
	}

	.form-content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		overflow-y: auto;
	}

	.key-display {
		background-color: var(--imag-100);
		padding: 1rem;
		border-radius: 0.5rem;
		display: flex;
		justify-content: space-between;
		align-items: center;

		code {
			font-family: var(--imag-code-font);
			word-break: break-all;
			flex-grow: 1;
			margin-right: 0.5rem;
		}
	}

	.scopes-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;

		h4 {
			font-size: 0.9rem;
			font-weight: 600;
			color: var(--imag-text-color);
			margin: 0;
		}
	}

	.scopes-list {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
		max-height: 13rem;
		overflow-y: auto;
		border: 1px solid var(--imag-80);
		padding: 0.5rem;
		border-radius: 0.25rem;
	}

	.scope-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
		cursor: pointer;
		user-select: none;

		&:hover {
			background-color: var(--imag-100);
		}

		input[type="checkbox"] {
			accent-color: var(--imag-80);
			width: 1rem;
			height: 1rem;
		}
	}

	.scope-info {
		display: flex;
		flex-direction: column;
	}

	.scope-label {
		font-weight: 500;
	}

	.scope-value {
		color: var(--imag-10);
		font-size: 0.75rem;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 1rem;
	}
</style>
