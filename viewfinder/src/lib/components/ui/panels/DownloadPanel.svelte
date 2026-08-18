<script lang="ts">
    import { untrack } from "svelte";
    import { scale } from "svelte/transition";
    import { download } from "$lib/states/index.svelte";
    import { DownloadState } from "$lib/upload/asset.svelte";
    import { processDownloadQueue, waitForDownloadCompletion } from "$lib/upload/manager.svelte";
    import Button from "../Button.svelte";
    import MaterialIcon from "../MaterialIcon.svelte";

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
                    const allDone = download.files.every(
                        (f) =>
                            f.state === DownloadState.DOWNLOADED ||
                            f.state === DownloadState.ERROR ||
                            f.state === DownloadState.CANCELED
                    );

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
                    if (download.files[i].state === DownloadState.DOWNLOADING) {
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
</script>

{#if minimized}
    <div id="viz-download-panel-minimized" in:scale={{ duration: 250 }} out:scale={{ duration: 250 }}>
        <Button
            id="viz-download-panel-minimized-button"
            onclick={() => {
                minimized = false;
            }}
            title="Show Download Panel"
            style="background-color: var(--viz-primary); color: white;"
            hoverColor="var(--viz-primary)"
        >
            <MaterialIcon iconName="download" style="font-size: 1.5rem;" />
            <span>{download.files.length} downloading file{download.files.length === 1 ? "" : "s"}</span>
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
                    Downloads ({download.files.filter(
                        (f) =>
                            f.state === DownloadState.DOWNLOADED ||
                            f.state === DownloadState.ERROR ||
                            f.state === DownloadState.CANCELED
                    ).length}/{download.files.length})
                </span>
            </div>
            <Button
                iconName="cancel"
                style="background-color: transparent; padding: 0em;"
                hoverColor="var(--viz-surface-hover)"
                title="Cancel All Downloads"
                onclick={() => {
                    download.files.forEach((file) => {
                        if (file.state === DownloadState.DOWNLOADING) {
                            file.cancelRequest();
                        }
                    });
                    download.files = [];
                }}
            />
        </div>
        <div id="viz-download-panel-list" bind:this={listEl}>
            {#each download.files as file}
                <div class="panel-file-info">
                    <div class="panel-file-left">
                        {#if file.state === DownloadState.DOWNLOADING}
                            <button
                                class="cancel-file-btn"
                                title="Cancel Download"
                                onclick={() => {
                                    file.cancelRequest();
                                }}
                            >
                                <MaterialIcon iconName="close" style="font-size: 0.9rem;" />
                            </button>
                        {/if}
                        <span class="viz-download-file-name" class:has-cancel={file.state === DownloadState.DOWNLOADING}
                            >{file.filename || file.url}</span
                        >
                    </div>
                    <div class="panel-file-right">
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
                    <div class="panel-file-progress-bar">
                        <span
                            class="progress-fill"
                            class:complete={file.state === DownloadState.DOWNLOADED}
                            class:error={file.state === DownloadState.ERROR || file.state === DownloadState.CANCELED}
                            style="width: {file.progress}%;"
                        ></span>
                    </div>
                </div>
            {/each}
        </div>
    </div>
{/if}

<style lang="scss">
    #viz-download-panel {
        width: 20%;
        max-width: 20%;
        display: flex;
        flex-direction: column;
        position: absolute;
        bottom: var(--viz-spacing-xxl);
        right: var(--viz-spacing-xxl);
        background-color: var(--viz-surface-panel);
        z-index: 900;
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-lg);
        max-height: 50vh;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    #viz-download-panel-minimized {
        position: absolute;
        bottom: var(--viz-spacing-xxl);
        right: var(--viz-spacing-xxl);
        z-index: 900;
    }

    #viz-download-panel-header {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--viz-spacing-sm);
        font-size: var(--viz-font-size-lg);
        font-weight: 600;
        border-bottom: var(--viz-border-thin);
        background-color: var(--viz-surface-panel);
        box-sizing: border-box;
    }

    #download-panel-header-info {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--viz-spacing-sm);
        font-weight: 600;
    }

    #viz-download-panel-list {
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        font-family: var(--viz-mono-font);
        overflow-y: auto;
        flex: 1;
        min-height: 0;
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
        justify-content: space-between;
        align-items: center;

        &:hover {
            background-color: var(--viz-surface-panel);
        }
    }

    .panel-file-left {
        display: flex;
        align-items: center;
        min-width: 0;
        flex: 1;
    }

    .cancel-file-btn {
        background: none;
        border: none;
        padding: 0.15rem;
        margin-right: var(--viz-spacing-xs);
        cursor: pointer;
        color: var(--viz-text-primary);
        opacity: 0.6;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--viz-border-radius-pill);

        &:hover {
            opacity: 1;
            background-color: var(--viz-surface-hover);
        }
    }

    .viz-download-file-name {
        font-size: var(--viz-font-size-std);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 500;
        display: block;
        color: var(--viz-text-primary);
    }

    .panel-file-right {
        display: flex;
        align-items: center;
        font-size: var(--viz-font-size-std);
        min-width: 45px;
        text-align: right;
        justify-content: flex-end;
    }

    .viz-download-progress-text {
        font-weight: 600;
        color: var(--viz-text-secondary);
    }

    .status-text {
        font-weight: 600;

        &.success {
            color: var(--viz-success-color);
        }

        &.error {
            color: var(--viz-error-color);
        }
    }

    .panel-file-progress-bar {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 2px;
        background-color: transparent;
        overflow: hidden;
    }

    .progress-fill {
        display: block;
        height: 100%;
        background: var(--viz-primary);
        transition: width 0.2s ease;

        &.complete {
            background: var(--viz-success-color);
        }

        &.error {
            background: var(--viz-error-color);
        }
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
