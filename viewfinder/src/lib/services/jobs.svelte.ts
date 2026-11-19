/**
 * JobsService - Owns all state and communication for the admin jobs
 * dashboard: the WebSocket event stream, the HTTP stats/history
 * endpoints and the job type registry. Pages consume this service and
 * hold no jobs API state of their own.
 */
import {
    type JobListResponse,
    type JobStatsResponse,
    type JobType,
    type JobTypeName,
    type LiveJobCounts,
    type WSClient,
    type WorkerJob,
    WorkerJobStatus,
    createJob,
    createWSConnection,
    getJobStats,
    listJobTypes,
    listJobs,
    updateJobType
} from "@viz/api";
import { SvelteMap } from "svelte/reactivity";
import { toasts } from "#lib/toast-notifcations/toasts.svelte.js";

class JobsService {
    connected = $state(false);
    activeJobs = $state<WorkerJob[]>([]);
    completedJobs = $state<WorkerJob[]>([]);
    failedJobs = $state<WorkerJob[]>([]);
    stats = $state({
        active: 0,
        completed: 0,
        failed: 0,
        total: 0
    });
    /** Realtime running/queued counts, keyed by job type; every registered type has an entry. */
    readonly liveCounts = new SvelteMap<string, LiveJobCounts>();
    /** Progress percentage per job UID, fed by job-progress WS events. */
    readonly progressByJob = new SvelteMap<string, number>();
    jobTypes = $state<JobType[]>([]);
    jobTypesLoading = $state(false);

    private wsClient: WSClient | null = null;
    private refreshing = false;
    private refreshQueued = false;

    /**
     * Seed the dashboard from the data loaded by +page.ts and connect the
     * event stream. No HTTP requests are made for the initial payload.
     */
    init(data: {
        jobTypes: JobType[];
        stats: JobStatsResponse;
        running: JobListResponse;
        completed: JobListResponse;
        failed: JobListResponse;
    }) {
        this.jobTypes = data.jobTypes;
        this.applyStats(data.stats);
        this.applyRunning(data.running);
        this.applyHistory(data.completed, data.failed);
        this.connect();
    }

    private connect() {
        if (this.wsClient) {
            return;
        }

        this.wsClient = createWSConnection(
            (event, data) => {
                this.handleEvent(event, data);
            },
            (event) => {
                console.warn("WebSocket error:", event);
                this.connected = false;
            },
            () => {},
            (code, reason) => {
                if (this.connected && code !== 1000 && code !== 1001 && code !== 1005) {
                    toasts.add({
                        message: `WebSocket disconnected (${code}): ${reason}`,
                        type: "error"
                    });
                }
                this.connected = false;
            }
        );
    }

    private handleEvent(event: string, data: unknown) {
        if (event === "connected") {
            this.connected = true;
            void this.refresh();
            return;
        }

        const payload = (data ?? {}) as Record<string, unknown>;

        // job-started / job-completed / job-failed transition jobs between
        // lists; the database is the source of truth for history, so just
        // re-read it. Realtime counters come from the server's `live`
        // object in the stats response.
        if (event === "job-started" || event === "job-completed" || event === "job-failed") {
            void this.refresh();
            return;
        }

        if (event === "job-progress") {
            const uid = payload.uid;
            const progress = payload.progress;
            if (typeof uid === "string" && typeof progress === "number") {
                this.progressByJob.set(uid, progress);
            }
        }
    }

    /** Realtime running count for one job type. */
    liveRunning(type: string): number {
        return this.liveCounts.get(type)?.running ?? 0;
    }

    /** Realtime queued count for one job type. */
    liveQueued(type: string): number {
        return this.liveCounts.get(type)?.queued ?? 0;
    }

    /** Re-read stats and recent history from the server. */
    async refresh() {
        // Job bursts produce a flurry of transition events; coalesce them
        // into at most one extra pass after the in-flight refresh.
        if (this.refreshing) {
            this.refreshQueued = true;
            return;
        }

        this.refreshing = true;
        try {
            do {
                this.refreshQueued = false;
                await this.refreshFromServer();
            } while (this.refreshQueued);
        } finally {
            this.refreshing = false;
        }
    }

    private async refreshFromServer() {
        try {
            const [stats, running, completed, failed] = await Promise.all([
                getJobStats(),
                listJobs({ status: WorkerJobStatus.Running, limit: 50 }),
                listJobs({ status: WorkerJobStatus.Completed, limit: 50 }),
                listJobs({ status: WorkerJobStatus.Failed, limit: 50 })
            ]);

            if (stats.status === 200) {
                this.applyStats(stats.data);
            } else {
                console.warn("Failed to load job stats:", stats.status);
            }

            if (running.status === 200) {
                this.applyRunning(running.data);
            } else {
                console.warn("Failed to load running jobs:", running.status);
            }

            if (completed.status === 200 && failed.status === 200) {
                this.applyHistory(completed.data, failed.data);
            } else {
                console.warn("Failed to load job history:", completed.status, failed.status);
            }
        } catch (e) {
            console.warn("Failed to refresh jobs:", e);
        }
    }

