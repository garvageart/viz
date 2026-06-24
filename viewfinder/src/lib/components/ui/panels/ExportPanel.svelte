<script module lang="ts">
    import type { ModalOptions } from "$lib/components/modals/manager/ModalManager.svelte";

    export let modalOptions: ModalOptions = $state({
        height: "80%",
        width: "40%"
    });
</script>

<script lang="ts">
    import { API_BASE_URL, getImageFileBlob, type ImageAsset } from "$lib/api";
    import { DbSettings } from "$lib/db/settings";
    import type { TransformInput } from "$lib/images/vips/vips";
    import { download } from "$lib/states/index.svelte";
    import { toastState } from "$lib/toast-notifcations/notif-state.svelte";
    import { DownloadFile, DownloadState } from "$lib/upload/asset.svelte";
    import { processDownloadQueue, waitForDownloadCompletion } from "$lib/upload/manager.svelte";
    import { downloadToFilesystem } from "$lib/utils/files";
    import {
        type ColorSpace,
        type DestinationMode,
        type ExportFormats,
        type MetadataPolicy,
        type ResizeMode
    } from "$lib/utils/images";
    import { generateRandomString } from "$lib/utils/misc";
    import type { exportImagesParallel } from "$lib/workers/image_export";
    import * as Comlink from "comlink";
    import JSZip from "jszip";
    import { slide } from "svelte/transition";
    import { modalsManager } from "../../modals/manager/ModalManager.svelte";
    import BatchRenameBuilder, { defaultTemplate, type SavedRenameSettings } from "../BatchRenameBuilder.svelte";
    import Button from "../Button.svelte";
    import Checkbox from "../Checkbox.svelte";
    import InputSelect from "../InputSelect.svelte";
    import InputText from "../InputText.svelte";
    import MaterialIcon from "../MaterialIcon.svelte";
    import Slider from "../Slider.svelte";

    import { safeRenderRenameTemplate } from "$lib/ui-tools/renamer";
    import { DateTime } from "luxon";

    export interface SavedExportSettings {
        format: ExportFormats;
        quality: number;
        resizeMode: ResizeMode;
        resizeWidth: number;
        resizeHeight: number;
        colorSpace: ColorSpace;
        includeMetadata: boolean;
        metadata: MetadataPolicy;
        removeLocation: boolean;
        destinationMode: DestinationMode;
        sections?: {
            destination: boolean;
            naming: boolean;
            settings: boolean;
            sizing: boolean;
            metadata: boolean;
            watermarking: boolean;
        };
    }

    interface Props {
        id: string;
        assets: ImageAsset[];
    }

    let { id, assets }: Props = $props();

    const settingsDb = new DbSettings<SavedExportSettings>("export_panel_settings");
    const renameDb = new DbSettings<SavedRenameSettings>("batch_rename_settings");

    const savedExport = await settingsDb.load();
    const savedRename = await renameDb.load();

    type SectionName = "destination" | "naming" | "settings" | "sizing" | "metadata" | "watermarking";

    // Section Toggle State
    let sections = $state<Record<SectionName, boolean>>({
        destination: true,
        naming: true,
        settings: true,
        sizing: true,
        metadata: false,
        watermarking: false,
        ...savedExport?.sections
    });

    function toggleSection(name: SectionName) {
        sections[name] = !sections[name];
    }

    // Export Settings State
    let settings = $state<SavedExportSettings>({
        format: "jpg",
        quality: 80,
        resizeMode: "none",
        resizeWidth: 2048,
        resizeHeight: 2048,
        colorSpace: "sRGB",
        includeMetadata: true,
        metadata: "all",
        removeLocation: false,
        destinationMode: "zip",
        ...savedExport
    });

    let renameSettings = $state<SavedRenameSettings>({
        namingMode: "original",
        customName: "",
        namingTemplate: defaultTemplate,
        sequenceStart: 1,
        sequencePadding: 4,
        builderRows: [
            {
                id: generateRandomString(16),
                type: "original",
                textValue: "",
                dateFormat: "YYYY-MM-DD",
                metadataField: "model",
                sequencePadding: 4
            }
        ],
        ...savedRename
    });
    let activeTemplate = $state("{{basename}}");

    $effect(() => {
        settingsDb.save({
            ...$state.snapshot(settings),
            sections: $state.snapshot(sections)
        });

        renameDb.save($state.snapshot(renameSettings));
    });

    const formatOptions = [
        { value: "jpg", label: "JPEG" },
        { value: "png", label: "PNG" },
        { value: "webp", label: "WebP" },
        { value: "avif", label: "AVIF" },
        { value: "tiff", label: "TIFF" }
    ] as const;

    const resizeOptions = [
        { value: "none", label: "None" },
        { value: "width", label: "Width" },
        { value: "height", label: "Height" },
        { value: "long-edge", label: "Long Edge" },
        { value: "short-edge", label: "Short Edge" },
        { value: "dimensions", label: "Dimensions" }
    ] as const;

    const colorSpaceOptions = [
        { value: "sRGB", label: "sRGB IEC61966-2.1" },
        { value: "AdobeRGB", label: "Adobe RGB (1998)" },
        { value: "ProPhoto", label: "ProPhoto RGB" },
        { value: "DisplayP3", label: "Display P3" },
        { value: "Rec2020", label: "Rec. 2020" },
        { value: "ColorMatch", label: "ColorMatch RGB" },
        { value: "---", label: "---", type: "separator" },
        { value: "GrayGamma18", label: "Gray Gamma 1.8" },
        { value: "GrayGamma22", label: "Gray Gamma 2.2" },
        { value: "sGray", label: "sGray" }
    ] as const;

    async function handleExport() {
        modalsManager.close(id);

        const downloadTasks: DownloadFile[] = [];
        for (const asset of assets) {
            const url = `${API_BASE_URL}/images/${encodeURIComponent(asset.uid)}/file`;
            const filename =
                asset.image_metadata?.original_file_name || asset.image_metadata?.file_name || asset.name || "image";
            const task = new DownloadFile(url, filename);

            downloadTasks.push(task);
        }

        download.files.push(...downloadTasks);
        download.stats.total += downloadTasks.length;

        processDownloadQueue();
        await waitForDownloadCompletion(downloadTasks);

        const transformInputs: TransformInput[] = [];
        for (let i = 0; i < downloadTasks.length; i++) {
            const task = downloadTasks[i];
            const asset = assets[i];
            let originalData = $state.snapshot(task.data);

            if (!originalData) {
                // Try falling back to cached getImageFileBlob
                const response = await getImageFileBlob(asset.uid, {}, { cache: "force-cache" });
                if (response.status === 200) {
                    originalData = response.data;
                } else {
                    throw new Error(`Failed to download image: ${task.filename}`);
                }
            }

            transformInputs.push({
                asset: $state.snapshot(asset),
                params: $state.snapshot({
                    format: settings.format,
                    quality: settings.quality,
                    width: settings.resizeMode !== "none" ? settings.resizeWidth : undefined,
                    height: settings.resizeMode !== "none" ? settings.resizeHeight : undefined,
                    resizeMode: settings.resizeMode,
                    colorSpace: settings.colorSpace,
                    metadata: settings.includeMetadata ? settings.metadata : "none",
                    removeLocation: settings.removeLocation
                }),
                originalData
            });
        }

        const exportWorker = new Worker(new URL("../../../workers/image_export.ts", import.meta.url), {
            type: "module"
        });
        const transformFn = Comlink.wrap<typeof exportImagesParallel>(exportWorker);

        try {
            const flatResults = [];
            // Process the transforms sequentially inside the single background worker
            for (let index = 0; index < transformInputs.length; index++) {
                const res = await transformFn($state.snapshot(transformInputs), null, index);
                flatResults.push(...res);
            }

            const r = flatResults[0];
            if (flatResults.length === 1 && r && r.result) {
                const result = r.result;
                const imageBuf = result.imageData;
                const asset = transformInputs[r.index].asset;
                const ext = result.ext || asset.image_metadata?.file_type?.toLowerCase() || "jpg";

                let filename = "";
                if (renameSettings.namingMode === "original") {
                    const origFull =
                        asset.name ||
                        asset.image_metadata?.original_file_name ||
                        asset.image_metadata?.file_name ||
                        "image";
                    const lastDot = origFull.lastIndexOf(".");
                    filename = lastDot === -1 ? origFull : origFull.substring(0, lastDot);
                } else {
                    const { name: renderedName } = safeRenderRenameTemplate(activeTemplate, asset, r.index, {
                        sequenceStart: renameSettings.sequenceStart,
                        sequencePadding: renameSettings.sequencePadding,
                        customName: renameSettings.customName
                    });

                    filename = renderedName || asset.name;
                }

                const fullFilename = `${filename}.${ext}`;

                const standardBuf = new Uint8Array(new ArrayBuffer(imageBuf.byteLength));
                standardBuf.set(new Uint8Array(imageBuf));

                const blob = new Blob([standardBuf], { type: `image/${ext === "jpg" ? "jpeg" : ext}` });
                await downloadToFilesystem(fullFilename, blob);

                toastState.addToast({
                    message: `Successfully exported **${fullFilename}**`,
                    type: "success"
                });
            } else {
                const zip = new JSZip();

                for (const r of flatResults) {
                    console.debug("Processing worker result item:", r);
                    if (r.result) {
                        const imageBuf = r.result.imageData;
                        const asset = transformInputs[r.index].asset;
                        const ext = r.result.ext || asset.image_metadata?.file_type?.toLowerCase() || "jpg";

                        let filename = "";
                        if (renameSettings.namingMode === "original") {
                            const origFull =
                                asset.name ||
                                asset.image_metadata?.original_file_name ||
                                asset.image_metadata?.file_name ||
                                "image";
                            const lastDot = origFull.lastIndexOf(".");
                            filename = lastDot === -1 ? origFull : origFull.substring(0, lastDot);
                        } else {
                            const { name: renderedName } = safeRenderRenameTemplate(activeTemplate, asset, r.index, {
                                sequenceStart: renameSettings.sequenceStart,
                                sequencePadding: renameSettings.sequencePadding,
                                customName: renameSettings.customName
                            });

                            filename = renderedName || asset.name;
                        }

                        console.debug("Adding file to zip:", filename + "." + ext, "bytes:", imageBuf.byteLength);
                        zip.file(filename + "." + ext, new Uint8Array(imageBuf));
                    } else if (r.error) {
                        console.error("Image transform failed inside worker:", r.error);
                    }
                }

                let zipName = `viz-bulk_export-${DateTime.now().toFormat("yyyyLLdd_HHmmss")}.zip`;

                // Create a virtual DownloadFile task for zip compilation
                const zipTask = new DownloadFile("", zipName);
                zipTask.state = DownloadState.DOWNLOADING;
                download.files.push(zipTask);
                download.stats.total += 1;

                console.debug("Generating zip file:", zipName);
                try {
                    const zipData = await zip.generateAsync({ type: "blob", streamFiles: true }, (metadata) => {
                        zipTask.progress = metadata.percent;
                    });
                    zipTask.progress = 100;
                    zipTask.state = DownloadState.DOWNLOADED;
                    zipTask.data = zipData;
                    zipTask.endTime = new Date();

                    console.debug("ZIP blob generated. Size:", zipData.size);

                    await downloadToFilesystem(zipName, zipData);

                    toastState.addToast({
                        title: zipName,
                        message: "Download Started",
                        type: "success"
                    });
                } catch (err) {
                    zipTask.state = DownloadState.ERROR;
                    console.error("ZIP generation failed:", err);
                    toastState.addToast({
                        title: zipName,
                        message: "Download Failed",
                        type: "error"
                    });

                    throw err;
                }
            }
        } finally {
            exportWorker.terminate();
        }
    }

    function handleCancel() {
        modalsManager.dismiss(id, "cancel");
    }
