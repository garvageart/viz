<script lang="ts">
    import { invalidate } from "$app/navigation";
    import { page } from "$app/state";
    import { DateTime, Duration } from "luxon";
    import type { Snippet } from "svelte";
    import AdminRouteShell from "$lib/components/admin/AdminRouteShell.svelte";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import ProgressBar from "$lib/components/ui/ProgressBar.svelte";
    import type { MaterialSymbol } from "$lib/types/MaterialSymbol.js";
    import { tryParseDate } from "$lib/utils/dates";
    import { formatBytes, formatSeconds } from "$lib/utils/images";
    import { getGitBranchUrl, getGitCommitUrl, parseGitWebUrl } from "$lib/utils/url";

    let { data } = $props();

    function formatBuildDate(dateStr?: string): string {
        if (!dateStr) {
            return "Unknown";
        }

        const dt = tryParseDate(dateStr);
        return dt && dt.isValid ? dt.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS) : dateStr;
    }

    let lastUpdated = $state(new Date());

    let systemInfo = $derived({
        version: __APP_VERSION__,
        activeConnections: data.wsStats?.connectedClients ?? 0,
        goroutines: data.systemStats?.num_goroutine ?? 0,
        allocMemory: data.systemStats?.alloc_memory ? formatBytes(data.systemStats.alloc_memory) : "Unknown",
        sysMemory: data.systemStats?.sys_memory ? formatBytes(data.systemStats.sys_memory) : "Unknown"
    });

    let databaseInfo = $derived({
        connections: data.dbStats?.active_connections ?? 0,
        size: data.dbStats?.db_size_bytes ? formatBytes(data.dbStats.db_size_bytes) : "Unknown",
        users: data.dbStats?.user_count ?? 0,
        images: data.dbStats?.image_count ?? 0
    });

    let storageInfo = $derived({
        totalUsed: data.systemStats?.storage_used_bytes ? formatBytes(data.systemStats.storage_used_bytes) : "Unknown",
        availableSystemSpace: data.systemStats?.total_available_space_bytes
            ? formatBytes(data.systemStats.total_available_space_bytes)
            : "Unknown",
        totalSystemSpace: data.systemStats?.total_system_space_bytes
            ? formatBytes(data.systemStats.total_system_space_bytes)
            : "Unknown",
        path: data.systemStats?.storage_path ?? "Unknown",
        cacheSize: data.cacheStatus ? formatBytes(data.cacheStatus.size) : "Unknown",
        cacheItems: data.cacheStatus?.items ?? 0
    });

    let repoWebUrl = $derived(parseGitWebUrl(data.serverAbout?.repositoryUrl));
    let branchUrl = $derived(getGitBranchUrl(data.serverAbout?.repositoryUrl, data.serverAbout?.sourceRef));
    let commitUrl = $derived(getGitCommitUrl(data.serverAbout?.repositoryUrl, data.serverAbout?.sourceCommit));

    let liveUptimeSeconds = $derived(data.systemStats?.uptime_seconds || 0);
    let formattedLiveUptime = $derived(formatSeconds(liveUptimeSeconds));

    let storagePercent = $derived(
        100 -
            ((data.systemStats?.total_available_space_bytes ?? 0) / (data.systemStats?.total_system_space_bytes ?? 1)) *
                100
    );

    let formattedSystemStorage = $derived(
        `${formatBytes(
            (data.systemStats?.total_system_space_bytes ?? 0) - (data.systemStats?.total_available_space_bytes ?? 0)
        )} of ${storageInfo.totalSystemSpace}`
    );

    $effect(() => {
        const interval = setInterval(() => {
            liveUptimeSeconds++;
        }, 1000);

        return () => clearInterval(interval);
    });

    $effect(() => {
        const interval = setInterval(
            () => {
                invalidate(page.route.id ?? page.url.pathname).then(() => {
                    lastUpdated = new Date();
                    liveUptimeSeconds = data.systemStats?.uptime_seconds || 0;
                });
            },
            Duration.fromObject({ seconds: 30 }).as("milliseconds")
        );

        return () => clearInterval(interval);
    });
</script>

