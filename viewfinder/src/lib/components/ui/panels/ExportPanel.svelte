<script module lang="ts">
    import type { ModalOptions } from "$lib/components/modals/manager/ModalManager.svelte";

    export let modalOptions: ModalOptions = $state({
        height: "80%",
        width: "40%",
        applyPadding: false
    });
</script>

<script lang="ts">
    import { type ImageAsset, getAssetImagePath, getFullImagePath } from "@viz/api";
    import * as Comlink from "comlink";
    import JSZip from "jszip";
    import { type Snippet } from "svelte";
    import { slide } from "svelte/transition";
    import { DbSettings } from "$lib/db/settings";
    import { DownloadFile, DownloadState } from "$lib/download/asset.svelte";
    import { createZipExportName } from "$lib/download/utils";
    import type { TransformInput, TransformResult } from "$lib/images/vips/vips";
    import { config, download } from "$lib/states/index.svelte";
    import { toasts } from "$lib/toast-notifcations/toasts.svelte";
    import { safeRenderRenameTemplate } from "$lib/ui-tools/renamer";
    import { downloadToFilesystem } from "$lib/utils/files";
    import {
        type BitDepths,
        type ColorSpace,
        type DestinationMode,
        type ExportFormats,
        type MetadataPolicy,
        type ResizeMode
    } from "$lib/utils/images";
    import { generateRandomString } from "$lib/utils/misc";
    import type { ImageExportWorkerApi, exportImagesParallel } from "$lib/workers/image_export";
    import ImageExportWorker from "$lib/workers/image_export?worker";
    import { modalsManager } from "../../modals/manager/ModalManager.svelte";
    import BatchRenameBuilder, { type SavedRenameSettings, defaultTemplate } from "../BatchRenameBuilder.svelte";
    import Button from "../Button.svelte";
    import Checkbox from "../Checkbox.svelte";
    import InputSelect from "../InputSelect.svelte";
    import InputText from "../InputText.svelte";
    import MaterialIcon from "../MaterialIcon.svelte";
    import Slider from "../Slider.svelte";

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
        bitDepth: BitDepths;
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
        onExport?: (imgs: Awaited<ReturnType<typeof exportImagesParallel>>) => void;
    }

    let { id, assets, onExport }: Props = $props();

    export const modalOptions: ModalOptions = {
        heading: "Export Options"
    };

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
        bitDepth: 8,
        ...savedExport
    });

    const formatBitDepths: Record<string, BitDepths[]> = {
        avif: [8, 10, 12],
        png: [8, 16],
        tiff: [8, 16],
        jpg: [8],
        webp: [8]
    };

    const bitDepthOptions = $derived.by(() => {
        const depths = formatBitDepths[settings.format] || [];
        if (depths.length <= 1) {
            return [];
        }
        return depths.map((d) => ({ value: `${d}`, label: `${d}-bit` }));
    });

    $effect(() => {
        const allowed = formatBitDepths[settings.format] || [8];
        if (!allowed.includes(settings.bitDepth)) {
            settings.bitDepth = allowed[0];
        }
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
        if (renameSettings.namingMode === "custom" && !renameSettings.customName.trim()) {
            toasts.add({
                type: "warning",
                title: "Custom text required",
                message: "Custom text cannot be blank"
            });

            return;
        }

        if (renameSettings.namingMode === "builder") {
            const hasBlankText = renameSettings.builderRows.some((r) => r.type === "text" && !r.textValue.trim());
            if (hasBlankText) {
                toasts.add({
                    type: "warning",
                    title: "Custom text required",
                    message: "Custom text cannot be blank"
                });

                return;
            }
        }

        if (renameSettings.namingMode === "template") {
            if (!renameSettings.namingTemplate.trim()) {
                toasts.add({
                    type: "warning",
                    title: "Template required",
                    message: "Naming template cannot be blank"
                });

                return;
            }

            if (renameSettings.namingTemplate.includes("{{customName}}") && !renameSettings.customName.trim()) {
                toasts.add({
                    type: "warning",
                    title: "Custom text required",
                    message: "Custom text cannot be blank"
                });

                return;
            }
        }

        // Capture all needed state before closing the modal
        const exportSettings = $state.snapshot(settings);
        const exportRenameSettings = $state.snapshot(renameSettings);
        const exportTemplate = $state.snapshot(activeTemplate);
        const exportAssets = $state.snapshot(assets);

        modalsManager.close(id);

        function resolveExportFilename(asset: ImageAsset, index: number, ext: string): string {
            let basename = "";
            if (exportRenameSettings.namingMode === "original") {
                const imageExportName =
                    asset.name || asset.image_metadata.file_name || asset.original_file_name || "image";
                const lastDot = imageExportName.lastIndexOf(".");
                basename = lastDot === -1 ? imageExportName : imageExportName.substring(0, lastDot);
            } else {
                const { name: renderedName } = safeRenderRenameTemplate(exportTemplate, asset, index, {
                    sequenceStart: exportRenameSettings.sequenceStart,
                    sequencePadding: exportRenameSettings.sequencePadding,
                    customName: exportRenameSettings.customName
                });
                basename = renderedName;
            }

            return `${basename}.${ext}`;
        }

        const isSingle = exportAssets.length === 1;

        // Create individual download tasks so live per-image progress can be tracked in the UI
        const imageTasks: DownloadFile[] = [];
        for (const asset of exportAssets) {
            const filename = resolveExportFilename(asset, imageTasks.length, exportSettings.format);
            const url =
                getAssetImagePath(asset, "original") ||
                getFullImagePath(`/images/${encodeURIComponent(asset.uid)}/file`);
            const task = new DownloadFile(url, filename, "GET");

            imageTasks.push(task);
        }

        download.files.push(...imageTasks);
        download.stats.total += imageTasks.length;

        let exportWorker: Worker | undefined;
        const flatResults: { result?: TransformResult; error?: string; index: number }[] = [];

        try {
            exportWorker = new ImageExportWorker();
            const workerApi = Comlink.wrap<ImageExportWorkerApi>(exportWorker);

            if (isSingle) {
                const asset = exportAssets[0];
                const task = imageTasks[0];

                let originalData: Blob;
                try {
                    originalData = await task.download();
                } catch (err) {
                    if ((task.state as DownloadState) === DownloadState.CANCELED) {
                        return;
                    }
                    task.state = DownloadState.ERROR;
                    throw new Error(`Failed to download image: ${task.filename || asset.uid}`);
                }

                task.state = DownloadState.PROCESSING;
                task.progress = 0;
                const transformInput: TransformInput = {
                    asset,
                    params: {
                        format: exportSettings.format,
                        quality: exportSettings.quality,
                        width: exportSettings.resizeMode !== "none" ? exportSettings.resizeWidth : undefined,
                        height: exportSettings.resizeMode !== "none" ? exportSettings.resizeHeight : undefined,
                        resizeMode: exportSettings.resizeMode,
                        colorSpace: exportSettings.colorSpace,
                        metadata: exportSettings.includeMetadata ? exportSettings.metadata : "none",
                        removeLocation: exportSettings.removeLocation,
                        bitDepth: exportSettings.bitDepth ? exportSettings.bitDepth : undefined
                    },
                    originalData
                };

                const res = await workerApi.transformSingleImage(
                    transformInput,
                    Comlink.proxy((percent: number) => {
                        task.progress = percent;
                    })
                );

                flatResults.push({ ...res, index: 0 });

                if (!res.result) {
                    task.state = DownloadState.ERROR;
                    throw new Error(res.error || "Failed to transform image");
                }

                task.state = DownloadState.DOWNLOADED;
                task.endTime = new Date();

                const ext = res.result.ext || asset.image_metadata.file_type?.toLowerCase();
                const fullFilename = resolveExportFilename(asset, 0, ext);

                const standardBuf = new Uint8Array(res.result.imageData.byteLength);
                standardBuf.set(new Uint8Array(res.result.imageData));
                const blob = new Blob([standardBuf as BlobPart], {
                    type: `image/${ext === "jpg" ? "jpeg" : ext}`
                });

                task.data = blob;
                task.filename = fullFilename;

                await downloadToFilesystem(fullFilename, blob);
                toasts.add({
                    title: fullFilename,
                    message: `Successfully exported`,
                    type: "success"
                });

                return;
            }

            // Multi-image ZIP export
            const zip = new JSZip();

            for (let index = 0; index < exportAssets.length; index++) {
                const task = imageTasks[index];
                if (task.state === DownloadState.CANCELED) {
                    break;
                }

                const asset = exportAssets[index];

                let originalData: Blob;
                try {
                    originalData = await task.download();
                } catch (err) {
                    if ((task.state as DownloadState) === DownloadState.CANCELED) {
                        break;
                    }
                    task.state = DownloadState.ERROR;
                    flatResults.push({ error: `Failed to download ${task.filename || asset.uid}`, index });
                    continue;
                }

                task.state = DownloadState.PROCESSING;
                task.progress = 0;
                const transformInput: TransformInput = {
                    asset,
                    params: {
                        format: exportSettings.format,
                        quality: exportSettings.quality,
                        width: exportSettings.resizeMode !== "none" ? exportSettings.resizeWidth : undefined,
                        height: exportSettings.resizeMode !== "none" ? exportSettings.resizeHeight : undefined,
                        resizeMode: exportSettings.resizeMode,
                        colorSpace: exportSettings.colorSpace,
                        metadata: exportSettings.includeMetadata ? exportSettings.metadata : "none",
                        removeLocation: exportSettings.removeLocation,
                        bitDepth: exportSettings.bitDepth ? exportSettings.bitDepth : undefined
                    },
                    originalData
                };

                const res = await workerApi.transformSingleImage(
                    transformInput,
                    Comlink.proxy((percent: number) => {
                        task.progress = percent;
                    })
                );

                if (res.error) {
                    task.state = DownloadState.ERROR;
                } else {
                    task.state = DownloadState.DOWNLOADED;
                    task.endTime = new Date();
                }

                flatResults.push({ ...res, index });

                if (res.result) {
                    const ext = res.result.ext || asset.image_metadata.file_type?.toLowerCase();
                    const fullFilename = resolveExportFilename(asset, index, ext);

                    zip.file(fullFilename, new Uint8Array(res.result.imageData));
                }
            }

            const successfulResults = flatResults.filter((r) => Boolean(r.result));
            const failedResults = flatResults.filter((r) => Boolean(r.error));

            if (successfulResults.length === 0) {
                const firstError = failedResults[0]?.error || "Unknown error";
                toasts.add({
                    title: "Export Failed",
                    message: `Failed to transform images: ${firstError}`,
                    type: "error"
                });

                return;
            }

            if (failedResults.length > 0) {
                toasts.add({
                    title: "Images Failed to Process",
                    message: `${failedResults.length} of ${flatResults.length} images failed to process. Exporting ${successfulResults.length} succeeded images.`,
                    type: "warning"
                });
            }

            // Clean up per-image tasks and create single ZIP task
            download.files = download.files.filter((f) => !imageTasks.includes(f));
            download.stats.total = Math.max(0, download.stats.total - imageTasks.length);

            const zipName = createZipExportName(config.data?.download.zip_export_name);
            const zipTask = new DownloadFile("", zipName);
            zipTask.state = DownloadState.PROCESSING;
            zipTask.progress = 0;

            download.files.push(zipTask);
            download.stats.total += 1;

            console.debug("Generating zip file:", zipName);
            try {
                const zipData = await zip.generateAsync({ type: "blob", streamFiles: true }, (metadata) => {
                    zipTask.progress = metadata.percent;
                });
                zipTask.state = DownloadState.DOWNLOADED;
                zipTask.data = zipData;
                zipTask.endTime = new Date();

                console.debug("ZIP blob generated. Size:", zipData.size);
                await downloadToFilesystem(zipName, zipData);

                toasts.add({
                    title: zipName,
                    message: "Download Started",
                    type: "success"
                });
            } catch (err) {
                zipTask.state = DownloadState.ERROR;
                console.error("ZIP generation failed:", err);
                toasts.add({
                    title: zipName,
                    message: "Download Failed",
                    type: "error"
                });
                throw err;
            }
        } catch (execErr) {
            console.error("[ExportPanel] Fatal error during worker execution:", execErr);
            toasts.add({
                title: "Export Failed",
                message: execErr instanceof Error ? execErr.message : String(execErr),
                type: "error"
            });
        } finally {
            exportWorker?.terminate();
            onExport?.(flatResults);
        }
    }

    function handleCancel() {
        modalsManager.dismiss(id);
    }
</script>

<div id="viz-export-panel" class="export-panel">
    {#snippet panelSection(name: SectionName, label: string, children: Snippet)}
        <div class="section" class:expanded={sections[name]}>
            <button class="section-header" onclick={() => toggleSection(name)}>
                <MaterialIcon iconName={sections[name] ? "keyboard_arrow_down" : "chevron_right"} />
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
                options={[{ value: "zip", label: assets.length > 1 ? "Download as ZIP" : "Local" }]}
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
                {#if ["jpg", "webp", "avif"].includes(settings.format)}
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
            <div class="control-row">
                <InputSelect
                    label="Color Space"
                    options={Array.from(colorSpaceOptions)}
                    bind:value={settings.colorSpace}
                />
                {#if ["png", "tiff", "avif"].includes(settings.format)}
                    <InputSelect label="Bit Depth" options={bitDepthOptions} bind:value={settings.bitDepth} />
                {/if}
            </div>
        {/snippet}

        <!-- METADATA -->
        {@render panelSection("metadata", "Metadata", metadataSnippet)}
        {#snippet metadataSnippet()}
            <div class="metadata-settings">
                <Checkbox label="Remove Location Information" bind:checked={settings.removeLocation} />
                <Checkbox label="Include Original Metadata" bind:checked={settings.includeMetadata} />

                {#if settings.includeMetadata}
                    <div class="metadata-policy-select">
                        <InputSelect
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
        <div class="asset-summary">
            {assets.length} item(s) selected
        </div>
        <div class="footer-actions">
            <Button size="small" onclick={handleCancel}><span>Cancel</span></Button>
            <Button id="perform-export" size="small" onclick={handleExport} class="export-btn">
                <span>Export</span>
            </Button>
        </div>
    </div>
</div>

<style lang="scss">
    .export-panel {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        background-color: var(--viz-surface-base);
        color: var(--viz-text-primary);
        overflow: hidden;
    }

    /* Target all inner input wrappers & fields to make them compact/slim */
    :global(.export-panel .input-container) {
        gap: var(--viz-spacing-xs) !important;
        min-width: 0 !important;
    }

    :global(.export-panel .input-label) {
        font-size: var(--viz-font-size-std) !important;
    }

    :global(.export-panel .select-trigger) {
        min-height: 2rem !important;
        padding: var(--viz-spacing-xs) 2rem var(--viz-spacing-xs) var(--viz-spacing-sm) !important;
        font-size: var(--viz-font-size-lg) !important;
        background-position: right var(--viz-spacing-sm) center !important;
        min-width: 0 !important;
    }

    :global(.export-panel input:not([type="submit"]):not([type="checkbox"]):not([type="range"])) {
        min-height: 2rem !important;
        padding: var(--viz-spacing-xs) var(--viz-spacing-sm) !important;
        font-size: var(--viz-font-size-lg) !important;
        min-width: 0 !important;
    }

    :global(.export-panel .slider-label) {
        font-size: var(--viz-font-size-std) !important;
    }

    :global(.export-panel .slider-value) {
        font-size: var(--viz-font-size-std) !important;
    }

    :global(.export-panel input[type="range"]) {
        margin: var(--viz-spacing-xs) 0 !important;
    }

    :global(.export-panel .label-text) {
        font-size: var(--viz-font-size-std) !important;
    }

    :global(.export-panel .export-btn) {
        background-color: var(--viz-primary) !important;
        color: var(--viz-10-dark) !important;
    }

    .export-body {
        flex: 1;
        overflow-y: auto;
        padding: 0;
    }

    .section {
        border: none;

        & + .section {
            border-top: 1px solid var(--viz-surface-hover);
        }

        &.expanded {
            background-color: var(--viz-surface-base);

            .section-header {
                border-bottom: 1px solid var(--viz-surface-hover);
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
        color: var(--viz-text-primary);
        cursor: pointer;
        font-weight: 600;
        font-size: var(--viz-font-size-lg);
        text-align: left;
        transition:
            background-color 0.2s,
            border-bottom-color 0.2s;

        &:hover {
            background-color: var(--viz-surface-panel);
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
                font-size: var(--viz-font-size-std);
                color: var(--viz-text-secondary);
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
        font-size: var(--viz-font-size-std);
        color: var(--viz-text-secondary);
        margin: 0;
    }

    .export-footer {
        padding: var(--viz-spacing-md) var(--viz-spacing-std);
        border-top: 1px solid var(--viz-surface-hover);
        background-color: var(--viz-surface-panel);
        display: flex;
        gap: var(--viz-spacing-sm);
        justify-content: space-between;
        align-items: center;

        .asset-summary {
            font-size: var(--viz-font-size-lg);
            color: var(--viz-text-secondary);
        }

        .footer-actions {
            display: flex;
            gap: var(--viz-spacing-sm);
        }
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
