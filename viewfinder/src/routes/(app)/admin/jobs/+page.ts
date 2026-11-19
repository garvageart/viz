import { WorkerJobStatus, getJobStats, listJobTypes, listJobs } from "@viz/api";
import { jobsService } from "#lib/services/jobs.svelte.js";
import { sendVizAPIRequest } from "#lib/utils/http.js";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
    const [jobTypes, stats, running, completed, failed] = await Promise.all([
        sendVizAPIRequest(listJobTypes()),
        sendVizAPIRequest(getJobStats()),
        sendVizAPIRequest(listJobs({ status: WorkerJobStatus.Running, limit: 50 })),
        sendVizAPIRequest(listJobs({ status: WorkerJobStatus.Completed, limit: 50 })),
        sendVizAPIRequest(listJobs({ status: WorkerJobStatus.Failed, limit: 50 }))
    ]);

    jobsService.init({
        jobTypes: jobTypes.items.toSorted((a, b) => a.type.localeCompare(b.type)),
        stats,
        running,
        completed,
        failed
    });

    return {};
};
