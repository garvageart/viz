<script lang="ts">
	import {
		adminDeleteUser,
		adminUpdateUser,
		adminCreateUser,
		type User
	} from "$lib/api";
	import Button from "$lib/components/Button.svelte";
	import MaterialIcon from "$lib/components/MaterialIcon.svelte";
	import ConfirmationModal from "$lib/components/modals/ConfirmationModal.svelte";
	import ModalContainer from "$lib/components/modals/ModalContainer.svelte";
	import InputSelect from "$lib/components/dom/InputSelect.svelte";
	import InputText from "$lib/components/dom/InputText.svelte";
	import SliderToggle from "$lib/components/SliderToggle.svelte";
	import { modal, user as currentUserState } from "$lib/states/index.svelte";
	import { toastState } from "$lib/toast-notifcations/notif-state.svelte";
	import type { UserRole } from "$lib/types/users.js";
	import { DateTime } from "luxon";
	import AdminRouteShell from "$lib/components/admin/AdminRouteShell.svelte";

	let { data } = $props();
	let users = $state(data.users);

	let showEditModal = $state(false);
	let editingUser = $state<User | null>(null);

	type EditForm = Omit<User, "uid" | "created_at" | "updated_at">;

	let editForm = $state<EditForm>({
		first_name: "",
		last_name: "",
		username: "",
		email: "",
		role: "user"
	});

	let showDeleteConfirm = $state(false);
	let deletingUser = $state<User | null>(null);
	let forceDeleteToggle = $state<"on" | "off">("off");
	let forceDelete = $derived(forceDeleteToggle === "off" ? false : true);

	let showCreateModal = $state(false);
	let creatingUser = $state(false);
	let createForm = $state({
		name: "",
		email: "",
		password: "",
		role: "user"
	});

	function formatDate(dateStr: string) {
		return DateTime.fromISO(dateStr).toFormat("dd MMM yyyy, HH:mm");
	}

	function openCreateModal() {
		createForm = {
			name: "",
			email: "",
			password: "",
			role: "user"
		};
		showCreateModal = true;
		modal.show = true;
	}

	function closeCreateModal() {
		showCreateModal = false;
		modal.show = false;
	}

	async function handleCreateUser() {
		if (!createForm.name || !createForm.email || !createForm.password) {
			toastState.addToast({
				message: "Please fill in all required fields",
				type: "error"
			});
			return;
		}

		creatingUser = true;
		try {
			const res = await adminCreateUser({
				name: createForm.name,
				email: createForm.email,
				password: createForm.password,
				role: createForm.role as UserRole
			});

			if (res.status === 201) {
				users = [...users, res.data];
				toastState.addToast({
					message: "User created successfully",
					type: "success"
				});
				closeCreateModal();
			} else {
				toastState.addToast({
					message: res.data.error || "Failed to create user",
					type: "error"
				});
			}
		} catch (e) {
			toastState.addToast({ message: "Error creating user", type: "error" });
		} finally {
			creatingUser = false;
		}
	}

	function openEditModal(user: User) {
		editingUser = user;
		editForm = {
			first_name: user.first_name,
			last_name: user.last_name,
			username: user.username,
			email: user.email,
			role: user.role
		};
		showEditModal = true;
		modal.show = true;
	}

	function closeEditModal() {
		showEditModal = false;
		modal.show = false;
		editingUser = null;
	}

	async function handleUpdateUser() {
		if (!editingUser) return;

		try {
			const res = await adminUpdateUser(editingUser.uid, {
				first_name: editForm.first_name,
				last_name: editForm.last_name,
				username: editForm.username,
				email: editForm.email,
				role: editForm.role as UserRole
			});

			if (res.status === 200) {
				// Update local list
				const idx = users.findIndex((u) => u.uid === res.data.uid);
				if (idx !== -1) {
					users[idx] = res.data;
				}
				toastState.addToast({
					message: "User updated successfully",
					type: "success"
				});
				closeEditModal();
			} else {
				toastState.addToast({
					message: res.data.error || "Failed to update user",
					type: "error"
				});
			}
		} catch (e) {
			toastState.addToast({ message: "Error updating user", type: "error" });
		}
	}

	function openDeleteConfirm(user: User) {
		if (user.uid === currentUserState.data?.uid) {
			toastState.addToast({
				message: "You cannot delete your own account",
				type: "warning"
			});
			return;
		}

		deletingUser = user;
		forceDelete = false;
		showDeleteConfirm = true;
		modal.show = true;
	}

	function closeDeleteConfirm() {
		showDeleteConfirm = false;
		modal.show = false;
		deletingUser = null;
	}

	async function handleDeleteUser() {
		if (!deletingUser) {
			return;
		}

		try {
			const res = await adminDeleteUser(deletingUser.uid, {
				force: forceDelete
			});

			if (res.status === 200) {
				users = users.filter((u) => u.uid !== deletingUser?.uid);
				toastState.addToast({
					message: "User deleted successfully",
					type: "success"
				});
				closeDeleteConfirm();
			} else {
				toastState.addToast({
					message: res.data.error || "Failed to delete user",
					type: "error"
				});
			}
		} catch (e) {
			toastState.addToast({ message: "Error deleting user", type: "error" });
		}
	}
