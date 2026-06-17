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
        gap: var(--viz-spacing-xxl);
    }

    .stats-info {
        display: flex;

        span {
            font-size: var(--viz-font-size-xs);
            color: var(--viz-40);
            margin-right: var(--viz-spacing-xs);
        }
    }

    .section {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-md);
    }

    .section-title {
        font-size: var(--viz-font-size-lg);
        font-weight: 600;
        color: var(--viz-text-color);
        margin: 0;
        padding-left: var(--viz-spacing-sm);
        border-left: 4px solid var(--viz-primary);
        line-height: 1.2;
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
        gap: var(--viz-spacing-md);
    }

    .stat-card {
        background-color: var(--viz-95);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        padding: var(--viz-spacing-lg);
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-md);
        transition: border-color 0.2s ease, background-color 0.2s ease;
        text-decoration: none;
        color: inherit;

        &:hover {
            border-color: var(--viz-70);
            background-color: var(--viz-90);
        }

        &.wide {
            grid-column: 1 / -1;
        }
    }

    .stat-icon {
        width: 3rem;
        height: 3rem;
        border-radius: var(--viz-border-radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: background-color 0.2s ease, color 0.2s ease;

        &.version {
            background-color: #3b82f6;
            color: #ffffff;
        }
        &.connections {
            background-color: #10b981;
            color: #ffffff;
        }
        &.cache {
            background-color: #f59e0b;
            color: var(--viz-10-dark);
        }
        &.uptime {
            background-color: #8b5cf6;
            color: #ffffff;
        }
        &.db {
            background-color: #6366f1;
            color: #ffffff;
        }
        &.storage {
            background-color: #ec4899;
            color: #ffffff;
        }
        &.users {
            background-color: #14b8a6;
            color: #ffffff;
        }
        &.images {
            background-color: #f43f5e;
            color: #ffffff;
        }
        &.goroutines {
            background-color: #0d9488;
            color: #ffffff;
        }
        &.alloc-memory {
            background-color: #d946af;
            color: #ffffff;
        }
        &.sys-memory {
            background-color: #a855f7;
            color: #ffffff;
        }
        &.storage-path {
            background-color: #22c55e;
            color: var(--viz-10-dark);
        }

        /* Material Icon scaling override */
        :global(.material-icons) {
            font-size: 1.5rem;
        }
    }

    .stat-content {
        display: flex;
        flex-direction: column;
        min-width: 0; /* prevents overflow flex item issues */
        flex: 1;
    }

    .stat-value {
        font-size: var(--viz-font-size-xl);
        font-weight: 700;
        font-family: var(--viz-mono-font);
        line-height: 1.2;
        color: var(--viz-text-color);

        &.path {
            font-size: var(--viz-font-size-sm);
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
        margin-top: var(--viz-spacing-std);
        overflow: hidden;
    }

    .stat-separator {
        grid-column: 1 / -1;
        height: 1px;
        width: 100%;
        background-color: var(--viz-60);
        margin: var(--viz-spacing-sm) 0;
    }

    .stat-label {
        font-size: var(--viz-font-size-xs);
        color: var(--viz-40);
        margin-top: var(--viz-spacing-xxs);
    }
</style>