</script>

<div class="export-panel">
    <div class="export-header">
        <h2>Export Options</h2>
        <div class="asset-summary">
            {assets.length} item(s) selected
        </div>
    </div>

    {#snippet panelSection(name: SectionName, label: string, children: import("svelte").Snippet)}
        <div class="section" class:expanded={sections[name]}>
            <button class="section-header" onclick={() => toggleSection(name)}>
                <MaterialIcon iconName={sections[name] ? "expand_more" : "chevron_right"} />
                <span>{label}</span>
            </button>
            {#if sections[name]}
                <div class="section-content" transition:slide>
                    {@render children()}
                </div>
            {/if}
        </div>
    {/snippet}

    <div class="export-body">
        <!-- DESTINATION -->
        {#snippet destinationSnippet()}
            <InputSelect
                label="Export to"
                options={[{ value: "zip", label: assets.length > 1 ? "Download as ZIP" : "Download Locally" }]}
                bind:value={settings.destinationMode}
            />
        {/snippet}
        {@render panelSection("destination", "Destination", destinationSnippet)}

        <!-- FILE NAMING -->
        {@render panelSection("naming", "File Naming", namingSnippet)}
        {#snippet namingSnippet()}
            <BatchRenameBuilder bind:settings={renameSettings} bind:activeTemplate {assets} format={settings.format} />
        {/snippet}

        <!-- FILE SETTINGS -->
        {@render panelSection("settings", "File Settings", settingsSnippet)}
        {#snippet settingsSnippet()}
            <div class="control-row">
                <InputSelect label="Format" options={Array.from(formatOptions)} bind:value={settings.format} />
                {#if settings.format === "jpg" || settings.format === "webp" || settings.format === "avif"}
                    <div class="quality-slider">
                        <Slider
                            id="quality-range"
                            label="Quality"
                            min={1}
                            max={100}
                            bind:value={settings.quality}
                            showValue={true}
                        />
                    </div>
                {/if}
            </div>
            <InputSelect label="Color Space" options={Array.from(colorSpaceOptions)} bind:value={settings.colorSpace} />
        {/snippet}

        <!-- METADATA -->
        {@render panelSection("metadata", "Metadata", metadataSnippet)}
        {#snippet metadataSnippet()}
            <div class="metadata-settings">
                <Checkbox label="Include Original Metadata" bind:checked={settings.includeMetadata} />
                <Checkbox label="Remove Location Information" bind:checked={settings.removeLocation} />

                {#if settings.includeMetadata}
                    <div class="metadata-policy-select">
                        <InputSelect
                            label=""
                            options={[
                                { value: "all", label: "All" },
                                { value: "except-camera", label: "All Except Camera And Camera Raw Info" },
                                { value: "copyright", label: "Copyright Only" },
                                { value: "contact", label: "Copyright And Contact Info Only" }
                            ]}
                            bind:value={settings.metadata}
                        />
                    </div>
                {/if}
            </div>
        {/snippet}

        <!-- IMAGE SIZING -->
        {@render panelSection("sizing", "Image Sizing", sizingSnippet)}
        {#snippet sizingSnippet()}
            <InputSelect label="Resize to Fit" options={Array.from(resizeOptions)} bind:value={settings.resizeMode} />
            {#if settings.resizeMode !== "none"}
                <div class="control-row dimensions">
                    {#if ["width", "long-edge", "short-edge", "dimensions"].includes(settings.resizeMode)}
                        <InputText
                            id="resize-w"
                            type="number"
                            label={settings.resizeMode === "width"
                                ? "Width"
                                : settings.resizeMode === "dimensions"
                                  ? "W"
                                  : "Edge"}
                            bind:value={settings.resizeWidth}
                        />
                    {/if}
                    {#if ["height", "dimensions"].includes(settings.resizeMode)}
                        <InputText
                            id="resize-h"
                            type="number"
                            label={settings.resizeMode === "height" ? "Height" : "H"}
                            bind:value={settings.resizeHeight}
                        />
                    {/if}
                    <span class="unit">px</span>
                </div>
            {/if}
        {/snippet}

        <!-- WATERMARKING (Placeholder) -->
        {@render panelSection("watermarking", "Watermarking", watermarkingSnippet)}
        {#snippet watermarkingSnippet()}
            <p class="placeholder-text">Watermarking options will be added here.</p>
        {/snippet}
    </div>

    <div class="export-footer">
        <Button variant="small" onclick={handleCancel}>Cancel</Button>
        <Button variant="small" onclick={handleExport} class="export-btn">
            Export {assets.length} Item{assets.length === 1 ? "" : "s"}
        </Button>
    </div>
</div>

<style lang="scss">
    .export-panel {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        background-color: var(--viz-bg-color);
        color: var(--viz-text-color);
        overflow: hidden;
    }

    // Target all inner input wrappers & fields to make them compact/slim
    :global(.export-panel .input-container) {
        gap: var(--viz-spacing-xs) !important;
        min-width: 0 !important;
    }

    :global(.export-panel .input-label) {
        font-size: var(--viz-font-size-xs) !important;
    }

    :global(.export-panel .select-trigger) {
        min-height: 2rem !important;
        padding: var(--viz-spacing-xs) 2rem var(--viz-spacing-xs) var(--viz-spacing-sm) !important;
        font-size: var(--viz-font-size-sm) !important;
        background-position: right var(--viz-spacing-sm) center !important;
        min-width: 0 !important;
    }

    :global(.export-panel input:not([type="submit"]):not([type="checkbox"]):not([type="range"])) {
        min-height: 2rem !important;
        padding: var(--viz-spacing-xs) var(--viz-spacing-sm) !important;
        font-size: var(--viz-font-size-sm) !important;
        min-width: 0 !important;
    }

    :global(.export-panel .slider-label) {
        font-size: var(--viz-font-size-xs) !important;
    }

    :global(.export-panel .slider-value) {
        font-size: var(--viz-font-size-xs) !important;
    }

    :global(.export-panel input[type="range"]) {
        margin: var(--viz-spacing-xs) 0 !important;
    }

    :global(.export-panel .label-text) {
        font-size: var(--viz-font-size-xs) !important;
    }

    :global(.export-panel .export-btn) {
        background-color: var(--viz-primary) !important;
        color: var(--viz-10-dark) !important;
    }

    .export-header {
        padding: var(--viz-spacing-sm) var(--viz-spacing-md);
        border-bottom: 1px solid var(--viz-80);
        background-color: var(--viz-bg-color);

        h2 {
            margin: 0;
            font-size: var(--viz-font-size-std);
            font-weight: 600;
        }

        .asset-summary {
            font-size: var(--viz-font-size-xs);
            color: var(--viz-40);
            margin-top: var(--viz-spacing-xxs);
        }
    }

    .export-body {
        flex: 1;
        overflow-y: auto;
        padding: 0;
    }

    .section {
        border: none;

        & + .section {
            border-top: 1px solid var(--viz-80);
        }

        &.expanded {
            background-color: var(--viz-bg-color);

            .section-header {
                border-bottom: 1px solid var(--viz-80);
            }
        }
    }

    .section-header {
        width: 100%;
        display: flex;
        align-items: center;
        padding: var(--viz-spacing-sm) var(--viz-spacing-md);
        background: none;
        border: none;
        border-bottom: 1px solid transparent;
        color: var(--viz-text-color);
        cursor: pointer;
        font-weight: 600;
        font-size: var(--viz-font-size-sm);
        text-align: left;
        transition:
            background-color 0.2s,
            border-bottom-color 0.2s;

        &:hover {
            background-color: var(--viz-90);
        }

        span {
            margin-left: var(--viz-spacing-sm);
        }
    }

    .section-content {
        padding: var(--viz-spacing-md) var(--viz-spacing-std);
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-md);
    }

    .control-row {
        display: flex;
        gap: var(--viz-spacing-std);
        align-items: flex-end;

        :global(.input-container) {
            flex: 1;
        }

        &.dimensions {
            :global(.input-container) {
                max-width: 6.25rem;
                flex: none;
            }
            .unit {
                margin-bottom: var(--viz-spacing-sm);
                font-size: var(--viz-font-size-xs);
                color: var(--viz-50);
            }
        }
    }

    .quality-slider {
        flex: 2;
        display: flex;
        flex-direction: column;
        min-width: 0;
    }

    .placeholder-text {
        font-style: italic;
        font-size: var(--viz-font-size-xs);
        color: var(--viz-50);
        margin: 0;
    }

    .export-footer {
        padding: var(--viz-spacing-md) var(--viz-spacing-std);
        border-top: 1px solid var(--viz-80);
        background-color: var(--viz-100);
        display: flex;
        justify-content: flex-end;
        gap: var(--viz-spacing-sm);
    }

    .metadata-settings {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-md);
    }

    .metadata-policy-select {
        margin-left: 1.5rem;
    }
</style>
