<script lang="ts">
    import { adminDeleteUser, adminUpdateUser, adminCreateUser, type User, Role } from "$lib/api";
    import Button from "$lib/components/ui/Button.svelte";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import ConfirmationModal from "$lib/components/modals/ConfirmationModal.svelte";
    import SliderToggle from "$lib/components/ui/SliderToggle.svelte";
    import { user as currentUserState } from "$lib/states/index.svelte";
    import { toastState } from "$lib/toast-notifcations/notif-state.svelte";
    import type { UserRole } from "$lib/types/users.js";
    import { DateTime } from "luxon";
    import AdminRouteShell from "$lib/components/admin/AdminRouteShell.svelte";
    import { modalsManager } from "$lib/components/modals/manager/ModalManager.svelte";
    import UserCreateModal from "$lib/components/modals/UserCreateModal.svelte";
    import UserEditModal from "$lib/components/modals/UserEditModal.svelte";

    let { data } = $props();
    let users = $derived(data.users);

    $effect(() => {
        users = data.users;
    });

    function formatDate(dateStr: string) {
        return DateTime.fromISO(dateStr).toFormat("dd MMM yyyy, HH:mm");
    }

    function openCreateModal() {
        modalsManager.open(
            UserCreateModal,
            {
                onSave: async (createForm) => {
                    if (!createForm.name || !createForm.email || !createForm.password) {
                        toastState.addToast({
                            message: "Please fill in all required fields",
                            type: "error"
                        });
                        throw new Error("Validation failed");
                    }

                    const res = await adminCreateUser({
                        name: createForm.name,
                        email: createForm.email,
                        password: createForm.password,
                        role: createForm.role as Role
                    });

                    if (res.status === 201) {
                        users = [...users, res.data];
                        toastState.addToast({
                            message: "User created successfully",
                            type: "success"
                        });
                    } else {
                        toastState.addToast({
                            message: res.data.error || "Failed to create user",
                            type: "error"
                        });
                        throw new Error(res.data.error);
                    }
                }
            },
            { heading: "Create User" }
        );
    }

    function openEditModal(user: User) {
        modalsManager.open(
            UserEditModal,
            {
                user,
                onSave: async (editForm) => {
                    const res = await adminUpdateUser(user.uid, {
                        first_name: editForm.first_name,
                        last_name: editForm.last_name,
                        name: editForm.name,
                        email: editForm.email,
                        role: editForm.role as Role
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
                    } else {
                        toastState.addToast({
                            message: res.data.error || "Failed to update user",
                            type: "error"
                        });
                        throw new Error(res.data.error);
                    }
                }
            },
            { heading: "Edit User" }
        );
    }

    // State for delete modal
    let userToDelete = $state<User | null>(null);
    let forceDeleteToggle = $state<"on" | "off">("off");
    let forceDelete = $derived(forceDeleteToggle === "on");

    function openDeleteConfirm(user: User) {
        if (user.uid === currentUserState.data?.uid) {
            toastState.addToast({
                message: "You cannot delete your own account",
                type: "warning"
            });
            return;
        }

        userToDelete = user;
        forceDeleteToggle = "off";

        modalsManager.open(
            ConfirmationModal,
            {
                title: "Delete User",
                get confirmText() {
                    return forceDelete ? "Force Delete User" : "Delete User";
                },
                onConfirm: async () => {
                    if (!userToDelete) {
                        return;
                    }
                    const res = await adminDeleteUser(userToDelete.uid, {
                        force: forceDelete
                    });

                    if (res.status === 200) {
                        users = users.filter((u) => u.uid !== userToDelete?.uid);
                        toastState.addToast({
                            message: "User deleted successfully",
                            type: "success"
                        });
                    } else {
                        toastState.addToast({
                            message: res.data.error || "Failed to delete user",
                            type: "error"
                        });
                    }
                },
                children: deleteConfirmSnippet
            },
            { heading: "Delete User" }
        );
    }
</script>

<svelte:head>
    <title>Users - Admin</title>
</svelte:head>

{#snippet deleteConfirmSnippet()}
    {#if userToDelete}
        <span>
            Are you sure you want to delete user <strong>{userToDelete.name}</strong>?
        </span>

        <div class="force-delete-option">
            <SliderToggle label="Force Delete" bind:value={forceDeleteToggle} />
        </div>

        <div class="message-container">
            {#if forceDelete}
                <p class="warning-text">
                    <MaterialIcon iconName="warning" />
                    <span>
                        <strong>Warning:</strong> This will permanently delete the user's account, all
                        their sessions, settings, and onboarding status. This action cannot be undone.
                    </span>
                </p>
            {:else}
                <p class="info-text">
                    <MaterialIcon iconName="info" />
                    <span>
                        This will perform a soft delete. The user will be marked as deleted but data
                        may remain in the database.
                    </span>
                </p>
            {/if}
        </div>
    {/if}
{/snippet}

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
                                        {(user.name?.[0] || user.email?.[0] || "?").toUpperCase()}
                                    </div>
                                    <div class="user-info">
                                        <span class="name">{user.name || "No Name"}</span>
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

<style lang="scss">
    .header-actions {
        display: flex;
        gap: 0.75rem;
        margin: 1rem 0;
    }

    .content-section {
        background: var(--viz-100);
        border-radius: 0.75rem;
        padding: 1.5rem;
        border: 1px solid var(--viz-90);
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
            color: var(--viz-40);
            font-weight: 600;
            border-bottom: 1px solid var(--viz-80);
        }

        td {
            padding: 1rem;
            border-bottom: 1px solid var(--viz-90);
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
        background: var(--viz-80);
        color: var(--viz-text-color);
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

    .name {
        font-weight: 500;
    }

    .uid {
        font-size: 0.75rem;
        color: var(--viz-40);
        font-family: var(--viz-mono-font);
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
            background: var(--viz-90);
            color: var(--viz-text-color);
        }

        &.guest {
            background: var(--viz-90);
            color: var(--viz-40);
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
        color: var(--viz-40);
        transition: all 0.2s;

        &:hover {
            background: var(--viz-90);
            color: var(--viz-text-color);
        }

        &.delete:hover {
            background-color: #ef4444;
        }
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
        color: var(--viz-text-color);
        background: var(--viz-90);
    }
</style>
