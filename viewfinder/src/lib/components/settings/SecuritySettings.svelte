<script lang="ts">
    import {
        deleteApiKey,
        deleteSession,
        getCurrentSession,
        getSessions,
        listApiKeys,
        updateSession,
        type ApiKey,
        type Session
    } from "$lib/api";
    import Button from "$lib/components/ui/Button.svelte";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import ConfirmationModal from "$lib/components/modals/ConfirmationModal.svelte";
    import CreatedApiKeyModal from "$lib/components/modals/CreatedApiKeyModal.svelte";
    import { toastState } from "$lib/toast-notifcations/notif-state.svelte";
    import { DateTime } from "luxon";
    import { onMount } from "svelte";
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

    onMount(loadData);

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
                    } as any);
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
                <p>Personal access tokens for API access.</p>
            </div>
            <Button variant="mini" onclick={openApiKeyModal}>
                <MaterialIcon iconName="add" /> Create Key
            </Button>
        </div>

        <div class="keys-list">
            {#if loading}
                <div class="loading-state">Loading...</div>
            {:else}
                <table class="settings-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Created</th>
                            <th>Last Used</th>
                            <th style="text-align: right;">Actions</th>
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
                                <td>{formatDate(key.created_at)}</td>
                                <td>{key.last_used_at ? formatDate(key.last_used_at) : "Never"}</td>
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
            {/if}
        </div>
    </section>

    <section class="settings-section">
        <div class="section-header">
            <div class="header-info">
                <h3>Active Sessions</h3>
                <p>Devices that are currently logged into your account.</p>
            </div>
        </div>

        <div class="sessions-list">
            {#if loading}
                <div class="loading-state">Loading...</div>
            {:else}
                <table class="settings-table">
                    <thead>
                        <tr>
                            <th>Device / Browser</th>
                            <th>Last Active</th>
                            <th style="text-align: right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each sessions as session}
                            <tr>
                                <td>
                                    <div class="session-info">
                                        <div class="session-main">
                                            <span class="name">{session.client_name || "Unknown Device"}</span>
                                            {#if session.is_current}
                                                <span class="current-badge">Current</span>
                                            {/if}
                                        </div>
                                        <span class="details">
                                            {session.browser} on {session.os} • {session.ip_address}
                                        </span>
                                    </div>
                                </td>
                                <td>{formatDate(session.last_active_at)}</td>
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
            {/if}
        </div>
    </section>
</div>

<style lang="scss">
    .security-settings {
        display: flex;
        flex-direction: column;
        gap: 2.5rem;
    }

    .settings-section {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
    }

    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;

        h3 {
            margin: 0;
            font-size: 1.1rem;
            font-weight: 600;
        }

        p {
            margin: 0.25rem 0 0 0;
            font-size: 0.9rem;
            color: var(--viz-40);
        }
    }

    .settings-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.9rem;

        th {
            text-align: left;
            padding: 0.75rem 1rem;
            color: var(--viz-40);
            font-weight: 500;
            border-bottom: 1px solid var(--viz-90);
        }

        td {
            padding: 1rem;
            border-bottom: 1px solid var(--viz-95);
            vertical-align: middle;
        }

        tr:last-child td {
            border-bottom: none;
        }
    }

    .key-info {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;

        .name {
            font-weight: 500;
            color: var(--viz-text-color);
        }

        .description {
            font-size: 0.8rem;
            color: var(--viz-40);
        }
    }

    .session-info {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;

        .name {
            font-weight: 500;
            color: var(--viz-text-color);
        }

        .details {
            font-size: 0.8rem;
            color: var(--viz-40);
        }
    }

    .session-main {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .current-badge {
        padding: 0.125rem 0.375rem;
        background: color-mix(in srgb, var(--viz-success-color) 15%, var(--viz-95));
        color: var(--viz-success-color);
        border-radius: 0.25rem;
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
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

        &.delete:hover,
        &.revoke:hover {
            background-color: rgba(239, 68, 68, 0.1);
            color: #ef4444;
        }
    }

    .empty-row {
        text-align: center;
        padding: 2rem !important;
        color: var(--viz-40);
        font-style: italic;
    }

    .loading-state {
        padding: 2rem;
        text-align: center;
        color: var(--viz-40);
    }
</style>
