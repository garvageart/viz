<script lang="ts">
    import { type WorkerInfo } from "@viz/api";
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";
    import AdminRouteShell from "$lib/components/admin/AdminRouteShell.svelte";
    import Badge from "$lib/components/ui/Badge.svelte";
    import Banner from "$lib/components/ui/Banner.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import IconBadge from "$lib/components/ui/IconBadge.svelte";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import SearchInput from "$lib/components/ui/SearchInput.svelte";
    import Table, { type TableColumn } from "$lib/components/ui/Table.svelte";
    import { jobsState } from "$lib/states/jobs.svelte";
    import type { MaterialSymbol } from "$lib/types/MaterialSymbol.js";

    let activeTab = $state<"all" | "success" | "failed">("all");
    let searchQuery = $state("");
    let workerTypes = $derived(jobsState.workers.types.toSorted((a, b) => a.name.localeCompare(b.name)));

    function getEndTimeDate(job: any): Date {
        if (!job.endTime) {
            return job.startTime ? new Date(job.startTime) : new Date();
        }
        return job.endTime instanceof Date ? job.endTime : new Date(job.endTime);
    }

    function getStartTimeDate(job: any): Date {
        if (!job.startTime) {
            return new Date();
        }
        return job.startTime instanceof Date ? job.startTime : new Date(job.startTime);
    }

    let unifiedHistory = $derived.by(() => {
        const completed = jobsState.completedJobs;
        const failed = jobsState.failedJobs;
        const all = [...completed, ...failed];
        all.sort((a, b) => {
            const timeA = getEndTimeDate(a).getTime();
            const timeB = getEndTimeDate(b).getTime();
            return timeB - timeA;
        });
        return all;
    });

    let filteredHistory = $derived.by(() => {
        let list = unifiedHistory;

        if (activeTab === "success") {
            list = list.filter((j) => {
                return j.status === "completed";
            });
        } else if (activeTab === "failed") {
            list = list.filter((j) => {
                return j.status === "failed";
            });
        }

        const query = searchQuery.trim().toLowerCase();
        if (query) {
            list = list.filter((j) => {
                const filename = (j.filename || "").toLowerCase();
                const imageUid = (j.image_uid || "").toLowerCase();
                const uid = (j.uid || "").toLowerCase();
                const error = (j.error || "").toLowerCase();
                const type = (j.type || j.topic || "").toLowerCase();
                return (
                    filename.includes(query) ||
                    imageUid.includes(query) ||
                    uid.includes(query) ||
                    error.includes(query) ||
                    type.includes(query)
                );
            });
        }

        return list;
    });

    function formatDuration(start: Date, end: Date) {
        const ms = end.getTime() - start.getTime();
        if (ms < 1000) {
            return `${ms}ms`;
        }
        if (ms < 60000) {
            return `${(ms / 1000).toFixed(1)}s`;
        }
        return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    }

    const historyColumns: TableColumn<any>[] = [
        { key: "status", header: "Status", cell: statusCell, width: "6rem", sortable: true },
        { key: "target", header: "Target", cell: targetCell, mono: true, sortable: true },
        { key: "type", header: "Type", cell: typeCell, sortable: true },
        { key: "duration", header: "Duration", cell: durationCell, mono: true, sortable: true },
        { key: "endTime", header: "Completed At", cell: endTimeCell, mono: true, sortable: true }
    ];

    onMount(() => {
        void jobsState.init();
    });
</script>

{#snippet statCard({
    iconName: icon,
    value,
    label,
    cardClass,
    delay
}: {
    iconName: MaterialSymbol;
    value: string | number;
    label: string;
    cardClass: string;
    delay: number;
})}
    <div class={["stat-card", cardClass]} in:fade={{ delay }}>
        <div class="stat-icon">
            <MaterialIcon iconName={icon} />
        </div>
        <div class="stat-content">
            <span class="stat-value">{value}</span>
            <span class="stat-label">{label}</span>
        </div>
    </div>
{/snippet}

