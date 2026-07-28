<script lang="ts">
    import { DateTime } from "luxon";
    import {
        type ApiKey,
        type Session,
        deleteApiKey,
        deleteSession,
        getCurrentSession,
        getSessions,
        listApiKeys,
        updateSession
    } from "$lib/api";
    import ConfirmationModal from "$lib/components/modals/ConfirmationModal.svelte";
    import CreatedApiKeyModal from "$lib/components/modals/CreatedApiKeyModal.svelte";
    import Badge from "$lib/components/ui/Badge.svelte";
    import IconButton from "$lib/components/ui/IconButton.svelte";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import { toastState } from "$lib/toast-notifcations/notif-state.svelte";
    import { modalsManager } from "../modals/manager/ModalManager.svelte";
    import RenameSessionModal from "./RenameSessionModal.svelte";

    interface ExtendedSession extends Session {
        is_current?: boolean;
        browser?: string;
        os?: string;
        ip_address?: string;
        last_active_at?: string;
    }

    let sessions = $state<ExtendedSession[]>([]);
    let apiKeys = $state<ApiKey[]>([]);
    let loading = $state(true);

    // Key deletion state
    let deletingKey = $state<ApiKey | null>(null);

    // Session management state
    let revokingSession = $state<ExtendedSession | null>(null);

    function getBrowser(ua?: string) {
        if (!ua) {
            return "Unknown Browser";
        }
        if (ua.includes("Firefox")) {
            return "Firefox";
        }
        if (ua.includes("Edg")) {
            return "Edge";
        }
        if (ua.includes("Chrome")) {
            return "Chrome";
        }
        if (ua.includes("Safari")) {
            return "Safari";
        }
        return "Unknown Browser";
    }

    function getOS(ua?: string) {
        if (!ua) {
            return "Unknown OS";
        }
        if (ua.includes("Windows")) {
            return "Windows";
        }
        if (ua.includes("Mac OS")) {
            return "macOS";
        }
        if (ua.includes("Linux")) {
            return "Linux";
        }
        if (ua.includes("Android")) {
            return "Android";
        }
        if (ua.includes("iOS")) {
            return "iOS";
        }
        return "Unknown OS";
    }

    async function loadData() {
        loading = true;
        try {
            const [sessionsRes, apiKeysRes, currentRes] = await Promise.all([
                getSessions(),
                listApiKeys(),
                getCurrentSession()
            ]);

            const currentUid = currentRes.status === 200 ? currentRes.data.uid : null;

            if (sessionsRes.status === 200) {
                sessions = sessionsRes.data.map((s) => ({
                    ...s,
                    is_current: s.uid === currentUid,
                    browser: getBrowser(s.user_agent),
                    os: getOS(s.user_agent),
                    ip_address: s.client_ip,
                    last_active_at: s.last_active
                }));
            }

            if (apiKeysRes.status === 200) {
                apiKeys = apiKeysRes.data.items;
            }
        } catch (e) {
            toastState.addToast({
                message: "Error loading security settings",
                type: "error"
            });
        } finally {
            loading = false;
        }
    }

    loadData();

    function formatDate(dateStr?: string) {
        if (!dateStr) {
            return "Never";
        }
        return DateTime.fromISO(dateStr).toRelative();
    }

    function openApiKeyModal() {
        modalsManager.open(
            CreatedApiKeyModal,
            {
                onClose: () => {},
                onSuccess: loadData
            },
            { heading: "Create API Key" }
        );
    }

    function openDeleteKeyConfirm(key: ApiKey) {
        deletingKey = key;
        modalsManager.open(
            ConfirmationModal,
            {
                title: "Delete API Key",
                confirmText: "Delete Key",
                onConfirm: handleDeleteKey,
                children: deleteKeySnippet
            },
            { heading: "Delete API Key" }
        );
    }

    async function handleDeleteKey() {
        if (!deletingKey) {
            return;
        }

        try {
            const res = await deleteApiKey(deletingKey.uid);
            if (res.status === 200) {
                apiKeys = apiKeys.filter((k) => k.uid !== deletingKey?.uid);
                toastState.addToast({
                    message: "API Key deleted successfully",
                    type: "success"
                });
            } else {
                toastState.addToast({
                    message: "Failed to delete API key",
                    type: "error"
                });
            }
        } catch (e) {
            toastState.addToast({ message: "Error deleting key", type: "error" });
        } finally {
            deletingKey = null;
        }
    }

    function openRenameSessionModal(session: ExtendedSession) {
        modalsManager.open(
            RenameSessionModal,
            {
                initialName: session.client_name || "",
                onRename: async (newName) => {
                    const res = await updateSession(session.uid, {
                        clientName: newName
                    });

                    if (res.status === 200) {
                        sessions = sessions.map((s) =>
                            s.uid === session.uid
                                ? {
                                      ...res.data,
                                      is_current: s.is_current,
                                      browser: s.browser,
                                      os: s.os,
                                      ip_address: res.data.client_ip,
                                      last_active_at: res.data.last_active
                                  }
                                : s
                        );

                        toastState.addToast({
                            message: "Session renamed successfully",
                            type: "success"
                        });
                    } else {
                        toastState.addToast({
                            message: "Failed to rename session",
                            type: "error"
                        });
                        throw new Error("Failed to rename");
                    }
                }
            },
            { heading: "Rename Session" }
        );
    }

    function openRevokeConfirm(session: ExtendedSession) {
        revokingSession = session;
        modalsManager.open(
            ConfirmationModal,
            {
                title: "Revoke Session",
                confirmText: "Revoke Session",
                onConfirm: handleRevokeSession,
                children: revokeSessionSnippet
            },
            { heading: "Revoke Session" }
        );
    }

    async function handleRevokeSession() {
        if (!revokingSession) {
            return;
        }

        try {
            const res = await deleteSession(revokingSession.uid);
            if (res.status === 200) {
                sessions = sessions.filter((s) => s.uid !== revokingSession?.uid);
                toastState.addToast({
                    message: "Session revoked successfully",
                    type: "success"
                });
            } else {
                toastState.addToast({
                    message: "Failed to revoke session",
                    type: "error"
                });
            }
        } catch (e) {
            toastState.addToast({ message: "Error revoking session", type: "error" });
        } finally {
            revokingSession = null;
        }
    }
