<script module lang="ts">
    import type { ModalOptions } from "$lib/components/modals/manager/ModalManager.svelte";

    export let modalOptions: ModalOptions = $state({
        height: "80%",
        width: "40%",
    });
</script>

<script lang="ts">
    import type { ImageAsset } from "$lib/api";
    import { DbSettings } from "$lib/db/settings";
    import { generateRandomString } from "$lib/utils/misc";
    import { onMount } from "svelte";
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

    // Section Toggle State
    let sections = $state({
        destination: true,
        naming: true,
        settings: true,
        sizing: true,
        metadata: false,
        watermarking: false
    });

    function toggleSection(name: keyof typeof sections) {
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
        destinationMode: "zip"
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
        ]
    });
    let activeTemplate = $state("{{basename}}");

    const settingsDb = new DbSettings<SavedExportSettings>("export_panel_settings");
    const renameDb = new DbSettings<SavedRenameSettings>("batch_rename_settings");
    let settingsLoaded = $state(false);

    onMount(async () => {
        const [savedExport, savedRename] = await Promise.all([settingsDb.load(), renameDb.load()]);

        if (savedExport) {
            settings = { ...settings, ...savedExport };
            if (savedExport.sections) {
                sections = { ...sections, ...savedExport.sections };
            }
        }

        if (savedRename) {
            renameSettings = { ...renameSettings, ...savedRename };
        }

        settingsLoaded = true;
    });

    $effect(() => {
        if (!settingsLoaded) {
            return;
        }

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

    <div class="export-body">
        <!-- DESTINATION -->
        <div class="section" class:expanded={sections.destination}>
            <button class="section-header" onclick={() => toggleSection("destination")}>
                <MaterialIcon iconName={sections.destination ? "expand_more" : "chevron_right"} />
                <span>Destination</span>
            </button>
            {#if sections.destination}
                <div class="section-content" transition:slide>
                    <InputSelect
                        label="Export to"
                        options={[{ value: "zip", label: "Download as ZIP" }]}
                        bind:value={settings.destinationMode}
                    />
                </div>
            {/if}
        </div>

        <!-- FILE NAMING -->
        <div class="section" class:expanded={sections.naming}>
            <button class="section-header" onclick={() => toggleSection("naming")}>
                <MaterialIcon iconName={sections.naming ? "expand_more" : "chevron_right"} />
                <span>File Naming</span>
            </button>
            {#if sections.naming}
                <div class="section-content" transition:slide>
                    <BatchRenameBuilder
                        bind:settings={renameSettings}
                        bind:activeTemplate
                        {assets}
                        format={settings.format}
                    />
                </div>
            {/if}
        </div>

        <!-- FILE SETTINGS -->
        <div class="section" class:expanded={sections.settings}>
            <button class="section-header" onclick={() => toggleSection("settings")}>
                <MaterialIcon iconName={sections.settings ? "expand_more" : "chevron_right"} />
                <span>File Settings</span>
            </button>
            {#if sections.settings}
                <div class="section-content" transition:slide>
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
                    <InputSelect
                        label="Color Space"
                        options={Array.from(colorSpaceOptions)}
                        bind:value={settings.colorSpace}
                    />
                    <Checkbox
                        id="strip-meta"
                        label="Remove all metadata (EXIF, XMP, IPTC)"
                        bind:checked={settings.stripMetadata}
                    />
                </div>
            {/if}
        </div>

        <!-- IMAGE SIZING -->
        <div class="section" class:expanded={sections.sizing}>
            <button class="section-header" onclick={() => toggleSection("sizing")}>
                <MaterialIcon iconName={sections.sizing ? "expand_more" : "chevron_right"} />
                <span>Image Sizing</span>
            </button>
            {#if sections.sizing}
                <div class="section-content" transition:slide>
                    <InputSelect
                        label="Resize to Fit"
                        options={Array.from(resizeOptions)}
                        bind:value={settings.resizeMode}
                    />
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
                </div>
            {/if}
        </div>

        <!-- METADATA (Placeholder) -->
        <div class="section" class:expanded={sections.metadata}>
            <button class="section-header" onclick={() => toggleSection("metadata")}>
                <MaterialIcon iconName={sections.metadata ? "expand_more" : "chevron_right"} />
                <span>Metadata</span>
            </button>
            {#if sections.metadata}
                <div class="section-content" transition:slide>
                    <p class="placeholder-text">Copyright and Contact Info will be added here.</p>
                </div>
            {/if}
        </div>

        <!-- WATERMARKING (Placeholder) -->
        <div class="section" class:expanded={sections.watermarking}>
            <button class="section-header" onclick={() => toggleSection("watermarking")}>
                <MaterialIcon iconName={sections.watermarking ? "expand_more" : "chevron_right"} />
                <span>Watermarking</span>
            </button>
            {#if sections.watermarking}
                <div class="section-content" transition:slide>
                    <p class="placeholder-text">Watermarking options will be added here.</p>
                </div>
            {/if}
        </div>
    </div>

    <div class="export-footer">
        <Button onclick={handleCancel}>Cancel</Button>
        <Button variant="primary" onclick={handleExport} class="export-btn">
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
        padding: var(--viz-spacing-sm) var(--viz-spacing-xl) !important;
        font-size: var(--viz-font-size-sm) !important;
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
        border-bottom: 1px solid var(--viz-80);

        &:last-child {
            border-bottom: none;
        }

        &.expanded {
            background-color: var(--viz-bg-color);
        }
    }

    .section-header {
        width: 100%;
        display: flex;
        align-items: center;
        padding: var(--viz-spacing-sm) var(--viz-spacing-md);
        background: none;
        border: none;
        color: var(--viz-text-color);
        cursor: pointer;
        font-weight: 600;
        font-size: var(--viz-font-size-sm);
        text-align: left;
        transition: background-color 0.2s;

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
