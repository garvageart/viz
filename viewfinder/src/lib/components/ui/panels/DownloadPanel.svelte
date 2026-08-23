<script lang="ts">
    import { untrack } from "svelte";
    import { scale } from "svelte/transition";
    import {
        DownloadState,
        isDownloadActive,
        isDownloadCompleted,
        isDownloadRunning
    } from "$lib/download/asset.svelte";
    import { processDownloadQueue, waitForDownloadCompletion } from "$lib/download/manager.svelte";
    import { download } from "$lib/states/index.svelte";
    import Button from "../Button.svelte";
    import InputNumber from "../InputNumber.svelte";

    let minimized = $state(false);

    let listEl: HTMLDivElement | null = $state(null);

    let prevCompletedCount = $state(0);
    let prevFilesCount = $state(0);

    const prefersReducedMotion = () =>
        window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    $effect(() => {
        download.concurrency = Math.min(Math.max(download.concurrency || 1, 1), 10);
        untrack(() => {
            processDownloadQueue();
        });
    });

    $effect(() => {
        if (download.files.length > 0) {
            waitForDownloadCompletion(download.files).then(() => {
                setTimeout(() => {
                    // Double check that we are still done (user might have added more files during the 3s wait)
                    const allDone = download.files.every(isDownloadCompleted);

                    if (allDone) {
                        download.files = [];
                    }
                }, 3000);
            });
        }
    });

    $effect(() => {
        if (!listEl || download.files.length === 0) {
            prevCompletedCount = 0;
            prevFilesCount = 0;
            return;
        }

        // compute completed items
        const completed = download.files.filter(
            (f) =>
                f.state === DownloadState.DOWNLOADED ||
                f.state === DownloadState.ERROR ||
                f.state === DownloadState.CANCELED
        ).length;

        const filesCount = download.files.length;

        // Scroll whenever files are added or completed
        if (completed > prevCompletedCount || filesCount > prevFilesCount) {
            try {
                const behavior = prefersReducedMotion() ? "auto" : "smooth";

                // Find the last active download (the one furthest down the list that is actually downloading)
                let targetIndex = -1;
                for (let i = download.files.length - 1; i >= 0; i--) {
                    if (isDownloadRunning(download.files[i])) {
                        targetIndex = i;
                        break;
                    }
                }

                // If we found an active download, scroll it into view.
                if (targetIndex !== -1) {
                    const activeItem = listEl.children[targetIndex] as HTMLElement;
                    if (activeItem) {
                        activeItem.scrollIntoView({
                            behavior: behavior as ScrollBehavior,
                            block: "nearest"
                        });
                    }
                } else if (filesCount > prevFilesCount) {
                    // If new files were added but none are started yet, scroll to bottom
                    listEl.scrollTo({
                        top: listEl.scrollHeight,
                        behavior: behavior as ScrollBehavior
                    });
                }
            } catch (e) {
                // silently ignore DOM issues
            }
        }

        prevCompletedCount = completed;
        prevFilesCount = filesCount;
    });

    const isDownloading = $derived(download.files.some(isDownloadActive));

    const completedFiles = $derived(download.files.filter(isDownloadCompleted).length);
</script>