{#snippet workerCard(job: WorkerInfo)}
    <div class="worker-card">
        <div class="worker-header">
            <div class="worker-id">
                <span class="worker-name">{jobsState.getTopicForJobType(job.name)}</span>
                <span
                    class="worker-dot {(jobsState.runningByTopic[jobsState.getTopicForJobType(job.name)] || 0) > 0
                        ? 'active'
                        : 'idle'}"
                ></span>
            </div>
            <div class="worker-stats">
                <span class="stat-badge running" title="Active">
                    {jobsState.runningByTopic[jobsState.getTopicForJobType(job.name)] || 0}
                </span>
                <span class="stat-badge queued" title="Queued">
                    {jobsState.queuedByTopic[jobsState.getTopicForJobType(job.name)] || 0}
                </span>
            </div>
        </div>

        <div class="worker-actions">
            <Button
                iconName="refresh"
                size="small"
                class="worker-icon-btn"
                onclick={() => {
                    jobsState.rescanAll(job.name);
                }}
                title="Rescan All"
            ></Button>
            <Button
                iconName="search"
                size="small"
                class="worker-icon-btn"
                onclick={() => {
                    jobsState.rescanMissing(job.name);
                }}
                title="Rescan Missing"
            ></Button>
        </div>

        <div class="concurrency-row">
            <span class="concurrency-label">Concurrency</span>
            <div class="concurrency-input">
                <Button
                    class="step-btn"
                    onclick={() => {
                        jobsState.setWorkerConcurrency(
                            job.name,
                            Math.max(1, (jobsState.workers.concurrency[job.name] || 5) - 1)
                        );
                    }}>-</Button
                >
                <span class="step-value">{jobsState.workers.concurrency[job.name] || 5}</span>
                <Button
                    class="step-btn"
                    onclick={() => {
                        jobsState.setWorkerConcurrency(
                            job.name,
                            Math.min(50, (jobsState.workers.concurrency[job.name] || 5) + 1)
                        );
                    }}>+</Button
                >
            </div>
        </div>
    </div>
{/snippet}

