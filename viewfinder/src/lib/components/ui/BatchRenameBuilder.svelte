<script module lang="ts">
    export const defaultTemplate = "{{basename}}_{{seq}}";
</script>

<script lang="ts">
    import { DateTime } from "luxon";
    import type { ImageAsset } from "$lib/api";
    import { safeRenderRenameTemplate } from "$lib/ui-tools/renamer";
    import {
        DATE_FORMAT_OPTIONS,
        DATE_FORMAT_TEMPLATES,
        DEFAULT_TEMPLATE_EXAMPLE,
        METADATA_FIELD_OPTIONS,
        NAMING_OPTIONS,
        ROW_TYPES,
        buildDateTokens
    } from "$lib/ui-tools/template";
    import type { ExportFormats } from "$lib/utils/images";
    import { generateRandomString } from "$lib/utils/misc";
    import IconButton from "./IconButton.svelte";
    import InputSelect from "./InputSelect.svelte";
    import InputText from "./InputText.svelte";
    import MaterialIcon from "./MaterialIcon.svelte";
    import TokenChip from "./TokenChip.svelte";

    const previewDate = DateTime.fromISO(DEFAULT_TEMPLATE_EXAMPLE.exampleDateStr);
    const dateTokens = buildDateTokens(previewDate);

    export type RuleRowType = "original" | "text" | "sequence" | "date" | "metadata";
    export type DateFormat = "YYYY-MM-DD" | "YYYYMMDD" | "YYMMDD" | "YYYY" | "MM" | "DD";
    export type MetadataField = "make" | "model" | "lensModel";

    export interface RenameRow {
        id: string;
        type: RuleRowType;
        textValue: string;
        dateFormat: DateFormat;
        metadataField: MetadataField;
        sequencePadding: number;
    }

    export type NamingMode = "original" | "custom" | "sequence" | "original-sequence" | "builder" | "template";

    export interface SavedRenameSettings {
        namingMode: NamingMode;
        customName: string;
        namingTemplate: string;
        sequenceStart: number;
        sequencePadding: number;
        builderRows: RenameRow[];
    }

    interface Props {
        settings: SavedRenameSettings;
        activeTemplate?: string;
        assets: ImageAsset[];
        format?: ExportFormats;
    }

    let {
        settings = $bindable({
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
        }),
        activeTemplate = $bindable("{{basename}}"),
        assets,
        format = "jpg"
    }: Props = $props();

    function addRow() {
        settings.builderRows.push({
            id: generateRandomString(16),
            type: "text",
            textValue: "_",
            dateFormat: "YYYY-MM-DD",
            metadataField: "model",
            sequencePadding: 4
        });
    }

    function removeRow(id: string) {
        if (settings.builderRows.length > 1) {
            settings.builderRows = settings.builderRows.filter((r) => r.id !== id);
        }
    }

    function moveRowUp(index: number) {
        if (index > 0) {
            const temp = settings.builderRows[index];
            settings.builderRows[index] = settings.builderRows[index - 1];
            settings.builderRows[index - 1] = temp;
        }
    }

    function moveRowDown(index: number) {
        if (index < settings.builderRows.length - 1) {
            const temp = settings.builderRows[index];
            settings.builderRows[index] = settings.builderRows[index + 1];
            settings.builderRows[index + 1] = temp;
        }
    }

    // Dynamic Handlebars template derived from row builder
    let builderTemplate = $derived.by(() => {
        return settings.builderRows
            .map((row) => {
                if (row.type === "original") {
                    return "{{basename}}";
                }
                if (row.type === "text") {
                    // Escape curly braces from text to prevent parsing issues
                    return row.textValue.replace(/[{}]/g, "");
                }
                if (row.type === "sequence") {
                    return "{{seq}}";
                }
                if (row.type === "date") {
                    return DATE_FORMAT_TEMPLATES[row.dateFormat] || "{{y}}-{{MM}}-{{dd}}";
                }
                if (row.type === "metadata") {
                    return `{{${row.metadataField}}}`;
                }
                return "";
            })
            .join("");
    });

    // Derive activeTemplate based on namingMode
    let computedActiveTemplate = $derived.by(() => {
        if (settings.namingMode === "original") {
            return "{{basename}}";
        }
        if (settings.namingMode === "custom") {
            return "{{customName}}";
        }
        if (settings.namingMode === "sequence") {
            return "{{seq}}";
        }
        if (settings.namingMode === "original-sequence") {
            return defaultTemplate;
        }
        if (settings.namingMode === "builder") {
            return builderTemplate;
        }
        return settings.namingTemplate;
    });

    // Sync activeTemplate with parent
    $effect(() => {
        activeTemplate = computedActiveTemplate;
    });

    // Determine if sequence settings are needed
    let hasSequence = $derived(computedActiveTemplate.includes("{{seq}}"));

    // Preview items
    let previewItems = $derived.by(() => {
        return assets.slice(0, 3).map((asset, index) => {
            const originalName =
                asset.image_metadata?.original_file_name ||
                asset.image_metadata?.file_name ||
                asset.name ||
                "unknown.jpg";

            const { name, error } = safeRenderRenameTemplate(computedActiveTemplate, asset, index, {
                sequenceStart: settings.sequenceStart,
                sequencePadding: settings.sequencePadding,
                customName: settings.customName
            });

            return {
                original: originalName,
                preview: error ? error : `${name}.${format}`
            };
        });
    });

    function insertToken(token: string) {
        settings.namingTemplate = settings.namingTemplate + `{{${token}}}`;
    }
