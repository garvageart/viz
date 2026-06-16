<script lang="ts">
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import ProgressBar from "$lib/components/ui/ProgressBar.svelte";
    import AdminRouteShell from "$lib/components/admin/AdminRouteShell.svelte";
    import { formatBytes, formatSeconds } from "$lib/utils/images";
    import { invalidateViz } from "$lib/views/views.svelte.js";
    import { Duration } from "luxon";
    import type { MaterialSymbol } from "$lib/types/MaterialSymbol.js";
    import type { Snippet } from "svelte";

    let { data } = $props();

    let lastUpdated = $state(new Date());

    let systemInfo = $derived({
        version: window.__APP_VERSION__,
        // uptime is now handled by formattedLiveUptime
        activeConnections: data.wsStats?.connectedClients ?? 0,
        goroutines: data.systemStats?.num_goroutine ?? 0,
        allocMemory: data.systemStats?.alloc_memory
            ? formatBytes(data.systemStats.alloc_memory)
            : "Unknown",
        sysMemory: data.systemStats?.sys_memory
            ? formatBytes(data.systemStats.sys_memory)
            : "Unknown"
    });

    let databaseInfo = $derived({
        connections: data.dbStats?.active_connections ?? 0,
        size: data.dbStats?.db_size_bytes ? formatBytes(data.dbStats.db_size_bytes) : "Unknown",
        users: data.dbStats?.user_count ?? 0,
        images: data.dbStats?.image_count ?? 0
    });

    let storageInfo = $derived({
        totalUsed: data.systemStats?.storage_used_bytes
            ? formatBytes(data.systemStats.storage_used_bytes)
            : "Unknown",
        availableSystemSpace: data.systemStats?.total_system_space_bytes
            ? formatBytes(data.systemStats.total_system_space_bytes)
            : "Unknown",
        totalSystemSpace: data.systemStats?.total_system_space_bytes
            ? formatBytes(data.systemStats.total_system_space_bytes)
            : "Unknown",
        path: data.systemStats?.storage_path ?? "Unknown",
        cacheSize: data.cacheStatus ? formatBytes(data.cacheStatus.size) : "Unknown",
        cacheItems: data.cacheStatus?.items ?? 0
    });

    let liveUptimeSeconds = $derived(data.systemStats?.uptime_seconds || 0);
    let formattedLiveUptime = $derived(formatSeconds(liveUptimeSeconds));

    $effect(() => {
        liveUptimeSeconds = data.systemStats?.uptime_seconds || 0;
    });

    $effect(() => {
        const interval = setInterval(() => {
            liveUptimeSeconds++;
        }, 1000);

        return () => clearInterval(interval);
    });

    $effect(() => {
        const interval = setInterval(
            () => {
                invalidateViz({ delay: 200 }).then(() => {
                    lastUpdated = new Date();
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
    isWide = false,
    isPath = false,
    id = undefined,
    href = undefined,
    children = null
}: {
    icon: MaterialSymbol;
    iconClass: string;
    label: string;
    value: string | number | null | undefined;
    isWide?: boolean;
    isPath?: boolean;
    id?: string;
    href?: string;
    children?: Snippet | null;
})}
    {#if href}
        <a {href} class={["stat-card", isWide ? "wide" : ""]}>
            <div class={["stat-icon", iconClass]}>
                <MaterialIcon iconName={icon} />
            </div>
            <div class="stat-content">
                <span class={["stat-value", isPath ? "path" : ""]} {id}>{value}</span>
                <span class="stat-label">{label}</span>
                {#if children}
                    {@render children()}
                {/if}
            </div>
        </a>
    {:else}
        <div class={["stat-card", isWide ? "wide" : ""]}>
            <div class={["stat-icon", iconClass]}>
                <MaterialIcon iconName={icon} />
            </div>
            <div class="stat-content">
                <span class={["stat-value", isPath ? "path" : ""]} {id}>{value}</span>
                <span class="stat-label">{label}</span>
                {#if children}
                    {@render children()}
                {/if}
            </div>
        </div>
    {/if}
{/snippet}

<AdminRouteShell heading="Dashboard" description="System overview and metrics">
    <div class="dashboard-container">
        <div class="stats-info">
            <span>Last updated:</span>
            <span>
                {lastUpdated.toLocaleString()}
            </span>
        </div>

        <!-- System Overview Section -->
        <section class="section">
            <h3 class="section-title">System Overview</h3>
            <div class="stats-grid">
                {@render statCard({
                    icon: "info",
                    iconClass: "version",
                    value: `v${systemInfo.version}`,
                    label: "System Version"
                })}

                {@render statCard({
                    icon: "schedule",
                    iconClass: "uptime",
                    value: formattedLiveUptime,
                    label: "Uptime",
                    id: "uptime-value"
                })}

                {@render statCard({
                    icon: "hub",
                    iconClass: "connections",
                    value: systemInfo.activeConnections,
                    label: "Active Clients",
                    href: "/admin/events"
                })}

                {@render statCard({
                    icon: "compare_arrows",
                    iconClass: "goroutines",
                    value: systemInfo.goroutines,
                    label: "Goroutines",
                    href: "/admin/jobs"
                })}

                {@render statCard({
                    icon: "memory",
                    iconClass: "alloc-memory",
                    value: systemInfo.allocMemory,
                    label: "Allocated Memory"
                })}

                {@render statCard({
                    icon: "memory_alt",
                    iconClass: "sys-memory",
                    value: systemInfo.sysMemory,
                    label: "System Memory"
                })}
            </div>
        </section>

        <!-- Database Section -->
        <section class="section">
            <h3 class="section-title">Database</h3>
            <div class="stats-grid">
                {@render statCard({
                    icon: "database",
                    iconClass: "db",
                    value: databaseInfo.connections,
                    label: "Active Connections"
                })}

                {@render statCard({
                    icon: "hard_drive",
                    iconClass: "storage",
                    value: databaseInfo.size,
                    label: "Database Size",
                    href: "/admin/storage"
                })}

                {@render statCard({
                    icon: "group",
                    iconClass: "users",
                    value: databaseInfo.users,
                    label: "Total Users",
                    href: "/admin/users"
                })}

                {@render statCard({
                    icon: "image",
                    iconClass: "images",
                    value: databaseInfo.images,
                    label: "Total Images",
                    href: "/photos"
                })}
            </div>
        </section>

        <!-- Storage Section -->
        <section class="section">
            <h3 class="section-title">Storage</h3>
            <div class="stats-grid">
                {#snippet systemStorageProgress()}
                    <div class="progress-bar-wrapper">
                        <ProgressBar
                            colour="secondary"
                            width={100 -
                                ((data.systemStats?.total_available_space_bytes ?? 0) /
                                    (data.systemStats?.total_system_space_bytes ?? 1)) *
                                    100}
                        />
                    </div>
                {/snippet}

                {@render statCard({
                    icon: "hard_drive",
                    iconClass: "storage",
                    value: `${formatBytes(
                        (data.systemStats?.total_system_space_bytes ?? 0) -
                            (data.systemStats?.total_available_space_bytes ?? 0)
                    )} of ${storageInfo.totalSystemSpace}`,
                    label: "System Storage",
                    href: "/admin/storage",
                    children: systemStorageProgress
                })}

                {@render statCard({
                    icon: "hard_drive",
                    iconClass: "storage",
                    value: storageInfo.totalUsed,
                    label: "Viz Storage",
                    href: "/admin/storage"
                })}

                <div class="stat-separator"></div>

                {@render statCard({
                    icon: "memory",
                    iconClass: "cache",
                    value: storageInfo.cacheSize,
                    label: `Viz Cache (${storageInfo.cacheItems} items)`,
                    href: "/admin/cache"
                })}

                {@render statCard({
                    icon: "folder",
                    iconClass: "storage-path",
                    value: storageInfo.path,
                    label: "Storage Path",
                    isWide: true,
                    isPath: true,
                    href: "/admin/storage"
                })}
            </div>
        </section>
    </div>
</AdminRouteShell>

<style lang="scss">
    .dashboard-container {
        display: flex;
        flex-direction: column;
        gap: 2.5rem;
    }

    .stats-info {
        display: flex;

        span {
            font-size: 0.9rem;
            color: var(--viz-40);
            margin-right: 0.5rem;
        }
    }

    .section {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .section-title {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--viz-text-color);
        margin: 0;
        padding-left: 0.5rem;
        border-left: 4px solid var(--viz-primary);
        line-height: 1.2;
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
        gap: 1rem;
    }

    .stat-card {
        background: var(--viz-100);
        border: 1px solid var(--viz-80);
        border-radius: 0.75rem;
        padding: 1.5rem;
        display: flex;
        align-items: center;
        gap: 1rem;
        transition: border-color 0.2s;
        text-decoration: none;
        color: inherit;

        &:hover {
            border-color: var(--viz-70);
        }

        &.wide {
            grid-column: 1 / -1;
        }
    }

    .stat-icon {
        width: 3.5rem;
        height: 3.5rem;
        border-radius: 0.75rem;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--viz-bg-color);
        flex-shrink: 0;

        &.version {
            background-color: #3b82f6;
        }
        &.connections {
            background-color: #10b981;
        }
        &.cache {
            background-color: #f59e0b;
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
        }

        /* Material Icon scaling override */
        :global(.material-icons) {
            font-size: 1.75rem;
        }
    }

    .stat-content {
        display: flex;
        flex-direction: column;
        min-width: 0; /* prevents overflow flex item issues */
        flex: 1;
    }

    .stat-value {
        font-size: 1.2rem;
        font-weight: 700;
        line-height: 1.2;
        color: var(--viz-text-color);

        &.path {
            font-size: 1rem;
            font-family: var(--viz-mono-font);
            word-break: break-all;
        }
    }

    #uptime-value {
        min-width: 10rem;
        display: inline-block;
        text-align: left;
    }

    .progress-bar-wrapper {
        position: relative;
        height: 4px;
        width: 100%;
        margin-top: 1rem;
        overflow: hidden;
    }

    .stat-separator {
        grid-column: 1 / -1;
        height: 1px;
        width: 100%;
        background-color: var(--viz-90);
        margin: 0.5rem 0;
    }

    .stat-label {
        font-size: 0.875rem;
        color: var(--viz-40);
        margin-top: 0.25rem;
    }
</style>
