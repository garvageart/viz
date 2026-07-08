<script lang="ts">
    import Button from "$lib/components/ui/Button.svelte";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import { toastState } from "$lib/toast-notifcations/notif-state.svelte";
    import type { PageData } from "./$types";
    import type { WsStatsResponse, WsMetricsResponse, EventRecord } from "$lib/api";
    import ConfirmationModal from "$lib/components/modals/ConfirmationModal.svelte";
    import AdminRouteShell from "$lib/components/admin/AdminRouteShell.svelte";
    import { modalsManager } from "$lib/components/modals/manager/ModalManager.svelte";
    import InputSelect from "$lib/components/ui/InputSelect.svelte";
    import type { MaterialSymbol } from "$lib/types/MaterialSymbol.js";

    type EventHistoryItem = EventRecord;

    let { data }: { data: PageData } = $props();

    // WS Stats - derived from page load data
    let stats = $derived<WsStatsResponse>(data.stats);

    // WS Metrics - derived from page load data
    let metrics = $derived<WsMetricsResponse>(data.metrics);

    // Event History - derived from page load data
    let history = $derived<EventHistoryItem[]>(data.history || []);
    let historyFilter = $state("all");
    let historySearch = $state("");

    function showMessage(message: string, type: "success" | "error" | "info" = "info"): void {
        toastState.addToast({ message, type });
    }

    function requestClearHistory() {
        modalsManager.open(
            ConfirmationModal,
            {
                title: "Clear Event History",
                confirmText: "Clear History",
                onConfirm: handleClearConfirm
            },
            { heading: "Clear Event History" }
        );
    }

    async function handleClearConfirm(): Promise<void> {
        showMessage("Clear event history endpoint not yet implemented for WebSocket", "info");
        // TODO: Implement clearWsEventHistory endpoint if needed
    }

    let filteredHistory = $derived.by(() => {
        let filtered = history;

        // filter by event name (server returns `event` per OpenAPI schema)
        if (historyFilter !== "all") {
            filtered = filtered.filter((e) => e.event === historyFilter);
        }

        if (historySearch) {
            const search = historySearch.toLowerCase();
            filtered = filtered.filter(
                (e) =>
                    String(e.event || "")
                        .toLowerCase()
                        .includes(search) || JSON.stringify(e.data).toLowerCase().includes(search)
            );
        }

        return filtered;
    });

    let eventTypes = $derived.by(() => {
        const types = new Set<string>();
        history.forEach((e) => {
            if (e.event) {
                types.add(e.event);
            }
        });
        return Array.from(types).sort();
    });

    let filterOptions = $derived([
        { value: "all", label: "All Events" },
        ...eventTypes.map((type) => ({ value: type, label: type }))
    ]);

    function formatTimestamp(ts: string): string {
        return new Date(ts).toLocaleString();
    }

    function getMaxEventCount(): number {
        const eventsByType = metrics.eventsByType as Record<string, number>;
        const values = Object.values(eventsByType || {});
        const nums = values.map((v) => (typeof v === "number" ? v : Number(v) || 0));
        return nums.length ? Math.max(...nums) : 0;
    }

    function getEventFillWidth(count: unknown): number {
        const num = typeof count === "number" ? count : Number(count) || 0;
        const max = getMaxEventCount();
        return max > 0 ? (num / max) * 100 : 0;
    }

    function formatJSON(data: any): string {
        return JSON.stringify(data, null, 2);
    }
</script>

