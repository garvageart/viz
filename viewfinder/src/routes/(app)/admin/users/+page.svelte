<script lang="ts">
    import { invalidateAll } from "$app/navigation";
    import { type User, adminCreateUser, adminDeleteUser, adminUpdateUser } from "@viz/api";
    import { DateTime } from "luxon";
    import AdminRouteShell from "$lib/components/admin/AdminRouteShell.svelte";
    import ConfirmationModal from "$lib/components/modals/ConfirmationModal.svelte";
    import UserCreateModal from "$lib/components/modals/UserCreateModal.svelte";
    import UserEditModal from "$lib/components/modals/UserEditModal.svelte";
    import { modalsManager } from "$lib/components/modals/manager/ModalManager.svelte";
    import AvatarBadge from "$lib/components/ui/AvatarBadge.svelte";
    import Badge from "$lib/components/ui/Badge.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import SliderToggle from "$lib/components/ui/SliderToggle.svelte";
    import Table, { type TableColumn } from "$lib/components/ui/Table.svelte";
    import { user as currentUserState } from "$lib/states/index.svelte";
    import { toasts } from "$lib/toast-notifcations/toasts.svelte.js";

    let { data } = $props();
    let users = $derived(data.users);

    function formatDate(dateStr: string) {
        return DateTime.fromISO(dateStr).toLocaleString(DateTime.DATETIME_MED);
    }

    function openCreateModal() {
        modalsManager.open(
            UserCreateModal,
            {
                onSave: async (createForm) => {
                    if (!createForm.name || !createForm.email || !createForm.password) {
                        toasts.add({
                            message: "Please fill in all required fields",
                            type: "error"
                        });

                        return;
                    }

                    const res = await adminCreateUser({
                        name: createForm.name,
                        email: createForm.email,
                        password: createForm.password,
                        role: createForm.role
                    });

                    if (res.status === 201) {
                        users.push(res.data);
                        toasts.add({
                            message: "User created successfully",
                            type: "success"
                        });
                        invalidateAll();
                    } else {
                        toasts.add({
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
                    if (!editForm.name || !editForm.email) {
                        toasts.add({
                            message: "Please fill in all required fields",
                            type: "error"
                        });

                        return;
                    }

                    const res = await adminUpdateUser(user.uid, {
                        first_name: editForm.first_name,
                        last_name: editForm.last_name,
                        name: editForm.name,
                        email: editForm.email,
                        role: editForm.role
                    });

                    if (res.status === 200) {
                        users = users.map((u) => (u.uid === res.data.uid ? res.data : u));
                        toasts.add({
                            message: "User updated successfully",
                            type: "success"
                        });
                        invalidateAll();
                    } else {
                        toasts.add({
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
            toasts.add({
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
                        toasts.add({
                            message: "User deleted successfully",
                            type: "success"
                        });
                        invalidateAll();
                    } else {
                        toasts.add({
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

    const userColumns: TableColumn<User>[] = [
        { key: "user", header: "User" },
        { key: "email", header: "Email" },
        { key: "role", header: "Role" },
        { key: "created_at", header: "Joined" },
        { key: "actions", header: "Actions", align: "right" }
    ];
</script>

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
                <span class="warning-text">
                    <MaterialIcon iconName="warning" />
                    <span>
                        <strong>Warning:</strong> This will permanently delete the user's account, all their sessions, settings,
                        and onboarding status. This action cannot be undone.
                    </span>
                </span>
            {:else}
                <span class="info-text">
                    <MaterialIcon iconName="info" />
                    <span>
                        This will perform a soft delete. The user will be marked as deleted but data may remain in the
                        database.
                    </span>
                </span>
            {/if}
        </div>
    {/if}
{/snippet}

{#snippet usersRow(user: User)}
    <tr>
        <td>
            <div class="user-cell">
                <AvatarBadge {user} showCurrentUser={true} />
                <div class="user-info">
                    <span class="name"
                        >{user.name || "No Name"}
                        {user.uid === currentUserState.data?.uid ? "(You)" : ""}</span
                    >
                    <span class="uid" title={user.uid}>{user.uid}</span>
                </div>
            </div>
        </td>
        <td>{user.email}</td>
        <td>
            <Badge variant="info"><span>{user.role.toLocaleUpperCase()}</span></Badge>
        </td>
        <td>{formatDate(user.created_at)}</td>
        <td>
            <div class="actions-cell">
                <Button
                    iconName="person_edit"
                    grade={-25}
                    size="small"
                    class="action-btn edit"
                    onclick={() => openEditModal(user)}
                    title="Edit User"
                />
                <Button
                    iconName="person_remove"
                    grade={-25}
                    size="small"
                    class="action-btn delete"
                    onclick={() => openDeleteConfirm(user)}
                    title="Delete User"
                />
            </div>
        </td>
    </tr>
{/snippet}

<AdminRouteShell heading="User Management" description="Manage user accounts, roles, and permissions.">
    {#snippet actions()}
        <Button iconName="add" variant="info" onclick={openCreateModal}>
            <span>Create User</span>
        </Button>
    {/snippet}

    <section class="content-section">
        <div class="users-table-container">
            <Table data={users} columns={userColumns} rows={usersRow} emptyMessage="No users found." />
        </div>
    </section>
</AdminRouteShell>

<style lang="scss">
    .content-section {
        background-color: var(--viz-surface-panel);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        padding: var(--viz-spacing-xl);
    }

    .users-table-container {
        overflow-x: auto;
    }

    .users-table-container :global(.viz-table-container) {
        width: 100%;
        border: none;
        border-radius: 0;
        background: transparent;
        overflow: visible;
    }

    .users-table-container :global(.viz-table) {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--viz-font-size-lg);
    }

    .users-table-container :global(.viz-table tr) {
        transition: background-color 0.15s ease;
    }

    .users-table-container :global(.viz-table tr:hover) {
        background-color: var(--viz-surface-panel);
    }

    .users-table-container :global(.viz-table thead th) {
        text-align: left;
        padding: var(--viz-spacing-md) var(--viz-spacing-sm);
        color: var(--viz-text-secondary);
        font-weight: 600;
        font-size: var(--viz-font-size-std);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: var(--viz-border-thin);
    }

    .users-table-container :global(.viz-table thead th.align-right) {
        text-align: right;
    }

    .users-table-container :global(.viz-table td) {
        padding: var(--viz-spacing-md) var(--viz-spacing-sm);
        border-bottom: var(--viz-border-thin);
        vertical-align: middle;
    }

    .users-table-container :global(.viz-table tr:last-child td) {
        border-bottom: none;
    }

    .user-cell {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-std);
    }

    .user-info {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xxs);
    }

    .name {
        font-weight: 500;
        color: var(--viz-text-primary);
    }

    .uid {
        font-size: var(--viz-font-size-std);
        color: var(--viz-text-secondary);
        font-family: var(--viz-mono-font);
    }

    .actions-cell {
        display: flex;
        justify-content: flex-end;
        gap: var(--viz-spacing-sm);
    }

    .force-delete-option {
        margin: var(--viz-spacing-std) 0;
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
        padding: var(--viz-spacing-md);
        border-radius: var(--viz-border-radius-md);
        display: flex;
        align-items: flex-start;
        gap: var(--viz-spacing-sm);
        font-size: var(--viz-font-size-lg);
        margin: 0;
        line-height: 1.5;
        width: 100%;
    }

    .warning-text {
        color: var(--viz-text-primary);
        background-color: color-mix(in srgb, var(--viz-error-color) 12%, var(--viz-surface-card));
        border: 1px solid color-mix(in srgb, var(--viz-error-color) 25%, var(--viz-border-subtle));

        :global(.viz-material-icon) {
            color: var(--viz-error-color);
        }
    }

    .info-text {
        color: var(--viz-text-primary);
        background-color: color-mix(in srgb, var(--viz-info-color) 12%, var(--viz-surface-card));
        border: 1px solid color-mix(in srgb, var(--viz-info-color) 25%, var(--viz-border-subtle));

        :global(.viz-material-icon) {
            color: var(--viz-info-color);
        }
    }
</style>