{#snippet statCard({
    icon,
    iconClass,
    label,
    value,
    id = undefined,
    href = undefined,
    mono = false
}: {
    icon: MaterialSymbol;
    iconClass: string;
    label: string;
    value: string | number | null | undefined;
    id?: string;
    href?: string;
    mono?: boolean;
})}
    {#if href}
        <a {href} class="stat-card">
            <div class={["stat-icon", iconClass]}>
                <MaterialIcon iconName={icon} />
            </div>
            <div class="stat-content">
                <span class="stat-value" class:font-mono={mono} {id}>{value}</span>
                <span class="stat-label">{label}</span>
            </div>
        </a>
    {:else}
        <div class="stat-card">
            <div class={["stat-icon", iconClass]}>
                <MaterialIcon iconName={icon} />
            </div>
            <div class="stat-content">
                <span class="stat-value" class:font-mono={mono} {id}>{value}</span>
                <span class="stat-label">{label}</span>
            </div>
        </div>
    {/if}
{/snippet}

{#snippet card({
    icon,
    iconClass,
    title,
    subtitle,
    href = undefined,
    body
}: {
    icon: MaterialSymbol;
    iconClass: string;
    title: string;
    subtitle: string;
    href?: string;
    body: Snippet;
})}
    <div class="custom-card">
        <div class="card-header">
            <div class="card-title-group">
                <div class={["stat-icon", iconClass]}>
                    <MaterialIcon iconName={icon} />
                </div>
                <div>
                    <h4>{title}</h4>
                    <span class="card-subtitle">{subtitle}</span>
                </div>
            </div>
            {#if href}
                <a {href} class="icon-link-btn">
                    <MaterialIcon iconName="chevron_right" size="1.25rem" />
                </a>
            {/if}
        </div>
        <div class="card-body">
            {@render body()}
        </div>
    </div>
{/snippet}

{#snippet headerActions()}
    <div class="last-updated-badge">
        <MaterialIcon iconName="sync" size="1rem" class="sync-icon" />
        <span>Updated {DateTime.fromJSDate(lastUpdated).toFormat("HH:mm:ss")}</span>
    </div>
{/snippet}

{#snippet healthBody()}
    <div class="metric-row">
        <span class="metric-label">Concurrent Tasks</span>
        <span class="metric-value">{systemInfo.goroutines}</span>
    </div>
    <div class="metric-row">
        <span class="metric-label">App Memory</span>
        <span class="metric-value font-mono">{systemInfo.allocMemory}</span>
    </div>
    <div class="metric-row">
        <span class="metric-label">Server Memory</span>
        <span class="metric-value font-mono">{systemInfo.sysMemory}</span>
    </div>
    <div class="metric-row">
        <span class="metric-label">DB Connections</span>
        <span class="metric-value">{databaseInfo.connections}</span>
    </div>
    <div class="metric-row">
        <span class="metric-label">DB Size</span>
        <span class="metric-value font-mono">{databaseInfo.size}</span>
    </div>
{/snippet}

{#snippet storageBody()}
    <div class="storage-row">
        <span class="storage-label">Storage Folder</span>
        <span class="storage-value path" title={storageInfo.path}>{storageInfo.path}</span>
    </div>
    <div class="storage-row">
        <span class="storage-label">Image Storage</span>
        <span class="storage-value">{storageInfo.totalUsed}</span>
    </div>
    <div class="storage-row progress-row">
        <div class="progress-labels">
            <span class="storage-label">Server Space</span>
            <span class="storage-value font-mono">{formattedSystemStorage}</span>
        </div>
        <div class="progress-bar-wrapper">
            <ProgressBar colour="primary" variant="large" width={storagePercent} />
        </div>
    </div>
{/snippet}

{#snippet cacheBody()}
    <div class="storage-row">
        <span class="storage-label">Total Cache Size</span>
        <span class="storage-value">{storageInfo.cacheSize}</span>
    </div>
    <div class="storage-row">
        <span class="storage-label">Cached Items</span>
        <span class="storage-value font-mono">{storageInfo.cacheItems}</span>
    </div>
{/snippet}

{#snippet serverInfoBody()}
    <div class="server-info-layout">
        <div class="version-section">
            <div class="version-badge-container">
                <MaterialIcon iconName="sell" size="1.25rem" />
                <span class="version">v{data.serverAbout?.version || "Unknown"}</span>
            </div>
            <div class="env-badge {data.serverAbout?.environment || 'unknown'}">
                {data.serverAbout?.environment || "Unknown"}
            </div>
        </div>
        <div class="build-info-bar">
            <span class="build-tag">Build #{data.serverAbout?.build?.id || "Unknown"}</span>
            <span class="build-date">{formatBuildDate(data.serverAbout?.build?.date)}</span>
        </div>

        <div class="server-details-grid">
            <div class="details-group">
                <h5>Source</h5>
                {#if repoWebUrl}
                    <div class="detail-row">
                        <span class="label">Repository</span>
                        <span class="value">
                            <a href={repoWebUrl} target="_blank" rel="noreferrer" class="repo-link">
                                <MaterialIcon iconName="open_in_new" size="0.9rem" />
                                {data.serverAbout?.repository || "Source Code"}
                            </a>
                        </span>
                    </div>
                {/if}
                <div class="detail-row">
                    <span class="label">Location</span>
                    <span class="value font-mono">
                        {#if branchUrl}
                            <a href={branchUrl} target="_blank" rel="noreferrer" class="repo-link">
                                {data.serverAbout?.sourceRef || "Unknown"}
                            </a>
                        {:else}
                            {data.serverAbout?.sourceRef || "Unknown"}
                        {/if}
                        <span class="at-separator">@</span>
                        {#if commitUrl}
                            <a href={commitUrl} target="_blank" rel="noreferrer" class="repo-link">
                                {data.serverAbout?.sourceCommit
                                    ? data.serverAbout.sourceCommit.substring(0, 7)
                                    : "Unknown"}
                            </a>
                        {:else}
                            {data.serverAbout?.sourceCommit ? data.serverAbout.sourceCommit.substring(0, 7) : "Unknown"}
                        {/if}
                    </span>
                </div>
            </div>

            <div class="details-group">
                <h5>Runtime</h5>
                <div class="detail-row">
                    <span class="label">Go Runtime</span>
                    <span class="value">{data.serverAbout?.go || "Unknown"}</span>
                </div>
                <div class="detail-row">
                    <span class="label">libvips</span>
                    <span class="value font-mono">v{data.serverAbout?.libvips || "Unknown"}</span>
                </div>
                <div class="detail-row">
                    <span class="label">OS / Arch</span>
                    <span class="value"
                        >{data.serverAbout?.os || "Unknown"} / {data.serverAbout?.architecture || "Unknown"}</span
                    >
                </div>
            </div>
        </div>
    </div>
{/snippet}

<AdminRouteShell heading="Dashboard" description="System overview and metrics" actions={headerActions}>
    <div class="dashboard-container">
        <!-- Primary metrics strip -->
        <div class="metrics-strip">
            {@render statCard({
                icon: "image",
                iconClass: "images",
                value: databaseInfo.images,
                label: "Total Images",
                href: "/photos"
            })}
            {@render statCard({
                icon: "group",
                iconClass: "users",
                value: databaseInfo.users,
                label: "Total Users",
                href: "/admin/users"
            })}
            {@render statCard({
                icon: "schedule",
                iconClass: "uptime",
                value: formattedLiveUptime,
                label: "System Uptime",
                id: "uptime-value",
                mono: true
            })}
            {@render statCard({
                icon: "hub",
                iconClass: "connections",
                value: systemInfo.activeConnections,
                label: "Active Clients",
                href: "/admin/events"
            })}
        </div>

        <!-- Secondary 3-column grid -->
        <div class="dashboard-grid">
            {@render card({
                icon: "monitor_heart",
                iconClass: "goroutines",
                title: "System Health",
                subtitle: "Runtime & database metrics",
                href: "/admin/jobs",
                body: healthBody
            })}
            {@render card({
                icon: "hard_drive",
                iconClass: "storage",
                title: "Storage",
                subtitle: "Disk space allocation",
                href: "/admin/storage",
                body: storageBody
            })}
            {@render card({
                icon: "memory",
                iconClass: "cache",
                title: "Cache",
                subtitle: "Optimized image store",
                href: "/admin/cache",
                body: cacheBody
            })}
        </div>

        <!-- Server Information — full width -->
        {@render card({
            icon: "dns",
            iconClass: "version",
            title: "Server Information",
            subtitle: "Environment & Build",
            body: serverInfoBody
        })}
    </div>
</AdminRouteShell>

<style lang="scss">
    .dashboard-container {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-lg);
    }

    .last-updated-badge {
        display: inline-flex;
        align-items: center;
        gap: var(--viz-spacing-xs);
        background-color: var(--viz-95);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-sm);
        padding: var(--viz-spacing-xs) var(--viz-spacing-sm);
        font-size: var(--viz-font-size-std);
        color: var(--viz-text-color);
        font-family: var(--viz-mono-font);
        letter-spacing: -0.02em;

        :global(.sync-icon) {
            color: var(--viz-primary);
        }
    }

    .metrics-strip {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: var(--viz-spacing-md);

        @media (max-width: 900px) {
            grid-template-columns: repeat(2, 1fr);
        }

        @media (max-width: 480px) {
            grid-template-columns: 1fr;
        }
    }

    .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--viz-spacing-lg);
        align-items: stretch;

        @media (max-width: 1024px) {
            grid-template-columns: 1fr 1fr;
        }

        @media (max-width: 640px) {
            grid-template-columns: 1fr;
        }
    }

    .stat-card {
        background-color: var(--viz-95);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        padding: var(--viz-spacing-md) var(--viz-spacing-lg);
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-md);
        transition:
            border-color 0.2s ease,
            background-color 0.2s ease;
        text-decoration: none;
        color: inherit;

        &:hover {
            border-color: var(--viz-70);
            background-color: var(--viz-90);
        }
    }

    .stat-icon {
        width: 2.75rem;
        height: 2.75rem;
        border-radius: var(--viz-border-radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        color: #fff;
        transition:
            background-color 0.2s ease,
            color 0.2s ease;

        &.version {
            background-color: #3b82f6;
        }

        &.connections {
            background-color: #10b981;
        }

        &.cache {
            background-color: #f59e0b;
            color: var(--viz-10-dark);
        }

        &.uptime {
            background-color: #8b5cf6;
        }

        &.db {
            background-color: #6366f1;
        }

        &.storage {
            background-color: #ec4899;
        }

        &.users {
            background-color: #14b8a6;
        }

        &.images {
            background-color: #f43f5e;
        }

        &.goroutines {
            background-color: #0d9488;
        }

        &.alloc-memory {
            background-color: #d946af;
        }

        &.sys-memory {
            background-color: #a855f7;
        }

        &.storage-path {
            background-color: #22c55e;
            color: var(--viz-10-dark);
        }

        :global(svg),
        :global(.material-icons) {
            font-size: 1.35rem;
        }
    }

    .stat-content {
        display: flex;
        flex-direction: column;
        min-width: 0;
        flex: 1;
    }

    .stat-value {
        font-size: var(--viz-font-size-xl);
        font-weight: 700;
        font-family: var(--viz-display-font);
        line-height: 1.2;
        color: var(--viz-text-color);

        &.font-mono {
            font-family: var(--viz-mono-font);
            letter-spacing: -0.04em;
        }
    }

    .stat-label {
        font-size: var(--viz-font-size-std);
        color: var(--viz-40);
        margin-top: var(--viz-spacing-xxs);
    }

    .custom-card {
        background-color: var(--viz-95);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-lg);
        padding: var(--viz-spacing-lg);
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-md);
    }

    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: var(--viz-border-thin);
        padding-bottom: var(--viz-spacing-md);
        margin-bottom: var(--viz-spacing-xxs);
    }

    .card-title-group {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-sm);

        h4 {
            font-size: var(--viz-font-size-xl);
            font-weight: 600;
            color: var(--viz-text-color);
            margin: 0;
        }
    }

    .card-subtitle {
        font-size: var(--viz-font-size-lg);
        color: var(--viz-40);
        display: block;
        margin-top: 2px;
    }

    .icon-link-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1.75rem;
        height: 1.75rem;
        border-radius: var(--viz-border-radius-pill);
        color: var(--viz-30);
        text-decoration: none;
        transition:
            background-color 0.15s ease,
            color 0.15s ease;

        &:hover {
            background-color: var(--viz-80);
            color: var(--viz-text-color);
        }
    }

    .card-body {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-sm);

        &.horizontal {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            width: 100%;
        }
    }

    .metric-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--viz-spacing-xs) 0;
        border-bottom: 1px solid var(--viz-85);
        font-size: var(--viz-font-size-lg);

        &:last-child {
            border-bottom: none;
        }

        .metric-label {
            color: var(--viz-40);
            font-weight: 500;
        }

        .metric-value {
            color: var(--viz-text-color);
            font-weight: 600;

            &.font-mono {
                font-family: var(--viz-mono-font);
                letter-spacing: -0.04em;
            }
        }
    }

    .storage-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: var(--viz-font-size-lg);
        gap: var(--viz-spacing-md);

        .storage-label {
            color: var(--viz-40);
            font-weight: 500;
        }

        .storage-value {
            color: var(--viz-text-color);
            font-weight: 600;

            &.path {
                font-family: var(--viz-mono-font);
                font-size: var(--viz-font-size-std);
                word-break: break-all;
                max-width: 12rem;
                text-align: right;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            &.font-mono {
                font-family: var(--viz-mono-font);
                letter-spacing: -0.04em;
            }
        }

        &.progress-row {
            flex-direction: column;
            align-items: stretch;
            gap: var(--viz-spacing-xs);
            margin-top: var(--viz-spacing-xs);
        }

        .progress-labels {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
    }

    .progress-bar-wrapper {
        position: relative;
        width: 100%;
    }

    .about-card {
        border: var(--viz-border-thin);
    }

    .server-info-layout {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-md);
    }

    .version-section {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--viz-spacing-sm);
        background: var(--viz-85);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);

        .version-badge-container {
            display: flex;
            align-items: center;
            gap: var(--viz-spacing-sm);
            color: var(--viz-text-color);
        }

        .version {
            font-family: var(--viz-mono-font);
            font-size: var(--viz-font-size-lg);
            font-weight: 700;
            color: var(--viz-text-color);
        }
    }

    .build-info-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--viz-spacing-xs) 0;
        border-bottom: 1px dashed var(--viz-80);
        margin-bottom: var(--viz-spacing-xs);

        .build-tag {
            font-weight: 600;
            font-family: var(--viz-mono-font);
            color: var(--viz-text-color);
            font-size: var(--viz-font-size-std);
        }

        .build-date {
            color: var(--viz-40);
            font-size: var(--viz-font-size-std);
        }
    }

    .env-badge {
        font-size: var(--viz-font-size-sm);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 0.15rem 0.4rem;
        border-radius: var(--viz-border-radius-sm);
        border: var(--viz-border-thin);
        display: inline-block;
        color: var(--viz-20);
        background-color: var(--viz-90);
    }

    .version-tag {
        font-family: var(--viz-mono-font);
        font-size: var(--viz-font-size-std);
        padding: 0.15rem 0.5rem;
        background-color: var(--viz-90);
        color: var(--viz-text-color);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-sm);
        font-weight: 600;
    }

    .server-details-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--viz-spacing-md);

        @media (max-width: 640px) {
            grid-template-columns: 1fr;
        }
    }

    .details-group {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xs);

        h5 {
            font-size: var(--viz-font-size-sm);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--viz-40);
            margin: 0 0 var(--viz-spacing-xs) 0;
            font-weight: 600;
        }
    }

    .detail-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--viz-spacing-xs) 0;
        border-bottom: 1px solid var(--viz-85, rgba(255, 255, 255, 0.05));

        &:last-child {
            border-bottom: none;
        }

        .label {
            color: var(--viz-40);
        }

        .value {
            color: var(--viz-text-color);
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: var(--viz-spacing-xs);

            &.font-mono {
                font-family: var(--viz-mono-font);
            }

            .at-separator {
                color: var(--viz-40);
                margin: 0 4px;
            }
        }

        .repo-link {
            color: inherit;
            text-decoration: underline;
            display: inline-flex;
            align-items: center;
            gap: 4px;

            &:hover {
                color: var(--viz-text-color);
                text-decoration: none;
            }
        }
    }
</style>