</script>

<svelte:head>
	<title>Users - Admin</title>
</svelte:head>

<AdminRouteShell
	heading="User Management"
	description="Manage user accounts, roles, and permissions."
>
	{#snippet actions()}
		<Button variant="mini" onclick={openCreateModal}>
			<MaterialIcon iconName="add" />
			Create User
		</Button>
	{/snippet}

	<section class="content-section">
		<div class="users-table-container">
			<table class="users-table">
				<thead>
					<tr>
						<th>User</th>
						<th>Email</th>
						<th>Role</th>
						<th>Joined</th>
						<th style="text-align: right;">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each users as user}
						<tr>
							<td>
								<div class="user-cell">
									<div class="avatar-placeholder">
										{(
											user.username?.[0] ||
											user.email?.[0] ||
											"?"
										).toUpperCase()}
									</div>
									<div class="user-info">
										<span class="username"
											>{user.username || "No Username"}</span
										>
										<span class="uid" title={user.uid}>{user.uid}</span>
									</div>
								</div>
							</td>
							<td>{user.email}</td>
							<td>
								<span class="role-badge {user.role}">{user.role}</span>
							</td>
							<td>{formatDate(user.created_at)}</td>
							<td>
								<div class="actions-cell">
									<button
										class="action-btn edit"
										onclick={() => openEditModal(user)}
										title="Edit User"
									>
										<MaterialIcon iconName="edit" fill={true} />
									</button>
									<button
										class="action-btn delete"
										onclick={() => openDeleteConfirm(user)}
										title="Delete User"
									>
										<MaterialIcon iconName="delete" />
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
</AdminRouteShell>