    private applyHistory(completed: JobListResponse, failed: JobListResponse) {
        this.completedJobs = completed.items;
        this.failedJobs = failed.items;
        this.stats.completed = completed.total;
        this.stats.failed = failed.total;
        this.stats.total = this.stats.completed + this.stats.failed;
    }

    /** Apply the realtime counters from the stats endpoint. */
    private applyStats(stats: JobStatsResponse) {
        this.liveCounts.clear();
        for (const jobType of this.jobTypes) {
            // Ensure a zero entry even if the type is missing from the
            // payload, so the badge binding never sees undefined.
            this.liveCounts.set(jobType.type, { running: 0, queued: 0 });
        }

        let active = 0;
        for (const [type, counts] of Object.entries(stats.live)) {
            this.liveCounts.set(type, counts);
            active += counts.running;
        }

        this.stats.active = active;
    }

    /** Apply the currently running jobs list. */
    private applyRunning(running: JobListResponse) {
        this.activeJobs = running.items;

        // Drop progress entries for jobs that are no longer active.
        const activeUids = new Set(
            running.items.map((job) => {
                return job.uid;
            })
        );
        for (const uid of this.progressByJob.keys()) {
            if (!activeUids.has(uid)) {
                this.progressByJob.delete(uid);
            }
        }
    }

    /** Fetch the registered job types and their runtime configuration. */
    async fetchJobTypes() {
        this.jobTypesLoading = true;
        try {
            const res = await listJobTypes();
            if (res.status === 200) {
                this.jobTypes = res.data.items;
            } else {
                toasts.add({ message: "Failed to fetch job types", type: "error" });
            }
        } catch (e) {
            toasts.add({
                message: "Error fetching job types: " + (e instanceof Error ? e.message : String(e)),
                type: "error"
            });
        } finally {
            this.jobTypesLoading = false;
        }
    }

    /**
     * Trigger a rescan of all assets for a given job type.
     * Sends a createJob request with selection mode "all".
     */
    async rescanAll(jobType: string) {
        try {
            const res = await createJob({
                type: jobType as JobTypeName,
                data: { selection: { mode: "all" } }
            });
            if (res.status === 201) {
                toasts.add({
                    message: `Rescan all for ${jobType} started (${res.data.count} jobs)`,
                    type: "success"
                });
            } else {
                toasts.add({
                    message: `Failed to start rescan all for ${jobType}`,
                    type: "error"
                });
            }
        } catch (e) {
            toasts.add({
                message: "Error starting rescan all: " + (e instanceof Error ? e.message : String(e)),
                type: "error"
            });
        }
    }

    /**
     * Trigger a rescan of missing assets for a given job type.
     * Sends a createJob request with selection mode "missing".
     */
    async rescanMissing(jobType: string) {
        try {
            const res = await createJob({
                type: jobType as JobTypeName,
                data: { selection: { mode: "missing" } }
            });
            if (res.status === 201) {
                toasts.add({
                    message: `Rescan missing for ${jobType} started (${res.data.count} jobs)`,
                    type: "success"
                });
            } else {
                toasts.add({
                    message: `Failed to start rescan missing for ${jobType}`,
                    type: "error"
                });
            }
        } catch (e) {
            toasts.add({
                message: "Error starting rescan missing: " + (e instanceof Error ? e.message : String(e)),
                type: "error"
            });
        }
    }

    /** Return the display name for a job type, falling back to the raw type. */
    getTopicForJobType(type: string): string {
        const jt = this.jobTypes.find((t) => {
            return t.type === type;
        });
        return jt?.display_name || type;
    }

    /** Persist the active concurrency for one job type; nothing else is sent. */
    async saveConcurrency(jobType: JobType, value: number) {
        const clamped = Math.min(Math.max(1, Math.round(value)), jobType.concurrency.max);
        if (clamped === jobType.concurrency.current) {
            return;
        }

        try {
            const res = await updateJobType(jobType.type, {
                concurrency: { current: clamped }
            });

            if (res.status === 200) {
                const updated = res.data;
                this.jobTypes = this.jobTypes.map((t) => {
                    return t.type === updated.type ? updated : t;
                });
            } else {
                toasts.add({
                    message: `Failed to update ${jobType.display_name} concurrency`,
                    type: "error"
                });
            }
        } catch (e) {
            toasts.add({
                message: "Error updating concurrency: " + (e instanceof Error ? e.message : String(e)),
                type: "error"
            });
        }
    }
}

export const jobsService = new JobsService();