{#snippet statCard({ icon, value, label }: { icon: MaterialSymbol; value: string | number; label: string })}
    <div class="stat-card">
        <MaterialIcon iconName={icon} />
        <div class="stat-content">
            <span class="stat-value">{value}</span>
            <span class="stat-label">{label}</span>
        </div>
    </div>
{/snippet}

{#snippet metricCard({ icon, value, label }: { icon: MaterialSymbol; value: string | number; label: string })}
    <div class="metric-card">
        <div class="metric-icon">
            <MaterialIcon iconName={icon} />
        </div>
        <div class="metric-content">
            <span class="metric-value">{value}</span>
            <span class="metric-label">{label}</span>
        </div>
    </div>
{/snippet}

<AdminRouteShell heading="Event Monitor" description="WebSocket metrics and event history">
    <div class="admin-page-content">
        <!-- Connection Stats -->
        <section class="content-section">
            <div class="section-header">
                <MaterialIcon iconName="link" />
                <h2>Connection Statistics</h2>
            </div>
            <div class="stats-grid">
                {@render statCard({
                    icon: "sensors",
                    value: stats.connectedClients,
                    label: "Connected Clients"
                })}

                {@render statCard({
                    icon: "timeline",
                    value: metrics.totalEvents,
                    label: "Total Events"
                })}

                {@render statCard({
                    icon: "schedule",
                    value: new Date(stats.timestamp).toLocaleTimeString(),
                    label: "Last Updated"
                })}

                {@render statCard({
                    icon: "groups",
                    value: stats.clientIds.length,
                    label: "Active Clients"
                })}
            </div>
        </section>

        <!-- Performance Metrics -->
        <section class="content-section">
            <div class="section-header">
                <MaterialIcon iconName="analytics" />
                <h2>Performance Metrics</h2>
            </div>
            <div class="metrics-grid">
                {@render metricCard({
                    icon: "speed",
                    value: metrics.totalEvents,
                    label: "Total Events"
                })}

                {@render metricCard({
                    icon: "trending_up",
                    value: metrics.connectedClients,
                    label: "Active Connections"
                })}

                {@render metricCard({
                    icon: "lightbulb",
                    value: Object.keys(metrics.eventsByType).length,
                    label: "Event Types"
                })}

                {@render metricCard({
                    icon: "update",
                    value: new Date(metrics.timestamp).toLocaleTimeString(),
                    label: "Last Update"
                })}
            </div>
        </section>
        {#if Object.keys(metrics.eventsByType || {}).length > 0}
            <!-- Event Types Distribution -->
            <section class="content-section">
                <div class="section-header">
                    <MaterialIcon iconName="bar_chart" />
                    <h2>Event Types Distribution</h2>
                </div>
                <div class="event-types">
                    {#each Object.entries(metrics.eventsByType || {}) as [type, count]}
                        <div class="event-type-card">
                            <div class="event-type-info">
                                <span class="event-type-name">{type}</span>
                                <span class="event-type-count">{count} events</span>
                            </div>
                            <div class="event-type-bar">
                                <div class="event-type-fill" style="width: {getEventFillWidth(count)}%"></div>
                            </div>
                        </div>
                    {/each}
                </div>
            </section>
        {/if}

        <!-- Event History -->
        <section class="content-section">
            <div class="section-header">
                <MaterialIcon iconName="history" />
                <h2>Event History</h2>
                <span class="badge">{history.length}</span>
            </div>

            <div class="history-controls">
                <div class="filter-group">
                    <InputSelect bind:value={historyFilter} aria-label="Filter by event type" options={filterOptions} />
                </div>
                <div class="search-group">
                    <MaterialIcon iconName="search" />
                    <input id="search-input" type="text" bind:value={historySearch} placeholder="Search events..." />
                </div>
                <Button variant="mini" onclick={requestClearHistory}>
                    <MaterialIcon iconName="delete_sweep" />
                    Clear History
                </Button>
            </div>

            {#if filteredHistory.length === 0}
                <div class="empty-state">
                    <MaterialIcon iconName="inbox" />
                    <p>No events found</p>
                </div>
            {:else}
                <div class="history-list">
                    {#each filteredHistory as event}
                        <details class="event-item">
                            <summary class="event-summary">
                                <div class="summary-content">
                                    <div class="event-header">
                                        <span class="event-type">{event.event}</span>
                                        <span class="event-time">{formatTimestamp(event.timestamp)}</span>
                                    </div>
                                    <MaterialIcon iconName="arrow_drop_down" />
                                </div>
                            </summary>
                            <div class="event-details">
                                <div class="event-field">
                                    <strong>Client ID:</strong>
                                    <code>{event?.data?.clientId ?? "—"}</code>
                                </div>
                                <div class="event-field">
                                    <strong>Data:</strong>
                                    <pre>{formatJSON(event.data)}</pre>
                                </div>
                            </div>
                        </details>
                    {/each}
                </div>
            {/if}
        </section>
    </div>
</AdminRouteShell>

<style lang="scss">
    .admin-page-content {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xl);
    }

    .content-section {
        background-color: var(--viz-95);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        padding: var(--viz-spacing-xl);
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-lg);
    }

    .section-header {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-sm);
        border-bottom: var(--viz-border-thin);
        padding-bottom: var(--viz-spacing-sm);

        :global(.viz-material-icon) {
            color: var(--viz-40);
        }

        h2 {
            margin: 0;
            font-size: var(--viz-font-size-xl);
            font-weight: 600;
            color: var(--viz-text-color);
        }
    }

    .badge {
        padding: 2px var(--viz-spacing-sm);
        background-color: var(--viz-90);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-pill);
        font-size: var(--viz-font-size-std);
        font-family: var(--viz-mono-font);
        font-weight: 600;
        color: var(--viz-30);
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: var(--viz-spacing-md);
    }

    .stat-card {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-md);
        padding: var(--viz-spacing-lg);
        background-color: var(--viz-90);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        transition: border-color 0.2s ease;

        &:hover {
            border-color: var(--viz-70);
        }

        :global(.viz-material-icon) {
            color: var(--viz-primary);
            background-color: color-mix(in srgb, var(--viz-primary) 12%, var(--viz-90));
            padding: var(--viz-spacing-sm);
            border-radius: var(--viz-border-radius-md);
        }

        .stat-content {
            display: flex;
            flex-direction: column;
            gap: var(--viz-spacing-xxs);
        }

        .stat-value {
            font-size: var(--viz-font-size-2xl);
            font-weight: 700;
            font-family: var(--viz-mono-font);
            line-height: 1.2;
            color: var(--viz-text-color);
        }

        .stat-label {
            font-size: var(--viz-font-size-std);
            color: var(--viz-40);
        }
    }

    .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: var(--viz-spacing-md);
    }

    .metric-card {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-md);
        padding: var(--viz-spacing-lg);
        background-color: var(--viz-90);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        transition: border-color 0.2s ease;

        &:hover {
            border-color: var(--viz-70);
        }

        .metric-icon {
            display: flex;
            align-items: center;
            justify-content: center;

            :global(.viz-material-icon) {
                color: var(--viz-info-color);
                background-color: color-mix(in srgb, var(--viz-info-color) 12%, var(--viz-90));
                padding: var(--viz-spacing-sm);
                border-radius: var(--viz-border-radius-md);
            }
        }

        .metric-content {
            display: flex;
            flex-direction: column;
            gap: var(--viz-spacing-xxs);
        }

        .metric-value {
            font-size: var(--viz-font-size-2xl);
            font-weight: 700;
            font-family: var(--viz-mono-font);
            line-height: 1.2;
            color: var(--viz-text-color);
        }

        .metric-label {
            font-size: var(--viz-font-size-std);
            color: var(--viz-40);
        }
    }

    .event-types {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-md);
    }

    .event-type-card {
        padding: var(--viz-spacing-md);
        background-color: var(--viz-90);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-sm);
    }

    .event-type-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .event-type-name {
        font-weight: 600;
        font-size: var(--viz-font-size-lg);
        color: var(--viz-text-color);
        font-family: var(--viz-mono-font);
    }

    .event-type-count {
        font-size: var(--viz-font-size-std);
        color: var(--viz-40);
        font-family: var(--viz-mono-font);
    }

    .event-type-bar {
        height: var(--viz-spacing-xs);
        background-color: var(--viz-80);
        border-radius: var(--viz-border-radius-pill);
        overflow: hidden;
    }

    .event-type-fill {
        height: 100%;
        background-color: var(--viz-primary);
        border-radius: var(--viz-border-radius-pill);
        transition: width 0.3s ease;
    }

    .history-controls {
        display: flex;
        gap: var(--viz-spacing-md);
        margin-bottom: var(--viz-spacing-md);
        flex-wrap: wrap;
        align-items: center;
    }

    .filter-group {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-xs);
        width: 12.5rem;
    }

    .search-group {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-sm);
        flex: 1;
        max-width: 400px;
        height: 2.5rem;
        padding: 0 var(--viz-spacing-md);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        background-color: var(--viz-100);
        transition: border-color 0.15s ease;

        &:focus-within {
            border-color: var(--viz-primary);
        }

        :global(.viz-material-icon) {
            color: var(--viz-40);
            font-size: var(--viz-font-size-xl);
        }

        input {
            border: none;
            background: transparent;
            flex: 1;
            font-size: var(--viz-font-size-lg);
            color: var(--viz-text-color);
            height: 100%;
            padding: 0;
            outline: none;

            &::placeholder {
                color: var(--viz-40);
            }
        }
    }

    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--viz-spacing-xxl) var(--viz-spacing-std);
        color: var(--viz-40);
        background-color: var(--viz-90);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);

        :global(.viz-material-icon) {
            font-size: var(--viz-font-size-5xl);
            margin-bottom: var(--viz-spacing-sm);
        }

        p {
            margin: 0;
            font-size: var(--viz-font-size-lg);
            font-weight: 500;
        }
    }

    .history-list {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-sm);
        max-height: 60vh;
        overflow-y: auto;
        padding-right: var(--viz-spacing-xs);

        &::-webkit-scrollbar {
            width: 6px;
        }
        &::-webkit-scrollbar-track {
            background: transparent;
        }
        &::-webkit-scrollbar-thumb {
            background: var(--viz-80);
            border-radius: var(--viz-border-radius-pill);
        }
        &::-webkit-scrollbar-thumb:hover {
            background: var(--viz-70);
        }
    }

    .event-item {
        background-color: var(--viz-90);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        overflow: hidden;
        flex-shrink: 0;

        &[open] {
            .summary-content {
                border-bottom: var(--viz-border-thin);
                background-color: var(--viz-80);

                :global(.viz-material-icon) {
                    transform: rotate(180deg);
                }
            }
        }
    }

    .event-summary {
        cursor: pointer;
        list-style: none;
        padding: 0;

        &::marker {
            content: "";
        }
        &::-webkit-details-marker {
            display: none;
        }

        &:hover {
            .summary-content {
                background-color: var(--viz-80);
            }
        }
    }

    .summary-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--viz-spacing-md) var(--viz-spacing-lg);
        color: var(--viz-text-color);
        transition: background-color 0.15s ease;

        :global(.viz-material-icon) {
            color: var(--viz-40);
            transition: transform 0.2s ease;
        }
    }

    .event-header {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-md);
        flex: 1;
        min-width: 0;
    }

    .event-type {
        display: inline-block;
        font-family: var(--viz-mono-font);
        font-weight: 600;
        font-size: var(--viz-font-size-std);
        padding: var(--viz-spacing-xxs) var(--viz-spacing-sm);
        background-color: var(--viz-100);
        border: var(--viz-border-thin);
        color: var(--viz-text-color);
        border-radius: var(--viz-border-radius-sm);
    }

    .event-time {
        font-size: var(--viz-font-size-std);
        color: var(--viz-40);
        font-family: var(--viz-mono-font);
    }

    .event-details {
        padding: var(--viz-spacing-lg);
        background-color: var(--viz-100);
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-md);
    }

    .event-field {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xs);

        strong {
            font-size: var(--viz-font-size-std);
            font-weight: 600;
            color: var(--viz-40);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        code {
            display: block;
            padding: var(--viz-spacing-sm);
            background-color: var(--viz-95);
            border: var(--viz-border-thin);
            border-radius: var(--viz-border-radius-md);
            font-size: var(--viz-font-size-std);
            font-family: var(--viz-mono-font);
            color: var(--viz-text-color);
            word-break: break-all;
        }

        pre {
            margin: 0;
            padding: var(--viz-spacing-md);
            background-color: var(--viz-95);
            border: var(--viz-border-thin);
            border-radius: var(--viz-border-radius-md);
            overflow-x: auto;
            font-size: var(--viz-font-size-std);
            font-family: var(--viz-mono-font);
            color: var(--viz-text-color);
            line-height: 1.5;
        }
    }
</style>