{#if showEditModal && modal.show}
	<ModalContainer>
		<div class="user-modal">
			<h2>Edit User</h2>
			<InputText label="Username" bind:value={editForm.username} />
			<InputText label="Email" type="email" bind:value={editForm.email} />
			<div class="form-row">
				<InputText label="First Name" bind:value={editForm.first_name} />
				<InputText label="Last Name" bind:value={editForm.last_name} />
			</div>
			<InputSelect label="Role" bind:value={editForm.role}>
				<option value="user">User</option>
				<option value="admin">Admin</option>
				<option value="superadmin">Superadmin</option>
				<option value="guest">Guest</option>
			</InputSelect>
			<div class="modal-actions">
				<Button hoverColor="var(--imag-80)" onclick={closeEditModal}
					>Cancel</Button
				>
				<Button onclick={handleUpdateUser}>Save Changes</Button>
			</div>
		</div>
	</ModalContainer>
{/if}

{#if showCreateModal && modal.show}
	<ModalContainer>
		<div class="user-modal">
			<h2>Create User</h2>
			<InputText label="Username" bind:value={createForm.name} />
			<InputText label="Email" type="email" bind:value={createForm.email} />
			<InputText
				label="Password"
				type="password"
				bind:value={createForm.password}
			/>
			<InputSelect label="Role" bind:value={createForm.role}>
				<option value="user">User</option>
				<option value="admin">Admin</option>
				<option value="superadmin">Superadmin</option>
				<option value="guest">Guest</option>
			</InputSelect>
			<div class="modal-actions">
				<Button hoverColor="var(--imag-80)" onclick={closeCreateModal}
					>Cancel</Button
				>
				<Button onclick={handleCreateUser} disabled={creatingUser}>
					{creatingUser ? "Creating..." : "Create User"}
				</Button>
			</div>
		</div>
	</ModalContainer>
{/if}

{#if showDeleteConfirm && modal.show}
	<ConfirmationModal
		title="Delete User"
		confirmText={forceDelete ? "Force Delete User" : "Delete User"}
		onConfirm={handleDeleteUser}
		onCancel={closeDeleteConfirm}
	>
		<span>
			Are you sure you want to delete user <strong
				>{deletingUser?.username}</strong
			>?
		</span>

		<div class="force-delete-option">
			<SliderToggle label="Force Delete" bind:value={forceDeleteToggle} />
		</div>

		<div class="message-container">
			{#if forceDelete}
				<p class="warning-text">
					<MaterialIcon iconName="warning" />
					<span>
						<strong>Warning:</strong> This will permanently delete the user's account,
						all their sessions, settings, and onboarding status. This action cannot
						be undone.
					</span>
				</p>
			{:else}
				<p class="info-text">
					<MaterialIcon iconName="info" />
					<span>
						This will perform a soft delete. The user will be marked as deleted
						but data may remain in the database.
					</span>
				</p>
			{/if}
		</div>
	</ConfirmationModal>
{/if}

<style lang="scss">
	.header-actions {
		display: flex;
		gap: 0.75rem;
		margin: 1rem 0;
	}

	.content-section {
		background: var(--imag-100);
		border-radius: 0.75rem;
		padding: 1.5rem;
		border: 1px solid var(--imag-90);
	}

	.users-table-container {
		overflow-x: auto;
	}

	.users-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;

		th {
			text-align: left;
			padding: 1rem;
			color: var(--imag-40);
			font-weight: 600;
			border-bottom: 1px solid var(--imag-80);
		}

		td {
			padding: 1rem;
			border-bottom: 1px solid var(--imag-90);
			vertical-align: middle;
		}

		tr:last-child td {
			border-bottom: none;
		}
	}

	.user-cell {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.avatar-placeholder {
		width: 2rem;
		height: 2rem;
		background: var(--imag-80);
		color: var(--imag-text-color);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 0.9rem;
	}

	.user-info {
		display: flex;
		flex-direction: column;
	}

	.username {
		font-weight: 500;
	}

	.uid {
		font-size: 0.75rem;
		color: var(--imag-40);
		font-family: var(--imag-code-font);
	}

	.role-badge {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;

		&.admin,
		&.superadmin {
			background: rgba(16, 185, 129, 0.1);
			color: #10b981;
		}

		&.user {
			background: var(--imag-90);
			color: var(--imag-text-color);
		}

		&.guest {
			background: var(--imag-90);
			color: var(--imag-40);
		}
	}

	.actions-cell {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
	}

	.action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border: none;
		background: transparent;
		border-radius: 0.25rem;
		cursor: pointer;
		color: var(--imag-40);
		transition: all 0.2s;

		&:hover {
			background: var(--imag-90);
			color: var(--imag-text-color);
		}

		&.delete:hover {
			background-color: #ef4444;
		}
	}

	.user-modal {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		color: var(--imag-text-color);
		width: 80%;

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

	.force-delete-option {
		margin: 1rem 0;
		display: flex;
		align-items: center;
	}

	.message-container {
		min-height: 5.5rem; /* Reserve vertical space to prevent shifts */
		display: flex;
		align-items: flex-start;
	}

	.warning-text,
	.info-text {
		padding: 0.75rem;
		border-radius: 0.5rem;
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		font-size: 0.9rem;
		margin: 0;
		line-height: 1.4;
		width: 100%;
	}

	.warning-text {
		color: #ef4444;
		background: rgba(239, 68, 68, 0.1);
	}

	.info-text {
		color: var(--imag-text-color);
		background: var(--imag-90);
	}
</style>