</script>

<div class="batch-rename-builder">
    <div class="control-group">
        <InputSelect
            label="Preset / Naming Mode"
            options={Array.from(NAMING_OPTIONS)}
            bind:value={settings.namingMode}
        />
    </div>

    <!-- Batch Rename Builder UI -->
    {#if settings.namingMode === "builder"}
        <div class="rename-container">
            <span class="builder-label">Rename Rules</span>
            <div class="rules-list">
                {#each settings.builderRows as row, index (row.id)}
                    <div class="rule-row">
                        <!-- Ordering Buttons -->
                        <div class="order-actions">
                            <IconButton
                                iconName="expand_less"
                                variant="mini"
                                disabled={index === 0}
                                onclick={() => moveRowUp(index)}
                                title="Move up"
                            />
                            <IconButton
                                iconName="expand_more"
                                variant="mini"
                                disabled={index === settings.builderRows.length - 1}
                                onclick={() => moveRowDown(index)}
                                title="Move down"
                            />
                        </div>

                        <!-- Rule Type Selector -->
                        <div class="type-select">
                            <InputSelect options={Array.from(ROW_TYPES)} bind:value={row.type} />
                        </div>

                        <!-- Rule Parameter inputs -->
                        <div class="parameter-input">
                            {#if row.type === "text"}
                                <InputText bind:value={row.textValue} placeholder="Enter custom text..." />
                            {:else if row.type === "date"}
                                <InputSelect options={Array.from(DATE_FORMAT_OPTIONS)} bind:value={row.dateFormat} />
                            {:else if row.type === "metadata"}
                                <InputSelect
                                    options={Array.from(METADATA_FIELD_OPTIONS)}
                                    bind:value={row.metadataField}
                                />
                            {:else if row.type === "sequence"}
                                <div class="sequence-params">
                                    <InputText
                                        type="number"
                                        bind:value={row.sequencePadding}
                                        min={1}
                                        max={10}
                                        placeholder="4"
                                        style="max-width: 4rem;"
                                    />
                                    <span class="rule-fallback-desc">digits</span>
                                </div>
                            {:else}
                                <span class="rule-fallback-desc"> Original file name (without extension) </span>
                            {/if}
                        </div>

                        <!-- Delete Button -->
                        <IconButton
                            iconName="delete"
                            variant="small"
                            disabled={settings.builderRows.length <= 1}
                            onclick={() => removeRow(row.id)}
                            title="Remove element"
                            class="delete-rule-btn"
                        />
                    </div>
                {/each}
            </div>

            <!-- Add Row Button -->
            <div class="builder-actions">
                <IconButton
                    iconName="add"
                    variant="small"
                    onclick={addRow}
                    style="border: 1px solid var(--viz-border-subtle);"
                >
                    Add Element
                </IconButton>
            </div>
        </div>
    {/if}

    <!-- Custom Text Field -->
    {#if settings.namingMode === "custom" || settings.namingMode === "template" || (settings.namingMode === "builder" && computedActiveTemplate.includes("{{customName}}"))}
        <div class="control-group">
            <InputText label="Custom Text" bind:value={settings.customName} placeholder="Untitled" />
        </div>
    {/if}

    <!-- Custom Template Field -->
    {#if settings.namingMode === "template"}
        <div class="control-group">
            <InputText label="Template String" bind:value={settings.namingTemplate} placeholder={defaultTemplate} />
            <div class="token-chips">
                <TokenChip token="basename" value="DSC_0001" onclick={() => insertToken("basename")} />
                <TokenChip token="seq" value="0001" onclick={() => insertToken("seq")} />
                <TokenChip
                    token="customName"
                    value={settings.customName || "Untitled"}
                    onclick={() => insertToken("customName")}
                />
                <TokenChip token="y" value={dateTokens.y} onclick={() => insertToken("y")} />
                <TokenChip token="MM" value={dateTokens.MM} onclick={() => insertToken("MM")} />
                <TokenChip token="dd" value={dateTokens.dd} onclick={() => insertToken("dd")} />
                <TokenChip token="make" value={DEFAULT_TEMPLATE_EXAMPLE.make} onclick={() => insertToken("make")} />
                <TokenChip token="model" value={DEFAULT_TEMPLATE_EXAMPLE.model} onclick={() => insertToken("model")} />
            </div>
        </div>
    {/if}

    <!-- Sequence Options -->
    {#if hasSequence}
        <div class="control-row">
            <div class="control-group compact-w">
                <InputText label="Start #" type="number" bind:value={settings.sequenceStart} min="0" />
            </div>
            <div class="control-group compact-w">
                <InputText label="Digits" type="number" bind:value={settings.sequencePadding} min="1" max="10" />
            </div>
        </div>
    {/if}

    <!-- Live Preview Panel -->
    <div class="rename-preview-box">
        <span class="preview-title">Rename Preview</span>
        <div class="preview-list">
            {#each previewItems as item}
                <div class="preview-row">
                    <span class="preview-orig" title={item.original}>{item.original}</span>
                    {#if item.preview.trim() !== item.original.trim()}
                        <MaterialIcon iconName="arrow_forward" weight={500} class="preview-arrow" />
                        <span class="preview-new" title={item.preview}>{item.preview}</span>
                    {/if}
                </div>
            {/each}
            {#if assets.length > 3}
                <div class="preview-more">
                    and {assets.length - 3} more item(s)...
                </div>
            {/if}
        </div>
    </div>
</div>

<style lang="scss">
    .batch-rename-builder {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-sm);
        width: 100%;
    }

    .control-group {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xs);
        width: 100%;
    }

    .control-row {
        display: flex;
        gap: var(--viz-spacing-md);
        align-items: flex-end;
        width: 100%;
    }

    .compact-w {
        max-width: 6.25rem;
    }

    .rename-container {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xs);
        padding: var(--viz-spacing-sm);
        background-color: var(--viz-surface-card);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);

        .builder-label {
            font-size: var(--viz-font-size-lg);
            font-weight: 600;
            color: var(--viz-text-secondary);
        }

        .rules-list {
            display: flex;
            flex-direction: column;
            gap: var(--viz-spacing-xs);
        }

        .rule-row {
            display: flex;
            align-items: center;
            gap: var(--viz-spacing-xs);
            width: 100%;
            padding: var(--viz-spacing-xxs) 0;
            border-bottom: 1px solid var(--viz-surface-panel);

            &:last-child {
                border-bottom: none;
            }

            .order-actions {
                display: flex;
                flex-direction: column;
                gap: 1px;
            }

            .type-select {
                width: 8.5rem;
                flex-shrink: 0;
            }

            .parameter-input {
                flex: 1;
                min-width: 0;
                display: flex;
                align-items: center;
            }

            .rule-fallback-desc {
                font-size: var(--viz-font-size-std);
                color: var(--viz-text-secondary);
                font-style: italic;
                padding-left: var(--viz-spacing-xs);
            }

            .sequence-params {
                display: flex;
                align-items: center;
                gap: var(--viz-spacing-xs);
            }
        }

        .builder-actions {
            display: flex;
            justify-content: flex-start;
            margin-top: var(--viz-spacing-xs);
        }
    }

    .token-chips {
        display: flex;
        flex-wrap: wrap;
        gap: var(--viz-spacing-xs);
        margin-top: var(--viz-spacing-xs);
    }

    .rename-preview-box {
        background-color: var(--viz-surface-panel);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        padding: var(--viz-spacing-xs) var(--viz-spacing-sm);
        margin-top: var(--viz-spacing-xs);

        .preview-title {
            font-size: var(--viz-font-size-lg);
            font-weight: 600;
            color: var(--viz-text-secondary);
            display: block;
            margin-bottom: var(--viz-spacing-xs);
        }

        .preview-list {
            display: flex;
            flex-direction: column;
            gap: var(--viz-spacing-xxs);
        }

        .preview-row {
            display: flex;
            align-items: center;
            gap: var(--viz-spacing-sm);
            font-size: var(--viz-font-size-std);
            width: 100%;
            overflow: hidden;

            .preview-orig,
            .preview-new {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .preview-orig {
                color: var(--viz-text-secondary);
            }

            .preview-new {
                color: var(--viz-text-primary);
                font-weight: 600;
            }

            :global(.preview-arrow) {
                font-size: var(--viz-font-size-lg);
                color: var(--viz-text-secondary);
            }
        }

        .preview-more {
            font-size: var(--viz-font-size-std);
            color: var(--viz-text-secondary);
            font-style: italic;
            margin-top: var(--viz-spacing-xxs);
        }
    }
</style>