{#snippet statusCell(job: any)}
    <IconBadge
        iconName={job.status === "completed" ? "check" : "error"}
        variant={job.status === "completed" ? "success" : "error"}
        shape="circle"
        size="1rem"
        padding="0.35rem"
    />
{/snippet}

{#snippet targetCell(job: any)}
    <span class="job-title-text" title={job.filename || job.image_uid || job.uid}>
        {job.filename || job.image_uid || job.uid}
    </span>
{/snippet}

{#snippet typeCell(job: any)}
    <Badge variant="neutral" size="std">{(job.type || job.topic).toUpperCase()}</Badge>
{/snippet}

{#snippet durationCell(job: any)}
    {#if job.status === "completed"}
        <span>{formatDuration(getStartTimeDate(job), getEndTimeDate(job))}</span>
    {:else}
        <span class="job-error-duration">Failed</span>
    {/if}
{/snippet}

{#snippet endTimeCell(job: any)}
    <span class="job-time-cell">{getEndTimeDate(job).toLocaleString()}</span>
{/snippet}

{#snippet jobExpandedRow(job: any)}
    <div class="job-expanded-details">
        {#if job.error}
            <Banner variant="error" title="Execution Error" message={job.error} />
        {/if}
        <div class="job-meta-grid">
            <div class="meta-item">
                <span class="meta-label">ID</span>
                <span class="meta-value font-mono">{job.uid || "N/A"}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">Image UID</span>
                <span class="meta-value font-mono">{job.image_uid || "N/A"}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">Filename</span>
                <span class="meta-value font-mono">{job.filename || "N/A"}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">Start Time</span>
                <span class="meta-value font-mono">{getStartTimeDate(job).toLocaleString()}</span>
            </div>
        </div>
    </div>
{/snippet}

{#snippet historyToolbar()}
    <div class="table-history-toolbar">
        <div class="history-tabs">
            <button
                type="button"
                class="history-tab"
                class:active={activeTab === "all"}
                onclick={() => {
                    activeTab = "all";
                }}
            >
                All <span class="tab-badge">{jobsState.completedJobs.length + jobsState.failedJobs.length}</span>
            </button>
            <button
                type="button"
                class="history-tab success"
                class:active={activeTab === "success"}
                onclick={() => {
                    activeTab = "success";
                }}
            >
                Success <span class="tab-badge">{jobsState.completedJobs.length}</span>
            </button>
            <button
                type="button"
                class="history-tab failed"
                class:active={activeTab === "failed"}
                onclick={() => {
                    activeTab = "failed";
                }}
            >
                Failed <span class="tab-badge">{jobsState.failedJobs.length}</span>
            </button>
        </div>

        <SearchInput
            inputId="history-search"
            placeholder="Search..."
            bind:value={searchQuery}
            style="flex: 1; min-width: 20rem;"
        />
    </div>
{/snippet}

<AdminRouteShell heading="Job Manager" description="Monitor and manage background jobs">
    {#snippet actions()}
        <div class="connection-status" class:connected={jobsState.connected}>
            <span class="status-dot"></span>
            <span class="status-text">
                {jobsState.connected ? "WebSocket Connected" : "WebSocket Disconnected"}
            </span>
        </div>
    {/snippet}

    <div class="jobs-dashboard">
        <!-- Statistics Section (Full Width at Top) -->
        <section class="dashboard-section stats-section">
            <div class="stats-grid">
                {@render statCard({
                    iconName: "pending",
                    value: jobsState.stats.activeCount,
                    label: "Active Jobs",
                    cardClass: "active",
                    delay: 0
                })}

                {@render statCard({
                    iconName: "check_circle",
                    value: jobsState.stats.completedCount,
                    label: "Completed",
                    cardClass: "completed",
                    delay: 100
                })}

                {@render statCard({
                    iconName: "error",
                    value: jobsState.stats.failedCount,
                    label: "Failed",
                    cardClass: "failed",
                    delay: 200
                })}

                {@render statCard({
                    iconName: "analytics",
                    value: jobsState.stats.totalProcessed,
                    label: "Total Processed",
                    cardClass: "total",
                    delay: 300
                })}
            </div>
        </section>

        <!-- Two-column dashboard layout -->
        <div class="dashboard-content-grid">
            <div class="main-column">
                <!-- Realtime Processing (Active Jobs) -->
                <section class="dashboard-section prominent">
                    <div class="section-header">
                        <div class="header-title">
                            <MaterialIcon iconName="bolt" class="title-icon highlight" />
                            <h2>Realtime Processing</h2>
                        </div>
                        <Badge variant="info">{jobsState.activeJobs.length}</Badge>
                    </div>

                    <div class="jobs-list active-list">
                        {#each jobsState.activeJobs as job (job.uid)}
                            <div class="job-card active">
                                <div class="job-card-main">
                                    <div class="job-info">
                                        <div class="job-icon-wrapper">
                                            <MaterialIcon iconName="image" />
                                        </div>
                                        <div class="job-details">
                                            <div class="job-title" title={job.filename || job.image_uid || job.uid}>
                                                {job.filename || job.image_uid || job.uid}
                                            </div>
                                            <div class="job-meta">
                                                <span class="job-type-tag">{job.type || job.topic}</span>
                                                <span class="separator">•</span>
                                                <span class="job-time">
                                                    Started {job.startTime
                                                        ? job.startTime.toLocaleTimeString()
                                                        : "just now"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="job-progress-section">
                                        <div class="progress-info">
                                            <span class="job-step">{job.step || "Initializing..."}</span>
                                            <span class="progress-value">{job.progress || 0}%</span>
                                        </div>
                                        <div class="progress-bar-container">
                                            <div class="progress-bar-fill" style="width: {job.progress || 0}%"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        {/each}

                        {#if jobsState.activeJobs.length === 0}
                            <div class="empty-state-placeholder">
                                <MaterialIcon iconName="work_history" class="empty-icon" />
                                <p>No active jobs at the moment</p>
                            </div>
                        {/if}
                    </div>
                </section>

                <!-- Unified Job History Section -->
                <section class="dashboard-section history-table-section">
                    <div class="section-header-history">
                        <div class="header-title">
                            <MaterialIcon iconName="history" class="title-icon" />
                            <h2>Job History</h2>
                        </div>
                    </div>

                    <Table
                        name="admin-job-history"
                        data={filteredHistory}
                        columns={historyColumns}
                        toolbar={historyToolbar}
                        expandable
                        expandedRow={jobExpandedRow}
                        columnLines
                        resizable
                        columnsEditable
                        emptyMessage={searchQuery ? "No history matches your search" : "No job history yet"}
                    />
                </section>
            </div>

            <!-- Side column (Available Workers) -->
            <div class="side-column">
                <!-- Available Workers -->
                <section class="dashboard-section workers-section">
                    <div class="section-header-compact">
                        <h3>Available Workers</h3>
                        <Button
                            iconName="refresh"
                            size="small"
                            class="worker-icon-btn"
                            onclick={() => {
                                jobsState.fetchJobTypes();
                            }}
                            disabled={jobsState.workers.loading}
                        ></Button>
                    </div>

                    {#if jobsState.workers.loading}
                        <div class="side-loading">
                            <div class="spinner-small"></div>
                            <span>Updating registry...</span>
                        </div>
                    {:else}
                        <div class="job-types-list">
                            {#each workerTypes as job}
                                {@render workerCard(job)}
                            {/each}
                        </div>
                    {/if}
                </section>
            </div>
        </div>
    </div>
</AdminRouteShell>

<style lang="scss">
    .jobs-dashboard {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xl);
    }

    .dashboard-content-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 25rem;
        gap: var(--viz-spacing-xl);
        align-items: start;

        @media (max-width: 1024px) {
            grid-template-columns: 1fr;
        }
    }

    .main-column {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xl);
    }

    .side-column {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xl);
        position: sticky;
        top: var(--viz-spacing-xl);
    }

    .dashboard-section {
        background-color: var(--viz-surface-card);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        padding: var(--viz-spacing-xl);
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-lg);

        &.stats-section {
            min-height: 7rem;
            padding: 0;
            background: transparent;
            border: none;
        }

        &.prominent {
            height: 25rem;
            display: flex;
            flex-direction: column;
        }

        &.history-table-section {
            min-height: 25rem;
            display: flex;
            flex-direction: column;
        }

        &.workers-section {
            min-height: 20rem;

            :global(.worker-icon-btn) {
                border-color: var(--viz-border-subtle);

                &:hover:not(:disabled) {
                    border-color: var(--viz-surface-hover);
                }

                &:disabled {
                    border-color: transparent;
                }
            }
        }
    }

    .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: var(--viz-border-thin);
        padding-bottom: var(--viz-spacing-sm);
        margin: 0;

        .header-title {
            display: flex;
            align-items: center;
            gap: var(--viz-spacing-sm);

            h2 {
                margin: 0;
                font-size: var(--viz-font-size-2xl);
                font-weight: 600;
                color: var(--viz-text-primary);
            }

            :global(.title-icon) {
                color: var(--viz-text-secondary);
                font-size: var(--viz-font-size-3xl);

                &.highlight {
                    color: var(--viz-primary);
                }
                &.error-text {
                    color: var(--viz-error-color);
                }
            }
        }
    }

    .section-header-history {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        border-bottom: var(--viz-border-thin);
        padding-bottom: var(--viz-spacing-sm);
        margin: 0;

        @media (max-width: 600px) {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--viz-spacing-md);
        }

        .header-title {
            display: flex;
            align-items: center;
            gap: var(--viz-spacing-sm);

            h2 {
                margin: 0;
                font-size: var(--viz-font-size-2xl);
                font-weight: 600;
                color: var(--viz-text-primary);
            }

            :global(.title-icon) {
                color: var(--viz-text-secondary);
                font-size: var(--viz-font-size-3xl);
            }
        }
    }

    .history-tabs {
        display: flex;
        gap: var(--viz-spacing-xs);
        border-bottom: var(--viz-border-thin);
        padding-bottom: var(--viz-spacing-xxs);
    }

    .history-tab {
        background: transparent;
        border: none;
        padding: var(--viz-spacing-xs) var(--viz-spacing-md);
        font-size: var(--viz-font-size-std);
        font-weight: 600;
        color: var(--viz-text-secondary);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-sm);
        transition:
            color 0.15s ease,
            border-color 0.15s ease;
        border-bottom: 2px solid transparent;
        margin-bottom: -2px;

        &:hover {
            color: var(--viz-text-primary);
        }

        &.active {
            color: var(--viz-text-primary);
            border-bottom-color: var(--viz-primary);

            .tab-badge {
                background-color: var(--viz-primary);
                color: var(--viz-10-dark);
            }
        }

        &.success.active {
            color: var(--viz-text-primary);
            border-bottom-color: var(--viz-success-color);

            .tab-badge {
                background-color: var(--viz-success-color);
                color: #ffffff;
            }
        }

        &.failed.active {
            color: var(--viz-text-primary);
            border-bottom-color: var(--viz-error-color);

            .tab-badge {
                background-color: var(--viz-error-color);
                color: #ffffff;
            }
        }

        .tab-badge {
            font-family: var(--viz-mono-font);
            font-size: 10px;
            padding: 1px var(--viz-spacing-xs);
            background-color: var(--viz-surface-hover);
            border-radius: var(--viz-border-radius-sm);
            color: var(--viz-text-secondary);
            transition:
                background-color 0.15s ease,
                color 0.15s ease;
        }
    }

    .table-history-toolbar {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-md);
        flex-wrap: wrap;
        width: 100%;
    }

    .section-header-compact {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: var(--viz-border-thin);
        padding-bottom: var(--viz-spacing-sm);

        h3 {
            margin: 0;
            font-size: var(--viz-font-size-lg);
            font-weight: 600;
            color: var(--viz-text-primary);
        }
    }

    .badge {
        padding: 2px var(--viz-spacing-sm);
        background-color: var(--viz-surface-panel);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-pill);
        font-size: var(--viz-font-size-std);
        font-family: var(--viz-mono-font);
        font-weight: 600;
        color: var(--viz-text-muted);

        &.highlight {
            background-color: var(--viz-primary);
            border-color: var(--viz-primary);
            color: var(--viz-10-dark);
        }
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: var(--viz-spacing-md);
    }

    .stat-card {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-md);
        padding: var(--viz-spacing-lg);
        background-color: var(--viz-surface-card);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        transition:
            border-color 0.2s ease,
            background-color 0.2s ease;

        &:hover {
            border-color: var(--viz-border-subtle);
            background-color: var(--viz-surface-panel);
        }

        .stat-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 3rem;
            height: 3rem;
            border-radius: var(--viz-border-radius-md);
            background-color: var(--viz-surface-panel);
            color: var(--viz-text-primary);
            transition:
                background-color 0.2s ease,
                color 0.2s ease;

            :global(.viz-material-icon) {
                font-size: var(--viz-font-size-3xl);
            }
        }

        .stat-content {
            display: flex;
            flex-direction: column;
            gap: var(--viz-spacing-xxs);
        }

        .stat-value {
            font-size: var(--viz-font-size-3xl);
            font-weight: 700;
            font-family: var(--viz-mono-font);
            line-height: 1.2;
            color: var(--viz-text-primary);
        }

        .stat-label {
            font-size: var(--viz-font-size-std);
            color: var(--viz-text-secondary);
        }

        &.active {
            border-color: color-mix(in srgb, var(--viz-primary) 40%, var(--viz-border-subtle));

            .stat-icon {
                background-color: var(--viz-primary);
                color: var(--viz-10-dark);
            }
        }

        &.completed {
            border-color: color-mix(in srgb, var(--viz-success-color) 40%, var(--viz-border-subtle));

            .stat-icon {
                background-color: var(--viz-success-color);
                color: #ffffff;
            }
        }

        &.failed {
            border-color: color-mix(in srgb, var(--viz-error-color) 40%, var(--viz-border-subtle));

            .stat-icon {
                background-color: var(--viz-error-color);
                color: #ffffff;
            }
        }

        &.total {
            border-color: color-mix(in srgb, var(--viz-info-color) 40%, var(--viz-border-subtle));

            .stat-icon {
                background-color: var(--viz-info-color);
                color: #ffffff;
            }
        }
    }

    .jobs-list {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-sm);
        flex: 1;
        overflow-y: auto;
        padding-right: var(--viz-spacing-xs);
        min-height: 0;

        &::-webkit-scrollbar {
            width: 6px;
        }
        &::-webkit-scrollbar-track {
            background: transparent;
        }
        &::-webkit-scrollbar-thumb {
            background: var(--viz-surface-hover);
            border-radius: var(--viz-border-radius-pill);
        }
        &::-webkit-scrollbar-thumb:hover {
            background: var(--viz-border-subtle);
        }
    }

    .job-card {
        background-color: var(--viz-surface-panel);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        overflow: hidden;
        flex-shrink: 0;
        transition: border-color 0.2s ease;

        &:hover {
            border-color: var(--viz-border-subtle);
        }

        &.active {
            border-left: 4px solid var(--viz-primary);
        }

        .job-card-main {
            padding: var(--viz-spacing-md) var(--viz-spacing-lg);
        }
    }

    .job-info {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-md);
        margin-bottom: var(--viz-spacing-sm);

        .job-icon-wrapper {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 2.5rem;
            height: 2.5rem;
            background-color: var(--viz-surface-hover);
            border-radius: var(--viz-border-radius-md);
            color: var(--viz-info-color);
        }

        .job-details {
            flex: 1;
            min-width: 0;

            .job-title {
                font-weight: 700;
                font-size: var(--viz-font-size-lg);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                color: var(--viz-text-primary);
            }

            .job-meta {
                display: flex;
                align-items: center;
                gap: var(--viz-spacing-xs);
                font-size: var(--viz-font-size-std);
                color: var(--viz-text-secondary);

                .job-type-tag {
                    background-color: var(--viz-surface-hover);
                    padding: 2px var(--viz-spacing-xs);
                    border-radius: var(--viz-border-radius-sm);
                    font-weight: 600;
                    text-transform: uppercase;
                    font-family: var(--viz-mono-font);
                }

                .job-time {
                    font-family: var(--viz-mono-font);
                }
            }
        }
    }

    .job-progress-section {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xs);

        .progress-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: var(--viz-font-size-std);

            .job-step {
                font-weight: 600;
                color: var(--viz-text-primary);
            }

            .progress-value {
                font-weight: 700;
                color: var(--viz-text-primary);
                font-family: var(--viz-mono-font);
            }
        }
    }

    .progress-bar-container {
        height: var(--viz-spacing-xs);
        background-color: var(--viz-surface-hover);
        border-radius: var(--viz-border-radius-sm);
        overflow: hidden;
        position: relative;
    }

    .progress-bar-fill {
        height: 100%;
        background-color: var(--viz-primary);
        border-radius: var(--viz-border-radius-sm);
        position: relative;
        overflow: hidden;
    }

    .job-error-duration {
        color: var(--viz-error-color);
        font-weight: 600;
    }

    .job-time-cell {
        color: var(--viz-text-muted);
    }

    .job-expanded-details {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-md);
        padding: var(--viz-spacing-sm) 0;

        .job-meta-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: var(--viz-spacing-md);
            padding: var(--viz-spacing-md);
            background-color: var(--viz-surface-panel);
            border: var(--viz-border-thin);
            border-radius: var(--viz-border-radius-md);

            .meta-item {
                display: flex;
                flex-direction: column;
                gap: var(--viz-spacing-xxs);

                .meta-label {
                    color: var(--viz-text-secondary);
                }

                .meta-value {
                    font-size: var(--viz-font-size-std);
                    color: var(--viz-text-primary);
                    word-break: break-all;
                }
            }
        }
    }

    .job-types-list {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-md);
    }

    .worker-card {
        background-color: var(--viz-surface-panel);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        padding: var(--viz-spacing-md);
        transition: border-color 0.2s ease;

        &:hover {
            border-color: var(--viz-border-subtle);
        }

        .worker-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--viz-spacing-sm);

            .worker-id {
                display: flex;
                align-items: center;
                gap: var(--viz-spacing-xs);

                .worker-name {
                    font-weight: 700;
                    font-size: var(--viz-font-size-lg);
                    color: var(--viz-text-primary);
                }

                .worker-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;

                    &.active {
                        background-color: var(--viz-success-color);
                        box-shadow: 0 0 4px var(--viz-success-color);
                    }
                    &.idle {
                        background-color: var(--viz-border-subtle);
                    }
                }
            }

            .worker-stats {
                display: flex;
                gap: var(--viz-spacing-xxs);

                .stat-badge {
                    padding: 2px var(--viz-spacing-xs);
                    border-radius: var(--viz-border-radius-sm);
                    font-size: var(--viz-font-size-std);
                    font-weight: 700;
                    font-family: var(--viz-mono-font);

                    &.running {
                        background-color: var(--viz-info-color);
                        color: #ffffff;
                        border: 1px solid var(--viz-info-color);
                    }
                    &.queued {
                        background-color: var(--viz-surface-hover);
                        color: var(--viz-text-primary);
                        border: var(--viz-border-thin);
                    }
                }
            }
        }

        .worker-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: var(--viz-spacing-xs);
            margin-bottom: var(--viz-spacing-sm);
        }

        .concurrency-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: var(--viz-spacing-sm);
            border-top: var(--viz-border-thin);

            .concurrency-label {
                font-size: var(--viz-font-size-std);
                font-weight: 600;
                color: var(--viz-text-secondary);
            }

            .concurrency-input {
                display: flex;
                align-items: center;
                background-color: var(--viz-surface-hover);
                border-radius: var(--viz-border-radius-pill);
                overflow: hidden;
                border: var(--viz-border-thin);

                :global(.step-btn) {
                    width: 1.5rem;
                    height: 1.5rem;
                    background: transparent;
                    border-color: transparent;

                    &:hover {
                        border: inherit;
                        background-color: var(--viz-border-subtle);
                    }
                }

                .step-value {
                    width: 2rem;
                    text-align: center;
                    font-size: var(--viz-font-size-std);
                    font-weight: 700;
                    font-family: var(--viz-mono-font);
                    color: var(--viz-text-primary);
                }
            }
        }
    }

    .connection-status {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-sm);
        padding: var(--viz-spacing-xs) var(--viz-spacing-md);
        border-radius: var(--viz-border-radius-pill);
        font-size: var(--viz-font-size-std);
        font-weight: 700;
        background-color: var(--viz-surface-panel);
        color: var(--viz-text-secondary);
        border: var(--viz-border-thin);
        transition:
            background-color 0.2s ease,
            border-color 0.2s ease,
            color 0.2s ease;

        .status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: var(--viz-border-subtle);
        }

        .status-text {
            flex: 1;
        }

        &.connected {
            background-color: color-mix(in srgb, var(--viz-success-color) 8%, var(--viz-surface-card));
            color: var(--viz-text-primary);
            border-color: color-mix(in srgb, var(--viz-success-color) 30%, var(--viz-border-subtle));

            .status-dot {
                background-color: var(--viz-success-color);
                animation: pulse 2s infinite;
            }
        }
    }

    @keyframes pulse {
        0% {
            opacity: 1;
        }
        50% {
            opacity: 0.5;
        }
        100% {
            opacity: 1;
        }
    }

    .empty-state-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        flex: 1;
        color: var(--viz-text-secondary);
        text-align: center;
        padding: var(--viz-spacing-xxl) var(--viz-spacing-std);
        border: 2px dashed var(--viz-surface-hover);
        border-radius: var(--viz-border-radius-md);

        :global(.empty-icon) {
            font-size: var(--viz-font-size-5xl);
            margin-bottom: var(--viz-spacing-sm);
        }

        p {
            font-size: var(--viz-font-size-lg);
            font-weight: 500;
            margin: 0;
        }
    }

    .side-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--viz-spacing-sm);
        padding: var(--viz-spacing-xl);
        color: var(--viz-text-secondary);
        font-size: var(--viz-font-size-std);
    }

    .spinner-small {
        width: 1rem;
        height: 1rem;
        border: 2px solid var(--viz-surface-hover);
        border-top-color: var(--viz-primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    .separator {
        margin: 0 var(--viz-spacing-xxs);
    }
</style>