{#if minimized}
    <div id="viz-download-panel-minimized" in:scale={{ duration: 250 }} out:scale={{ duration: 250 }}>
        {#if isDownloading}
            <svg class="download-stroke-container">
                <rect class="download-stroke-rect" rx="26" ry="26" pathLength="100" />
            </svg>
        {/if}
        <Button
            id="viz-download-panel-minimized-button"
            variant="info"
            iconName="download"
            onclick={() => {
                minimized = false;
            }}
            title="Show Download Panel"
        >
            <span
                >{completedFiles}/{download.files.length} downloading file{download.files.length === 1 ? "" : "s"}</span
            >
        </Button>
    </div>
{:else}
    <div transition:scale={{ duration: 250 }} id="viz-download-panel">
        <div id="viz-download-panel-header">
            <div id="download-panel-header-info">
                <Button
                    iconName="arrow_downward_alt"
                    title="Minimize Download Panel"
                    onclick={() => {
                        minimized = true;
                    }}
                />
                <span>
                    Downloading {download.files.length} file{download.files.length === 1 ? "" : "s"}
                </span>
            </div>
            <div class="concurrency-control">
                <span class="concurrency-label" title="Maximum simultaneous downloads">Concurrent:</span>
                <InputNumber
                    id="download-concurrency-input"
                    aria-label="Maximum simultaneous downloads"
                    min={1}
                    max={10}
                    step={1}
                    compact={true}
                    bind:value={download.concurrency}
                />
            </div>
        </div>
        <div id="viz-download-panel-sub_header">
            <Button
                iconName="cancel"
                title="Cancel All Downloads"
                onclick={() => {
                    download.files.forEach((file) => {
                        if (isDownloadRunning(file)) {
                            file.cancelRequest();
                        }
                    });
                    download.files = [];
                }}
            />
            <span class="viz-download-progress-text">
                {completedFiles}/{download.files.length} completed
            </span>
        </div>
        <div id="viz-download-panel-list" bind:this={listEl}>
            {#each download.files as file}
                <div class="panel-file-info">
                    {#if isDownloadRunning(file)}
                        <Button
                            iconName="close"
                            title="Cancel Download"
                            onclick={() => {
                                file.cancelRequest();
                            }}
                        />
                    {/if}
                    <div class="panel-file-info-data_container">
                        <div class="panel-file-info-metadata">
                            <div class="panel-file">
                                <span class="viz-download-file-name" title={file.filename || file.url}
                                    >{file.filename || file.url}</span
                                >
                            </div>
                            {#if file.state === DownloadState.DOWNLOADED}
                                <span class="status-text success">Done</span>
                            {:else if file.state === DownloadState.PROCESSING}
                                <span class="status-text processing">Processing</span>
                            {:else if file.state === DownloadState.ERROR || file.state === DownloadState.CANCELED}
                                <span class="status-text error">Error</span>
                            {:else}
                                <span class="viz-download-progress-text">{Math.round(file.progress)}%</span>
                            {/if}
                        </div>
                        <div class="panel-file-info-progress-container">
                            <span
                                class="panel-file-info-progress"
                                class:complete={file.state === DownloadState.DOWNLOADED}
                                class:error={file.state === DownloadState.ERROR ||
                                    file.state === DownloadState.CANCELED}
                                style="width: {file.progress}%;"
                            >
                            </span>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    </div>
{/if}

<style lang="scss">
    #viz-download-panel {
        width: 25%;
        max-width: 25%;
        display: flex;
        flex-direction: column;
        position: absolute;
        bottom: var(--viz-spacing-xxl);
        right: var(--viz-spacing-xxl);
        background-color: var(--viz-surface-panel);
        z-index: var(--viz-z-floating-panel);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-lg);
        max-height: 60vh;
        overflow: hidden;
    }

    #viz-download-panel-minimized {
        position: absolute;
        bottom: var(--viz-spacing-xxl);
        right: var(--viz-spacing-xxl);
        z-index: var(--viz-z-floating-panel);
        display: flex;
        align-items: center;

        :global(#viz-download-panel-minimized-button) {
            height: 3.2rem;
            padding: 0 var(--viz-spacing-md);
            font-size: var(--viz-font-size-lg);
            font-weight: 600;
            border-radius: var(--viz-border-radius-pill);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
            gap: var(--viz-spacing-sm);
        }
    }

    .download-stroke-container {
        position: absolute;
        inset: -2px;
        width: calc(100% + 4px);
        height: calc(100% + 4px);
        pointer-events: none;
        z-index: 10000;
    }

    .download-stroke-rect {
        width: calc(100% - 2px);
        height: calc(100% - 2px);
        x: 1px;
        y: 1px;
        fill: none;
        stroke: white;
        stroke-width: 2px;
        stroke-dasharray: 25 75;
        animation: stroke-move 2s linear infinite;
    }

    @keyframes stroke-move {
        0% {
            stroke-dashoffset: 0;
        }
        100% {
            stroke-dashoffset: -100;
        }
    }

    #viz-download-panel-header {
        height: 3rem;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 var(--viz-spacing-std);
        font-size: var(--viz-font-size-lg);
        font-weight: 600;
        border-bottom: var(--viz-border-thin);
        background-color: var(--viz-surface-panel);
        box-sizing: border-box;
        gap: var(--viz-spacing-std);
    }

    #viz-download-panel-sub_header {
        width: 100%;
        display: flex;
        align-items: center;
        padding: var(--viz-spacing-sm) var(--viz-spacing-std);
        font-size: var(--viz-font-size-lg);
        font-weight: 600;
        border-bottom: var(--viz-border-thin);
        background-color: var(--viz-surface-card);
        box-sizing: border-box;
        gap: var(--viz-spacing-sm);
    }

    .viz-download-progress-text {
        font-style: italic;
        font-weight: 300;
        font-family: var(--viz-mono-font);
    }

    #download-panel-header-info {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--viz-spacing-sm);
        font-weight: 600;
    }

    .concurrency-control {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-xs);
        font-size: var(--viz-font-size-sm);
        font-weight: 500;

        .concurrency-label {
            color: var(--viz-text-secondary);
        }
    }

    #viz-download-panel-list {
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        overflow-y: auto;
        flex: 1;
        min-height: 0;
        padding-bottom: var(--viz-spacing-xs);
    }

    .panel-file-info {
        display: flex;
        flex-direction: row;
        position: relative;
        width: 100%;
        padding: var(--viz-spacing-sm) var(--viz-spacing-std);
        border-bottom: var(--viz-border-thin);
        background-color: var(--viz-surface-panel);
        box-sizing: border-box;

        &:hover {
            background-color: var(--viz-surface-panel);
        }
    }

    .panel-file {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xs);
        min-width: 0;
        overflow: hidden;
        flex: 1;
    }

    .panel-file-info-data_container {
        display: flex;
        flex-direction: column;
        margin-left: var(--viz-spacing-sm);
        width: 100%;
        min-width: 0;
    }

    .panel-file-info:last-child {
        border-bottom: none;
        margin-bottom: 0;
    }

    .panel-file-info-metadata {
        font-size: var(--viz-font-size-std);
        margin-bottom: var(--viz-spacing-sm);
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--viz-spacing-sm);
    }

    .viz-download-file-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 500;
        display: block;
    }

    .viz-download-progress-text {
        font-weight: 600;
        font-size: var(--viz-font-size-std);
        color: var(--viz-text-secondary);
        min-width: 40px;
        text-align: right;
    }

    .status-text {
        font-weight: 600;
        font-size: var(--viz-font-size-std);

        &.success {
            color: var(--viz-success-color);
        }

        &.processing {
            color: var(--viz-text-secondary);
        }

        &.error {
            color: var(--viz-error-color);
        }
    }

    .panel-file-info-progress-container {
        width: 100%;
        height: var(--viz-spacing-xs);
        background-color: var(--viz-border-subtle);
        border-radius: var(--viz-border-radius-sm);
        overflow: hidden;
        position: relative;
    }

    .panel-file-info-progress {
        height: 100%;
        background: linear-gradient(90deg, var(--viz-text-secondary), var(--viz-text-secondary));
        border-radius: var(--viz-border-radius-sm);
        transition: width 0.3s ease;
        display: block;
    }

    .panel-file-info-progress.complete {
        background: linear-gradient(
            90deg,
            var(--viz-success-color),
            color-mix(in srgb, var(--viz-success-color) 60%, var(--viz-text-secondary))
        );
    }

    .panel-file-info-progress.error {
        background: linear-gradient(
            90deg,
            var(--viz-error-color),
            color-mix(in srgb, var(--viz-error-color) 60%, var(--viz-text-secondary))
        );
    }

    @media (max-width: 40rem) {
        #viz-download-panel {
            width: 90%;
            max-width: 90%;
            right: auto;
            left: 50%;
            transform: translateX(-50%);
            bottom: var(--viz-spacing-std);
        }

        #viz-download-panel-minimized {
            right: auto;
            left: 50%;
            transform: translateX(-50%);
            bottom: var(--viz-spacing-std);
        }
    }
</style>
