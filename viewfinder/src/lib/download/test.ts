import { onMount } from "svelte";
import { download } from "$lib/states/index.svelte";
import { DownloadFile, DownloadState } from "./asset.svelte";

export function setupDummyDownloads() {
    onMount(() => {
        download.files = [
            new DownloadFile("/api/assets/export/DSCF4921_portrait_cinematic.jpg", "DSCF4921_portrait_cinematic.jpg"),
            new DownloadFile("/api/assets/export/RAW_Nikon_Z9_Action_0823.nef", "RAW_Nikon_Z9_Action_0823.nef"),
            new DownloadFile("/api/assets/export/Studio_Portrait_Batch_Export.zip", "Studio_Portrait_Batch_Export.zip"),
            new DownloadFile("/api/assets/export/Corrupted_Export_Buffer.png", "Corrupted_Export_Buffer.png")
        ];

        download.files[0].progress = 100;
        download.files[0].state = DownloadState.DOWNLOADED;

        download.files[1].progress = 68;
        download.files[1].state = DownloadState.DOWNLOADING;

        download.files[2].progress = 32;
        download.files[2].state = DownloadState.PROCESSING;

        download.files[3].progress = 15;
        download.files[3].state = DownloadState.ERROR;
    });
}
