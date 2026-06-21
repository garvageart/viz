<script module lang="ts">
    import type { ModalOptions } from "$lib/components/modals/manager/ModalManager.svelte";

    export let modalOptions: ModalOptions = $state({
        height: "80%",
        width: "40%"
    });
</script>

<script lang="ts">
    import type { ImageAsset } from "$lib/api";
    import { DbSettings } from "$lib/db/settings";
    import { generateRandomString } from "$lib/utils/misc";
    import { slide } from "svelte/transition";
    import { modalsManager } from "../../modals/manager/ModalManager.svelte";
    import BatchRenameBuilder, { defaultTemplate, type SavedRenameSettings } from "../BatchRenameBuilder.svelte";
    import Button from "../Button.svelte";
    import Checkbox from "../Checkbox.svelte";
    import InputSelect from "../InputSelect.svelte";
    import InputText from "../InputText.svelte";
    import MaterialIcon from "../MaterialIcon.svelte";
    import Slider from "../Slider.svelte";

    export type ExportFormat = "jpg" | "png" | "webp" | "avif" | "tiff";
    export type ResizeMode = "none" | "width" | "height" | "long-edge" | "short-edge" | "dimensions";
    export type ColorSpace = "sRGB" | "AdobeRGB" | "ProPhoto" | "DisplayP3";
    export type DestinationMode = "zip";

    export interface SavedExportSettings {
        format: ExportFormat;
        quality: number;
        resizeMode: ResizeMode;
        resizeWidth: number;
        resizeHeight: number;
        colorSpace: ColorSpace;
        stripMetadata: boolean;
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
        stripMetadata: true,
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
        { value: "sRGB", label: "sRGB" },
        { value: "AdobeRGB", label: "Adobe RGB (1998)" },
        { value: "ProPhoto", label: "ProPhoto RGB" },
        { value: "DisplayP3", label: "Display P3" }
    ] as const;

    function handleExport() {
        // Implementation will follow in the future using wasm-vips
        modalsManager.close(id, {
            ...$state.snapshot(settings),
            namingMode: renameSettings.namingMode,
            customName: renameSettings.customName,
            namingTemplate: activeTemplate,
            sequenceStart: renameSettings.sequenceStart,
            sequencePadding: renameSettings.sequencePadding
        });
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
        {@render panelSection("destination", "Destination", destinationSnippet)}
        {#snippet destinationSnippet()}
            <InputSelect
                label="Export to"
                options={[{ value: "zip", label: "Download as ZIP" }]}
                bind:value={settings.destinationMode}
            />
        {/snippet}

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
            <InputSelect label="Color Space" options={Array.from(colorSpaceOptions)} bind:value={settings.colorSpace} />
            <Checkbox
                id="strip-meta"
                label="Remove all metadata (EXIF, XMP, IPTC)"
                bind:checked={settings.stripMetadata}
            />
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

        <!-- METADATA (Placeholder) -->
        {@render panelSection("metadata", "Metadata", metadataSnippet)}
        {#snippet metadataSnippet()}
            <p class="placeholder-text">Copyright and Contact Info will be added here.</p>
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
</style>
