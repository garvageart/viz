<script lang="ts">
    import { invalidateAll } from "$app/navigation";
    import { adminCreateUser, adminDeleteUser, adminUpdateUser, Role, type User } from "$lib/api";
    import AdminRouteShell from "$lib/components/admin/AdminRouteShell.svelte";
    import ConfirmationModal from "$lib/components/modals/ConfirmationModal.svelte";
    import { modalsManager } from "$lib/components/modals/manager/ModalManager.svelte";
    import UserCreateModal from "$lib/components/modals/UserCreateModal.svelte";
    import UserEditModal from "$lib/components/modals/UserEditModal.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import IconButton from "$lib/components/ui/IconButton.svelte";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import SliderToggle from "$lib/components/ui/SliderToggle.svelte";
    import { user as currentUserState } from "$lib/states/index.svelte";
    import { toastState } from "$lib/toast-notifcations/notif-state.svelte";
    import { DateTime } from "luxon";

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
                        users.push(res.data);
                        toastState.addToast({
                            message: "User created successfully",
                            type: "success"
                        });
                        invalidateAll();
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
                        users = users.map((u) => (u.uid === res.data.uid ? res.data : u));
                        toastState.addToast({
                            message: "User updated successfully",
                            type: "success"
                        });
                        invalidateAll();
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
                        invalidateAll();
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

<AdminRouteShell heading="User Management" description="Manage user accounts, roles, and permissions.">
    {#snippet actions()}
        <Button variant="small" onclick={openCreateModal}>
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
                                    <div
                                        class={[
                                            "avatar-placeholder",
                                            user.uid === currentUserState.data?.uid ? "current-user" : ""
                                        ]}
                                    >
                                        {(user.name?.[0] || user.email?.[0] || "?").toUpperCase()}
                                    </div>
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
                                <span class="role-badge {user.role}">{user.role}</span>
                            </td>
                            <td>{formatDate(user.created_at)}</td>
                            <td>
                                <div class="actions-cell">
                                    <IconButton
                                        iconName="person_edit"
                                        grade={-25}
                                        variant="small"
                                        class="action-btn edit"
                                        onclick={() => openEditModal(user)}
                                        title="Edit User"
                                    />
                                    <IconButton
                                        iconName="person_remove"
                                        grade={-25}
                                        variant="small"
                                        class="action-btn delete"
                                        onclick={() => openDeleteConfirm(user)}
                                        title="Delete User"
                                    />
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
    .content-section {
        background-color: var(--viz-95);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        padding: var(--viz-spacing-xl);
    }

    .users-table-container {
        overflow-x: auto;
    }

    .users-table {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--viz-font-size-sm);

        tr {
            transition: background-color 0.15s ease;

            &:hover {
                background-color: var(--viz-90);
            }
        }

        th {
            text-align: left;
            padding: var(--viz-spacing-md) var(--viz-spacing-sm);
            color: var(--viz-40);
            font-weight: 600;
            font-size: var(--viz-font-size-xs);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: var(--viz-border-thin);
        }

        td {
            padding: var(--viz-spacing-md) var(--viz-spacing-sm);
            border-bottom: var(--viz-border-thin);
            vertical-align: middle;
        }

        tr:last-child td {
            border-bottom: none;
        }
    }

    .user-cell {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-sm);
    }

    .avatar-placeholder {
        width: 2rem;
        height: 2rem;
        background: var(--viz-90);
        color: var(--viz-text-color);
        border-radius: var(--viz-border-radius-pill);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: var(--viz-font-size-sm);
        border: var(--viz-border-thin);

        &.current-user {
            outline: 2px solid var(--viz-primary);
            outline-offset: 1px;
        }
    }

    .user-info {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xxs);
    }

    .name {
        font-weight: 500;
        color: var(--viz-text-color);
    }

    .uid {
        font-size: var(--viz-font-size-xs);
        color: var(--viz-40);
        font-family: var(--viz-mono-font);
    }

    .role-badge {
        display: inline-block;
        padding: var(--viz-spacing-xxs) var(--viz-spacing-sm);
        border-radius: var(--viz-border-radius-sm);
        font-size: var(--viz-font-size-xs);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;

        &.admin,
        &.superadmin {
            background: color-mix(in srgb, var(--viz-success-color) 12%, var(--viz-95));
            color: var(--viz-text-color);
            border: 1px solid color-mix(in srgb, var(--viz-success-color) 25%, var(--viz-60));
        }

        &.user {
            background: var(--viz-90);
            color: var(--viz-text-color);
            border: var(--viz-border-thin);
        }

        &.guest {
            background: var(--viz-95);
            color: var(--viz-40);
            border: var(--viz-border-thin);
        }
    }

    .actions-cell {
        display: flex;
        justify-content: flex-end;
        gap: var(--viz-spacing-sm);
    }

    .action-btn {
        color: var(--viz-40);
        transition: color 0.15s ease;

        &:hover {
            color: var(--viz-text-color);
        }

        &.delete:hover {
            color: var(--viz-error-color);
        }
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
        font-size: var(--viz-font-size-sm);
        margin: 0;
        line-height: 1.5;
        width: 100%;
    }

    .warning-text {
        color: var(--viz-text-color);
        background-color: color-mix(in srgb, var(--viz-error-color) 12%, var(--viz-95));
        border: 1px solid color-mix(in srgb, var(--viz-error-color) 25%, var(--viz-60));

        :global(.viz-material-icon) {
            color: var(--viz-error-color);
        }
    }

    .info-text {
        color: var(--viz-text-color);
        background-color: color-mix(in srgb, var(--viz-info-color) 12%, var(--viz-95));
        border: 1px solid color-mix(in srgb, var(--viz-info-color) 25%, var(--viz-60));

        :global(.viz-material-icon) {
            color: var(--viz-info-color);
        }
    }
</style>
