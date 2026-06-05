<script lang="ts">
	import type { User } from "$lib/api";
	import type { UserRole } from "$lib/types/users";
	import Button from "$lib/components/ui/Button.svelte";
	import InputText from "$lib/components/ui/InputText.svelte";
	import InputSelect from "$lib/components/ui/InputSelect.svelte";
	import { modalsManager } from "./manager/ModalManager.svelte";
	import { untrack } from "svelte";

	interface Props {
		id: string;
		user: User;
		onSave: (updatedData: any) => Promise<void>;
	}

	let { id, user, onSave }: Props = $props();

	let editForm = $state(
		untrack(() => ({
			first_name: user.first_name,
			last_name: user.last_name,
			name: user.name,
			email: user.email,
			role: user.role
		}))
	);

	async function handleSave() {
		await onSave(editForm);
		modalsManager.close(id);
	}

	function handleCancel() {
		modalsManager.dismiss(id, "cancel");
	}
</script>

<div class="user-modal">
	<h2>Edit User</h2>
	<InputText label="Name" bind:value={editForm.name} />
	<InputText label="Email" type="email" bind:value={editForm.email} />
	<div class="form-row">
		<InputText label="First Name" bind:value={editForm.first_name} />
		<InputText label="Last Name" bind:value={editForm.last_name} />
	</div>
	<InputSelect
		label="Role"
		bind:value={editForm.role}
		options={[
			{ value: "user", label: "User" },
			{ value: "admin", label: "Admin" },
			{ value: "superadmin", label: "Superadmin" },
			{ value: "guest", label: "Guest" }
		]}
	/>
	<div class="modal-actions">
		<Button hoverColor="var(--viz-80)" onclick={handleCancel}>Cancel</Button>
		<Button onclick={handleSave}>Save Changes</Button>
	</div>
</div>

<style lang="scss">
	.user-modal {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		color: var(--viz-text-color);
		width: 100%;

		h2 {
			margin: 0;
			font-size: 1.5rem;
		}
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		margin-top: 1rem;
	}
</style>