</script>

{#snippet deleteKeySnippet()}
    {#if deletingKey}
        <span>
            Are you sure you want to delete the API key <strong>{deletingKey.name}</strong>? Any applications using this
            key will lose access immediately.
        </span>
    {/if}
{/snippet}

{#snippet revokeSessionSnippet()}
    <span> Are you sure you want to revoke this session? You will be logged out on that device. </span>
{/snippet}

<div class="security-settings">
    <section class="settings-section">
        <div class="section-header">
            <div class="header-info">
                <h3>API Keys</h3>
                <span>Personal access tokens for API access.</span>
            </div>
            <IconButton variant="info" iconName="add" onclick={openApiKeyModal}><span>Create New Key</span></IconButton>
        </div>

        <div class="keys-list">
            {#if loading}
                <div class="loading-state">Loading...</div>
            {:else}
                <div class="table-container">
                    <table class="settings-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Created</th>
                                <th>Last Used</th>
                                <th class="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each apiKeys as key}
                                <tr>
                                    <td>
                                        <div class="key-info">
                                            <span class="name">{key.name}</span>
                                            {#if key.description}
                                                <span class="description">{key.description}</span>
                                            {/if}
                                        </div>
                                    </td>
                                    <td class="mono-text">{formatDate(key.created_at)}</td>
                                    <td class="mono-text"
                                        >{key.last_used_at ? formatDate(key.last_used_at) : "Never"}</td
                                    >
                                    <td>
                                        <div class="actions-cell">
                                            <button
                                                class="action-btn delete"
                                                onclick={() => openDeleteKeyConfirm(key)}
                                                title="Delete Key"
                                            >
                                                <MaterialIcon iconName="delete" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            {/each}
                            {#if apiKeys.length === 0}
                                <tr>
                                    <td colspan="4" class="empty-row">No API keys created yet.</td>
                                </tr>
                            {/if}
                        </tbody>
                    </table>
                </div>
            {/if}
        </div>
    </section>

    <section class="settings-section">
        <div class="section-header">
            <div class="header-info">
                <h3>Active Sessions</h3>
                <span>Devices that are currently logged into your account.</span>
            </div>
        </div>

        <div class="sessions-list">
            {#if loading}
                <div class="loading-state">Loading...</div>
            {:else}
                <div class="table-container">
                    <table class="settings-table">
                        <thead>
                            <tr>
                                <th>Device / Browser</th>
                                <th>Last Active</th>
                                <th class="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each sessions as session}
                                <tr>
                                    <td>
                                        <div class="session-info">
                                            <div class="session-main">
                                                <span class="name"
                                                    >{session.client_name ||
                                                        `${session.browser} on ${session.os}`}</span
                                                >
                                                {#if session.is_current}
                                                    <Badge variant="success" size="small" weight="regular"
                                                        >Current</Badge
                                                    >
                                                {/if}
                                            </div>
                                            <span class="details">
                                                <span class="mono-text">{session.ip_address}</span>
                                            </span>
                                        </div>
                                    </td>
                                    <td class="mono-text">{formatDate(session.last_active_at)}</td>
                                    <td>
                                        <div class="actions-cell">
                                            <button
                                                class="action-btn"
                                                onclick={() => openRenameSessionModal(session)}
                                                title="Rename Session"
                                            >
                                                <MaterialIcon iconName="edit" />
                                            </button>
                                            {#if !session.is_current}
                                                <button
                                                    class="action-btn revoke"
                                                    onclick={() => openRevokeConfirm(session)}
                                                    title="Revoke Session"
                                                >
                                                    <MaterialIcon iconName="logout" />
                                                </button>
                                            {/if}
                                        </div>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {/if}
        </div>
    </section>
</div>

<style lang="scss">
    .security-settings {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xxl);
        width: 100%;
    }

    .settings-section {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-md);
        width: 100%;
    }

    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding-bottom: var(--viz-spacing-sm);
        border-bottom: var(--viz-border-thin);

        .header-info {
            gap: var(--viz-spacing-sm);

            h3 {
                margin: 0;
                font-size: 1.25rem;
                font-weight: 600;
                color: var(--viz-text-primary);
            }

            span {
                font-size: var(--viz-font-size-lg);
                color: var(--viz-text-secondary);
            }
        }
    }

    .table-container {
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        overflow: hidden;
        width: 100%;
        background-color: var(--viz-surface-panel);
    }

    .settings-table {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--viz-font-size-lg);

        th {
            text-align: left;
            padding: var(--viz-spacing-md) var(--viz-spacing-std);
            color: var(--viz-text-secondary);
            font-weight: 600;
            font-size: var(--viz-font-size-std);
            text-transform: uppercase;
            border-bottom: var(--viz-border-thin);
            background-color: var(--viz-surface-panel);
        }

        td {
            padding: var(--viz-spacing-std);
            border-bottom: var(--viz-border-thin);
            vertical-align: middle;
            color: var(--viz-text-primary);
        }

        tr:last-child td {
            border-bottom: none;
        }
    }

    .text-right {
        text-align: right !important;
    }

    .mono-text {
        font-family: var(--viz-mono-font);
        font-size: var(--viz-font-size-std);
    }

    .key-info {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xxs);

        .name {
            font-weight: 500;
            color: var(--viz-text-primary);
        }

        .description {
            font-size: var(--viz-font-size-std);
            color: var(--viz-text-secondary);
        }
    }

    .session-info {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xxs);

        .name {
            font-weight: 500;
            color: var(--viz-text-primary);
        }

        .details {
            font-size: var(--viz-font-size-std);
            color: var(--viz-text-secondary);
        }
    }

    .session-main {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-sm);
    }

    .actions-cell {
        display: flex;
        justify-content: flex-end;
        gap: var(--viz-spacing-sm);
    }

    .action-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2.25rem;
        height: 2.25rem;
        border: none;
        background: transparent;
        border-radius: var(--viz-border-radius-pill);
        cursor: pointer;
        color: var(--viz-text-secondary);
        transition:
            background-color 0.15s ease,
            color 0.15s ease;

        &:hover {
            background-color: var(--viz-surface-hover);
            color: var(--viz-text-primary);
        }

        &.delete:hover,
        &.revoke:hover {
            background-color: color-mix(in srgb, var(--viz-error-color) 15%, var(--viz-surface-card));
            color: var(--viz-error-color);
        }
    }

    .empty-row {
        text-align: center;
        padding: var(--viz-spacing-xxl) !important;
        color: var(--viz-text-secondary);
        font-style: italic;
    }

    .loading-state {
        padding: var(--viz-spacing-xxl);
        text-align: center;
        color: var(--viz-text-secondary);
        background-color: var(--viz-surface-panel);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        font-family: var(--viz-display-font);
    }
</style>
