<script lang="ts">
    import IconButton from "$lib/components/ui/IconButton.svelte";
    import { upload } from "$lib/states/index.svelte";
    import { UploadState } from "$lib/upload/asset.svelte";
    import { processGlobalQueue, waitForUploadCompletion } from "$lib/upload/manager.svelte";
    import { invalidateViz } from "$lib/views/views.svelte";
    import { untrack } from "svelte";
    import { scale } from "svelte/transition";
    import Button from "../Button.svelte";
    import MaterialIcon from "../MaterialIcon.svelte";

    let minimized = $state(false);

    let listEl: HTMLDivElement | null = $state(null);

    let prevCompletedCount = $state(0);
    let prevFilesCount = $state(0);

    const prefersReducedMotion = () =>
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    $effect(() => {
        upload.concurrency = Math.min(Math.max(upload.concurrency || 1, 1), 10);
        untrack(() => {
            processGlobalQueue();
        });
    });

    $effect(() => {
        // for every x amount of photos (20 for now), refresh Viz to show latest images
        const completedCount = upload.files.filter(
            (f) =>
                f.state === UploadState.DONE ||
                f.state === UploadState.ERROR ||
                f.state === UploadState.CANCELED ||
                f.state === UploadState.DUPLICATE
        ).length;
        const refreshThreshold = 20;

        if (completedCount > 0 && completedCount % refreshThreshold === 0) {
            invalidateViz({ delay: 500 });
        }
    });

    $effect(() => {
        if (upload.files.length > 0) {
            waitForUploadCompletion(upload.files).then(() => {
                setTimeout(() => {
                    // Double check that we are still done (user might have added more files during the 3s wait)
                    const allDone = upload.files.every(
                        (f) =>
                            f.state === UploadState.DONE ||
                            f.state === UploadState.ERROR ||
                            f.state === UploadState.CANCELED ||
                            f.state === UploadState.DUPLICATE
                    );

                    if (allDone) {
                        upload.files = [];
                    }
                }, 3000);
            });
        }
    });

    // I hate this very much
    $effect(() => {
        if (!listEl || upload.files.length === 0) {
            prevCompletedCount = 0;
            prevFilesCount = 0;
            return;
        }

        // compute completed items
        const completed = upload.files.filter(
            (f) =>
                f.state === UploadState.DONE ||
                f.state === UploadState.ERROR ||
                f.state === UploadState.CANCELED ||
                f.state === UploadState.DUPLICATE
        ).length;

        const filesCount = upload.files.length;

        // Scroll whenever files are added or completed
        if (completed > prevCompletedCount || filesCount > prevFilesCount) {
            try {
                const behavior = prefersReducedMotion() ? "auto" : "smooth";

                // Find the last active upload (the one furthest down the list that is actually uploading)
                let targetIndex = -1;
                for (let i = upload.files.length - 1; i >= 0; i--) {
                    if (upload.files[i].state === UploadState.STARTED) {
                        targetIndex = i;
                        break;
                    }
                }

                // If we found an active upload, scroll it into view.
                // We use 'nearest' to ensure it's visible with minimal movement.
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
    <div id="viz-upload-panel-minimized" in:scale={{ duration: 250 }} out:scale={{ duration: 250 }}>
        <Button
            id="viz-upload-panel-minimized-button"
            onclick={() => {
                minimized = false;
            }}
            title="Show Upload Panel"
            style="background-color: var(--viz-primary); color: white;"
            hoverColor="var(--viz-primary)"
        >
            <MaterialIcon iconName="upload" style="font-size: 1.5rem;" />
            <span>{upload.files.length} uploading file{upload.files.length === 1 ? "" : "s"}</span>
        </Button>
    </div>
{:else}
    <div transition:scale={{ duration: 250 }} id="viz-upload-panel">
        <div id="viz-upload-panel-header">
            <div id="upload-panel-header-info">
                <Button
                    style="background-color: transparent; padding: 0em;"
                    hoverColor="var(--viz-80)"
                    title="Minimize Upload Panel"
                    onclick={() => {
                        minimized = true;
                    }}
                >
                    <MaterialIcon iconName="arrow_downward_alt" />
                </Button>
                <p>
                    Uploading {upload.files.length} file{upload.files.length === 1 ? "" : "s"}
                </p>
            </div>
            <div class="concurrency-control">
                <label for="concurrency-input" title="Maximum simultaneous uploads">
                    Concurrent:
                    <input
                        id="concurrency-input"
                        type="number"
                        min="1"
                        max="10"
                        bind:value={upload.concurrency}
                        style="width: 3em; margin-left: 0.25em;"
                    />
                </label>
            </div>
        </div>
        <div id="viz-upload-panel-sub_header">
            <IconButton
                iconName="cancel"
                style="background-color: transparent; padding: 0em;"
                hoverColor="var(--viz-80)"
                title="Cancel All Uploads"
                onclick={() => {
                    upload.files.forEach((file) => {
                        if (file.state === UploadState.STARTED) {
                            file.cancelRequest();
                        }
                    });
                    upload.files = [];
                }}
            ></IconButton>
            <span class="viz-upload-progress-text">
                {upload.files.filter(
                    (f) =>
                        f.state === UploadState.DONE ||
                        f.state === UploadState.ERROR ||
                        f.state === UploadState.CANCELED ||
                        f.state === UploadState.DUPLICATE
                ).length}/{upload.files.length} completed
            </span>
        </div>
        <div id="viz-upload-panel-list" bind:this={listEl}>
            {#each upload.files as file}
                <div class="panel-file-info" data-checksum={file.data.checksum}>
                    {#if file.state === UploadState.STARTED}
                        <Button
                            style="background-color: transparent; padding: 0em;"
                            hoverColor="var(--viz-80)"
                            title="Cancel Upload"
                            onclick={() => {
                                file.cancelRequest();
                            }}
                        >
                            <MaterialIcon iconName="close" />
                        </Button>
                    {/if}
                    <div class="panel-file-info-data_container">
                        <div class="panel-file-info-metadata">
                            <div class="panel-file">
                                <span class="viz-upload-file-name">{file.data.file_name}</span>
                            </div>
                            <span class="viz-upload-progress-text">{Math.round(file.progress)}%</span>
                        </div>
                        <div class="panel-file-info-progress-container">
                            <span
                                class="panel-file-info-progress"
                                class:complete={file.state === UploadState.DONE}
                                class:error={file.state === UploadState.ERROR || file.state === UploadState.CANCELED}
                                class:duplicate={file.state === UploadState.DUPLICATE}
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
    #viz-upload-panel {
        width: 30%;
        max-width: 30%;
        display: flex;
        flex-direction: column;
        position: absolute;
        bottom: var(--viz-spacing-xxl);
        right: var(--viz-spacing-xxl);
        background-color: var(--viz-100);
        z-index: 9999;
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-lg);
        max-height: 60vh;
        overflow: hidden;
    }

    #viz-upload-panel-minimized {
        position: absolute;
        bottom: var(--viz-spacing-xxl);
        right: var(--viz-spacing-xxl);
        z-index: 9999;
    }

    #viz-upload-panel-header {
        height: 3rem;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 var(--viz-spacing-std);
        font-size: var(--viz-font-size-sm);
        font-weight: 600;
        border-bottom: var(--viz-border-thin);
        background-color: var(--viz-90);
        box-sizing: border-box;
        gap: var(--viz-spacing-std);
    }

    #viz-upload-panel-sub_header {
        width: 100%;
        display: flex;
        align-items: center;
        padding: var(--viz-spacing-sm) var(--viz-spacing-std);
        font-size: var(--viz-font-size-sm);
        font-weight: 600;
        border-bottom: var(--viz-border-thin);
        background-color: var(--viz-95);
        box-sizing: border-box;
        gap: var(--viz-spacing-sm);
    }

    .viz-upload-progress-text {
        font-style: italic;
        font-weight: 300;
    }

    #upload-panel-header-info {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--viz-spacing-sm);
        font-weight: 600;
    }

    .concurrency-control {
        display: flex;
        align-items: center;
        font-size: var(--viz-font-size-xs);
        font-weight: 500;

        label {
            display: flex;
            align-items: center;
            cursor: pointer;
        }

        input[type="number"] {
            background-color: var(--viz-80);
            border: var(--viz-border-thin);
            border-radius: var(--viz-border-radius-md);
            color: var(--viz-text-color);
            padding: var(--viz-spacing-xs);
            text-align: center;
            font-family: var(--viz-mono-font);

            &:focus {
                outline: none;
                border-color: var(--viz-40);
            }
        }
    }

    #viz-upload-panel-list {
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
        background-color: var(--viz-100);
        box-sizing: border-box;

        &:hover {
            background-color: var(--viz-90);
        }
    }

    .panel-file {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xs);
        min-width: 0; /* Allow shrinking for text truncation */
        overflow: hidden;
        flex: 1;
    }

    .panel-file-info-data_container {
        display: flex;
        flex-direction: column;
        margin-left: var(--viz-spacing-sm);
        width: 100%;
        min-width: 0; /* Critical for nested flex text truncation */
    }

    .panel-file-info:last-child {
        border-bottom: none;
        margin-bottom: 0;
    }

    .panel-file-info-metadata {
        font-size: var(--viz-font-size-xs);
        margin-bottom: var(--viz-spacing-sm);
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--viz-spacing-sm); /* Add gap between file name and progress */
    }

    .viz-upload-file-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 500;
        display: block; /* Changed from inline-block */
    }

    .viz-upload-progress-text {
        font-weight: 600;
        font-size: var(--viz-font-size-xs);
        color: var(--viz-20);
        min-width: 40px;
        text-align: right;
    }

    .panel-file-info-progress-container {
        width: 100%;
        height: var(--viz-spacing-xs);
        background-color: var(--viz-60);
        border-radius: var(--viz-border-radius-sm);
        overflow: hidden;
        position: relative;
    }

    .panel-file-info-progress {
        height: 100%;
        background: linear-gradient(90deg, var(--viz-40), var(--viz-20));
        border-radius: var(--viz-border-radius-sm);
        transition: width 0.3s ease;
        display: block;
    }

    .panel-file-info-progress.complete {
        background: linear-gradient(
            90deg,
            var(--viz-success-color),
            color-mix(in srgb, var(--viz-success-color) 60%, var(--viz-40))
        );
    }

    .panel-file-info-progress.error {
        background: linear-gradient(
            90deg,
            var(--viz-error-color),
            color-mix(in srgb, var(--viz-error-color) 60%, var(--viz-40))
        );
    }

    .panel-file-info-progress.duplicate {
        background: linear-gradient(
            90deg,
            var(--viz-warning-color),
            color-mix(in srgb, var(--viz-warning-color) 60%, var(--viz-40))
        );
    }
</style>
