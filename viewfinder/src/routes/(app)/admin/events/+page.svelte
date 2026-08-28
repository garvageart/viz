<script lang="ts">
    import type { EventRecord, WsMetricsResponse, WsStatsResponse } from "@viz/api";
    import AdminRouteShell from "$lib/components/admin/AdminRouteShell.svelte";
    import ConfirmationModal from "$lib/components/modals/ConfirmationModal.svelte";
    import { modalsManager } from "$lib/components/modals/manager/ModalManager.svelte";
    import Badge from "$lib/components/ui/Badge.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import IconBadge from "$lib/components/ui/IconBadge.svelte";
    import InputSelect from "$lib/components/ui/InputSelect.svelte";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import SearchInput from "$lib/components/ui/SearchInput.svelte";
    import Table, { type TableColumn } from "$lib/components/ui/Table.svelte";
    import { toasts } from "$lib/toast-notifcations/toasts.svelte";
    import type { PageData } from "./$types";

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
        toasts.add({ message, type });
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
            filtered = filtered.filter((e) => {
                return e.event === historyFilter;
            });
        }

        if (historySearch) {
            const search = historySearch.toLowerCase();
            filtered = filtered.filter((e) => {
                return (
                    String(e.event || "")
                        .toLowerCase()
                        .includes(search) || JSON.stringify(e.data).toLowerCase().includes(search)
                );
            });
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
        ...eventTypes.map((type) => {
            return { value: type, label: type };
        })
    ]);

    function formatTimestamp(ts: string): string {
        return new Date(ts).toLocaleString();
    }

    function getMaxEventCount(): number {
        const eventsByType = metrics.eventsByType as Record<string, number>;
        const values = Object.values(eventsByType || {});
        const nums = values.map((v) => {
            return typeof v === "number" ? v : Number(v) || 0;
        });
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

    const eventColumns: TableColumn<EventHistoryItem>[] = [
        { key: "event", header: "Event", cell: eventNameCell, sortable: true },
        { key: "clientId", header: "Client", cell: clientCell, mono: true, sortable: true },
        { key: "timestamp", header: "Timestamp", cell: timestampCell, mono: true, sortable: true }
    ];
</script>

{#snippet eventNameCell(event: EventHistoryItem)}
    <Badge variant="outline" size="std">{event.event}</Badge>
{/snippet}

{#snippet clientCell(event: EventHistoryItem)}
    <span class="client-tag font-mono">
        <MaterialIcon iconName="devices" size="0.85rem" />
        {event?.data?.clientId ?? "system"}
    </span>
{/snippet}

{#snippet timestampCell(event: EventHistoryItem)}
    <span class="timestamp-cell">{formatTimestamp(event.timestamp)}</span>
{/snippet}

{#snippet eventExpandedPayload(event: EventHistoryItem)}
    <div class="stream-payload">
        <div class="payload-title">JSON Payload</div>
        <pre class="json-box">{formatJSON(event.data)}</pre>
    </div>
{/snippet}

{#snippet tableToolbar()}
    <div class="console-controls">
        <SearchInput
            inputId="event-history-search"
            placeholder="Search event type, client ID, or payload..."
            bind:value={historySearch}
            style="flex: 1; min-width: 280px; height: 2.5rem;"
        />
        <div class="filter-group">
            <InputSelect bind:value={historyFilter} aria-label="Filter by event type" options={filterOptions} />
        </div>
        <Badge variant="neutral" size="std">{filteredHistory.length} / {history.length} Logs</Badge>
        <Button variant="danger" onclick={requestClearHistory}>
            <MaterialIcon iconName="delete_sweep" size="1.1rem" />
            <span>Clear Logs</span>
        </Button>
    </div>
{/snippet}

<AdminRouteShell heading="Event Monitor" description="WebSocket metrics and event history">
    <div class="admin-page-content">
        <!-- 1. Live Connections Module -->
        <div class="module-card connection-module">
            <div class="module-header">
                <IconBadge iconName="sensors" bgColor="#10b981" color="#ffffff" size="1.1rem" padding="0.4rem" />
                <div class="header-text">
                    <h2>Live Connections</h2>
                    <span class="header-subtitle">Real-time WebSocket client connection status</span>
                </div>
                <Badge variant="success" size="lg">{stats.connectedClients} Connected</Badge>
            </div>
            <div class="connection-metric-grid">
                <div class="metric-block">
                    <span class="metric-number">{stats.connectedClients}</span>
                    <span class="metric-caption">Connected Clients</span>
                </div>
                <div class="metric-block">
                    <span class="metric-number">{stats.clientIds.length}</span>
                    <span class="metric-caption">Active Client IDs</span>
                </div>
                <div class="metric-block">
                    <span class="metric-number">{new Date(stats.timestamp).toLocaleTimeString()}</span>
                    <span class="metric-caption">Last Sync Time</span>
                </div>
            </div>
        </div>

        <!-- 2. Telemetry Banner Module -->
        <div class="module-card telemetry-module">
            <div class="module-header">
                <IconBadge iconName="timeline" bgColor="#3b82f6" color="#ffffff" size="1.1rem" padding="0.4rem" />
                <div class="header-text">
                    <h2>Stream Telemetry</h2>
                    <span class="header-subtitle">Event throughput and active data channels</span>
                </div>
            </div>
            <div class="telemetry-bar">
                <div class="telemetry-item">
                    <IconBadge iconName="speed" bgColor="#2563eb" color="#ffffff" size="1.25rem" />
                    <div class="telemetry-data">
                        <span class="telemetry-val">{metrics.totalEvents}</span>
                        <span class="telemetry-lbl">Total Events Streamed</span>
                    </div>
                </div>
                <div class="telemetry-item">
                    <IconBadge iconName="category" bgColor="#8b5cf6" color="#ffffff" size="1.25rem" />
                    <div class="telemetry-data">
                        <span class="telemetry-val">{Object.keys(metrics.eventsByType || {}).length}</span>
                        <span class="telemetry-lbl">Registered Event Types</span>
                    </div>
                </div>
                <div class="telemetry-item">
                    <IconBadge iconName="update" bgColor="#0284c7" color="#ffffff" size="1.25rem" />
                    <div class="telemetry-data">
                        <span class="telemetry-val">{new Date(metrics.timestamp).toLocaleTimeString()}</span>
                        <span class="telemetry-lbl">Metrics Timestamp</span>
                    </div>
                </div>
            </div>
        </div>

        {#if Object.keys(metrics.eventsByType || {}).length > 0}
            <!-- 3. Distribution Grid Module -->
            <div class="module-card distribution-module">
                <div class="module-header">
                    <IconBadge iconName="bar_chart" bgColor="#10b981" color="#ffffff" size="1.1rem" padding="0.4rem" />
                    <div class="header-text">
                        <h2>Event Distribution</h2>
                        <span class="header-subtitle">Traffic frequency breakdown by event type</span>
                    </div>
                </div>
                <div class="event-types-grid">
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
            </div>
        {/if}

        <!-- 4. Real-time Stream Table -->
        <Table
            name="admin-events-stream"
            data={filteredHistory}
            columns={eventColumns}
            toolbar={tableToolbar}
            expandable
            expandedRow={eventExpandedPayload}
            resizable
            emptyMessage="No event records found"
        />
    </div>
</AdminRouteShell>

<style lang="scss">
    .admin-page-content {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-lg);
    }

    .module-card {
        background-color: var(--viz-surface-card);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        padding: var(--viz-spacing-lg);
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-md);
    }

    .module-header {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-sm);

        .header-text {
            display: flex;
            flex-direction: column;
            gap: 2px;
            flex: 1;
        }

        .header-subtitle {
            color: var(--viz-text-secondary);
        }

        h2 {
            margin: 0;
            font-size: var(--viz-font-size-lg);
            font-weight: 600;
            color: var(--viz-text-primary);
        }
    }

    .connection-metric-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--viz-spacing-md);

        @media (max-width: 768px) {
            grid-template-columns: 1fr;
        }

        .metric-block {
            display: flex;
            flex-direction: column;
            gap: var(--viz-spacing-xxs);
            padding: var(--viz-spacing-md) var(--viz-spacing-lg);
            background-color: var(--viz-surface-panel);
            border: var(--viz-border-thin);
            border-radius: var(--viz-border-radius-md);

            .metric-number {
                font-size: var(--viz-font-size-3xl);
                font-weight: 700;
                font-family: var(--viz-mono-font);
                color: var(--viz-text-primary);
                line-height: 1.1;
            }

            .metric-caption {
                font-size: var(--viz-font-size-std);
                color: var(--viz-text-secondary);
                font-weight: 500;
            }
        }
    }

    .telemetry-bar {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--viz-spacing-md);

        @media (max-width: 768px) {
            grid-template-columns: 1fr;
        }

        .telemetry-item {
            display: flex;
            align-items: center;
            gap: var(--viz-spacing-md);
            padding: var(--viz-spacing-md) var(--viz-spacing-lg);
            background-color: var(--viz-surface-panel);
            border: var(--viz-border-thin);
            border-radius: var(--viz-border-radius-md);

            .telemetry-data {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }

            .telemetry-val {
                font-size: var(--viz-font-size-xl);
                font-weight: 700;
                font-family: var(--viz-mono-font);
                color: var(--viz-text-primary);
            }

            .telemetry-lbl {
                color: var(--viz-text-secondary);
            }
        }
    }

    .event-types-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: var(--viz-spacing-md);
    }

    .event-type-card {
        padding: var(--viz-spacing-md);
        background-color: var(--viz-surface-panel);
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
        font-size: var(--viz-font-size-std);
        color: var(--viz-text-primary);
        font-family: var(--viz-mono-font);
    }

    .event-type-count {
        color: var(--viz-text-secondary);
        font-family: var(--viz-mono-font);
    }

    .event-type-bar {
        height: 6px;
        background-color: var(--viz-surface-hover);
        border-radius: var(--viz-border-radius-pill);
        overflow: hidden;
    }

    .event-type-fill {
        height: 100%;
        background-color: var(--viz-primary);
        border-radius: var(--viz-border-radius-pill);
        transition: width 0.3s ease;
    }

    .console-controls {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-md);
        flex-wrap: wrap;
        width: 100%;

        .filter-group {
            width: 12.5rem;
        }
    }

    .client-tag {
        display: inline-flex;
        align-items: center;
        gap: var(--viz-spacing-xs);
        color: var(--viz-text-secondary);
    }

    .timestamp-cell {
        color: var(--viz-text-muted);
    }

    .stream-payload {
        padding: var(--viz-spacing-sm) 0;

        .payload-title {
            color: var(--viz-text-muted);
            font-family: var(--viz-mono-font);
            margin-bottom: var(--viz-spacing-xs);
        }

        .json-box {
            margin: 0;
            padding: var(--viz-spacing-md);
            background-color: var(--viz-surface-card);
            border: var(--viz-border-thin);
            border-radius: var(--viz-border-radius-md);
            overflow-x: auto;
            font-family: var(--viz-mono-font);
            color: var(--viz-text-primary);
            line-height: 1.5;
        }
    }
</style>
