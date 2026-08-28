<script lang="ts">
    import {
        type ApiKey,
        type Session,
        deleteApiKey,
        deleteSession,
        getCurrentSession,
        getSessions,
        listApiKeys,
        updateSession
    } from "@viz/api";
    import { DateTime } from "luxon";
    import ConfirmationModal from "$lib/components/modals/ConfirmationModal.svelte";
    import CreatedApiKeyModal from "$lib/components/modals/CreatedApiKeyModal.svelte";
    import Badge from "$lib/components/ui/Badge.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import Table, { type TableColumn } from "$lib/components/ui/Table.svelte";
    import { toasts } from "$lib/toast-notifcations/toasts.svelte";
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
            toasts.add({
                message: "Error loading security settings",
                type: "error"
            });
        } finally {
            loading = false;
        }
    }

    loadData();

    function formatRelativeDate(dateStr?: string) {
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
                toasts.add({
                    message: "API Key deleted successfully",
                    type: "success"
                });
            } else {
                toasts.add({
                    message: "Failed to delete API key",
                    type: "error"
                });
            }
        } catch (e) {
            toasts.add({ message: "Error deleting key", type: "error" });
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

                        toasts.add({
                            message: "Session renamed successfully",
                            type: "success"
                        });
                    } else {
                        toasts.add({
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
                toasts.add({
                    message: "Session revoked successfully",
                    type: "success"
                });
            } else {
                toasts.add({
                    message: "Failed to revoke session",
                    type: "error"
                });
            }
        } catch (e) {
            toasts.add({ message: "Error revoking session", type: "error" });
        } finally {
            revokingSession = null;
        }
    }

    const apiKeysColumns: TableColumn<ApiKey>[] = [
        { key: "name", header: "Name", cell: apiKeyCellSnippet, sortable: true },
        { key: "created_at", header: "Created", mono: true, cell: apiKeyCreatedSnippet, sortable: true },
        { key: "last_used_at", header: "Last Used", mono: true, cell: apiKeyLastUsedSnippet, sortable: true }
    ];

    const sessionsColumns: TableColumn<ExtendedSession>[] = [
        { key: "device", header: "Device / Browser", cell: sessionDeviceSnippet, sortable: true },
        { key: "last_active", header: "Last Active", mono: true, cell: sessionLastActiveSnippet, sortable: true }
    ];
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

{#snippet apiKeyCellSnippet(key: ApiKey)}
    <div class="key-info">
        <span class="name">{key.name}</span>
        {#if key.description}
            <span class="description">{key.description}</span>
        {/if}
    </div>
{/snippet}

{#snippet apiKeyCreatedSnippet(key: ApiKey)}
    <span title={new Date(key.created_at).toLocaleString()}>{formatRelativeDate(key.created_at)}</span>
{/snippet}

{#snippet apiKeyLastUsedSnippet(key: ApiKey)}
    <span title={key.last_used_at ? new Date(key.last_used_at).toLocaleString() : "Never"}>
        {key.last_used_at ? formatRelativeDate(key.last_used_at) : "Never"}
    </span>
{/snippet}

{#snippet apiKeyActionsSnippet(key: ApiKey)}
    <div class="actions-cell">
        <button class="action-btn delete" onclick={() => openDeleteKeyConfirm(key)} title="Delete Key">
            <MaterialIcon iconName="delete" />
        </button>
    </div>
{/snippet}

{#snippet sessionDeviceSnippet(session: ExtendedSession)}
    <div class="session-info">
        <div class="session-main">
            <span class="name">{session.client_name || `${session.browser} on ${session.os}`}</span>
            {#if session.is_current}
                <Badge variant="success" size="small" weight="regular"><span>Current</span></Badge>
            {/if}
        </div>
        <span class="details">
            <span class="mono-text">{session.ip_address}</span>
        </span>
    </div>
{/snippet}

{#snippet sessionLastActiveSnippet(session: ExtendedSession)}
    <span title={session.last_active_at ? new Date(session.last_active_at).toLocaleString() : "Never"}>
        {formatRelativeDate(session.last_active_at)}
    </span>
{/snippet}

{#snippet sessionActionsSnippet(session: ExtendedSession)}
    <div class="actions-cell">
        <button class="action-btn" onclick={() => openRenameSessionModal(session)} title="Rename Session">
            <MaterialIcon iconName="edit" />
        </button>
        {#if !session.is_current}
            <button class="action-btn revoke" onclick={() => openRevokeConfirm(session)} title="Revoke Session">
                <MaterialIcon iconName="logout" />
            </button>
        {/if}
    </div>
{/snippet}

<div class="security-settings">
    <section class="settings-section">
        <div class="section-header">
            <div class="header-info">
                <h3>API Keys</h3>
                <span>Personal access tokens for API access.</span>
            </div>
            <Button variant="info" iconName="add" onclick={openApiKeyModal}><span>Create New Key</span></Button>
        </div>

        <div class="keys-list">
            {#if loading}
                <div class="loading-state">Loading...</div>
            {:else}
                <Table
                    name="security-api-keys"
                    data={apiKeys}
                    columns={apiKeysColumns}
                    rowActions={apiKeyActionsSnippet}
                    emptyMessage="No API keys created yet."
                />
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
                <Table
                    name="security-active-sessions"
                    data={sessions}
                    columns={sessionsColumns}
                    rowActions={sessionActionsSnippet}
                    emptyMessage="No active sessions."
                />
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
