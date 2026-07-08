<script lang="ts">
    import { invalidateAll } from "$app/navigation";
    import type { VizConfig } from "$lib/api";
    import { api } from "$lib/api";
    import Checkbox from "$lib/components/ui/Checkbox.svelte";
    import IconButton from "$lib/components/ui/IconButton.svelte";
    import InputSelect from "$lib/components/ui/InputSelect.svelte";
    import InputText from "$lib/components/ui/InputText.svelte";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import { toastState } from "$lib/toast-notifcations/notif-state.svelte";
    import { type MaterialSymbol } from "$lib/types/MaterialSymbol";
    import { copyToClipboard } from "$lib/utils/misc";
    import { toSentenceCase } from "$lib/utils/strings";
    import Handlebars from "handlebars";
    import { DateTime } from "luxon";
    import { buildDateTokens, cleanPathSegment, DEFAULT_TEMPLATE_EXAMPLE } from "$lib/ui-tools/template";

    interface Props {
        config: VizConfig;
    }

    let { config }: Props = $props();

    let defaultTemplate = "{{y}}/{{y}}-{{MM}}-{{dd}}/{{filename}}";
    let activeTemplate = $derived(config?.storage?.storage_path_template || defaultTemplate);
    let template = $state("");

    // Sync template state with config prop updates
    $effect(() => {
        template = activeTemplate;
    });

    let saving = $state(false);

    async function handleSaveTemplate() {
        if (!config) {
            return;
        }

        saving = true;
        try {
            const updatedConfig = {
                ...config,
                storage: {
                    ...config.storage,
                    storage_path_template: template
                }
            };

            const response = await api.updateSystemConfig(updatedConfig);
            if (response.status === 200) {
                toastState.addToast({
                    type: "success",
                    message: "Storage path template saved successfully."
                });
                await invalidateAll();
            } else {
                toastState.addToast({
                    type: "error",
                    message: response.data?.error || "Failed to save configuration."
                });
            }
        } catch (e) {
            toastState.addToast({
                type: "error",
                message: (e as Error).message || "An unexpected error occurred."
            });
        } finally {
            saving = false;
        }
    }

    let copied = $state(false);

    // Context Values
    let hasCollection = $state(true);
    let filename = $state(DEFAULT_TEMPLATE_EXAMPLE.filename);
    let make = $state(DEFAULT_TEMPLATE_EXAMPLE.make);
    let model = $state(DEFAULT_TEMPLATE_EXAMPLE.model);
    let lensModel = $state(DEFAULT_TEMPLATE_EXAMPLE.lensModel);
    let assetUid = $state(DEFAULT_TEMPLATE_EXAMPLE.assetUid);

    const getExampleDate = () =>
        DateTime.fromISO(DEFAULT_TEMPLATE_EXAMPLE.exampleDateStr, { locale: window.navigator.language });

    let context = $derived({
        ...buildDateTokens(getExampleDate()),
        seq: "001",
        filename: cleanPathSegment(filename),
        assetUid: cleanPathSegment(assetUid),
        collection: hasCollection ? cleanPathSegment("Collection Name") : null,
        "collection-startDate-y": hasCollection ? getExampleDate().toFormat("y") : null,
        make: cleanPathSegment(make),
        model: cleanPathSegment(model),
        lensModel: cleanPathSegment(lensModel)
    });

    const storagePresets = [
        { name: "Default (Daily Partition)", value: defaultTemplate },
        { name: "Standard (Year/Month/Day)", value: "{{y}}/{{MM}}/{{dd}}/{{filename}}" },
        { name: "Year/Month Name/Day", value: "{{y}}/{{MMMM}}/{{dd}}/{{filename}}" },
        { name: "Flat (Year-Month-Day)", value: "{{y}}-{{MM}}-{{dd}}/{{filename}}" },
        { name: "Year/Month", value: "{{y}}/{{MM}}/{{filename}}" },
        { name: "Year/Month Name", value: "{{y}}/{{MMMM}}/{{filename}}" },
        { name: "Year/Weekly Partition", value: "{{y}}/{{y}}-{{WW}}/{{filename}}" },
        {
            name: "Camera Info (Make/Model/Lens)",
            value: "{{make}}/{{model}}/{{lensModel}}/{{filename}}"
        },
        {
            name: "By Collection (with fallback)",
            value: "{{#if collection}}{{collection}}{{else}}Other/{{MM}}{{/if}}/{{filename}}"
        },
        {
            name: "By Collection & Year (with fallback)",
            value: "{{#if collection}}{{collection-startDate-y}}/{{collection}}{{else}}{{y}}/Other/{{MM}}{{/if}}/{{filename}}"
        },
        { name: "Unique Asset ID (No collision)", value: "{{y}}/{{y}}-{{MM}}-{{dd}}/{{assetUid}}" }
    ];

    const selectOptions = $derived(
        storagePresets.map((preset) => ({
            value: preset.value,
            label: renderTemplate(preset.value, context)
        }))
    );
    let selectedPreset = $state("");

    // Automatically sync preset selection dropdown with template changes
    $effect(() => {
        const matchingPreset = storagePresets.find((p) => p.value === template);
        selectedPreset = matchingPreset ? matchingPreset.value : "";
    });

    // Derive active preset name for description display
    let selectedPresetName = $derived.by(() => {
        const matchingPreset = storagePresets.find((p) => p.value === template);
        return matchingPreset ? matchingPreset.name : "";
    });

    const storageTokensDateTime = {
        second: ["s", "ss", "SSS"],
        minute: ["m", "mm"],
        day: ["d", "dd"],
        week: ["W", "WW"],
        hour: ["h", "hh", "H", "HH"],
        year: ["y", "yy"],
        month: ["M", "MM", "MMM", "MMMM"]
    };

    const storageTokensOther: Record<string, string> = {
        filename: "Original filename of the image",
        assetUid: "Unique identifier for the image",
        collection: "Name of the collection the image belongs to",
        collectionStartDateY: "Year of the collection's start date",
        make: "Camera make",
        model: "Camera model",
        lensModel: "Lens model used to capture the image"
    };

    function renderTemplate(tplStr: string, ctx: Record<string, any>): string {
        const templateFn = Handlebars.compile(tplStr);
        return templateFn(ctx);
    }

    // Compile and render template with error handling
    let templateCompileResult = $derived.by(() => {
        try {
            const renderedPath = renderTemplate(template, context);
            return { path: renderedPath, error: null };
        } catch (e) {
            return { path: "", error: "[Template Error]: Error rendering template." };
        }
    });

    function insertToken(token: string) {
        const tokenStr = `{{${token}}}`;
        const inputEl = document.getElementById("template-input") as HTMLInputElement | null;
        if (!inputEl) {
            template += tokenStr;
            return;
        }

        const start = inputEl.selectionStart || 0;
        const end = inputEl.selectionEnd || 0;
        const text = inputEl.value;
        template = text.substring(0, start) + tokenStr + text.substring(end);

        // Reset focus and cursor position after render
        setTimeout(() => {
            inputEl?.focus();
            const newCursorPos = start + tokenStr.length;
            inputEl?.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    }

    function handlePresetChange(val: string) {
        if (val) {
            template = val;
        }
    }

    function copyTemplate() {
        copyToClipboard(template);
        copied = true;
        setTimeout(() => {
            copied = false;
        }, 2000);
    }

    function resetTemplate() {
        template = activeTemplate;
    }
</script>

<div class="storage-template-card">
    <div class="card-header">
        <div class="header-icon">
            <MaterialIcon iconName="folder_open" />
        </div>
        <div class="header-text">
            <h3>Storage Path Template</h3>
            <p>Customize the directory and naming structure of your stored media assets.</p>
        </div>
    </div>

    <!-- Active Read-only Indicator -->
    <div class="active-badge-bar">
        <div class="info-tag">
            <MaterialIcon
                iconName={template !== activeTemplate ? "warning" : "check_circle"}
                class={template !== activeTemplate ? "warning-icon" : "success-icon"}
            />
            <span
                >Current Template: <code class="mono">{config?.storage?.storage_path_template || defaultTemplate}</code>
                {#if template !== activeTemplate}
                    <span class="unsaved-badge">Unsaved changes</span>
                {/if}
            </span>
        </div>
        <p class="config-note">
            To save a new template permanently, click the "Save Template" button below to write the changes back to the
            server config file.
        </p>
    </div>

    <div class="designer-grid">
        <!-- Left Column: Template Editor & Preview -->
        <div class="editor-section">
            <div class="control-group">
                <div class="label-row">
                    <div class="designer-header">
                        <h4 class="designer-label">Template Designer</h4>
                        <p>
                            Use the input below to define your storage path template (slashes are cleaned for safe
                            paths). You can also click on the available variables on the right to insert them at your
                            cursor position.
                        </p>
                    </div>

                    <div class="action-buttons">
                        <IconButton
                            variant="small"
                            iconName="settings_backup_restore"
                            onclick={resetTemplate}
                            disabled={template === activeTemplate || saving}
                        >
                            Reset
                        </IconButton>
                        <IconButton
                            variant="small"
                            weight={300}
                            iconName={saving ? "sync" : "save"}
                            class="{saving ? 'spinning' : ''} save-sptemplate-btn"
                            onclick={handleSaveTemplate}
                            disabled={template === activeTemplate || saving || !!templateCompileResult.error}
                        >
                            {saving ? "Saving..." : "Save Template"}
                        </IconButton>
                    </div>
                </div>
            </div>

            <div class="control-group">
                <InputSelect
                    label="Select Preset Template"
                    labelPosition="side"
                    options={selectOptions}
                    bind:value={selectedPreset}
                    onchange={handlePresetChange}
                />
            </div>

            <div class="input-wrapper">
                <InputText
                    id="template-input"
                    bind:value={template}
                    placeholder={defaultTemplate}
                    class="mono-input"
                    description={selectedPresetName ? `Preset: ${selectedPresetName}` : "Custom template"}
                />
            </div>

            <!-- Path Live Preview -->
            <div class="preview-panel" class:has-error={!!templateCompileResult.error}>
                <div class="preview-header">
                    <span class="preview-title">Preview</span>
                    <IconButton
                        variant="mini"
                        class="preview-copy-btn"
                        iconName={copied ? "check" : "content_copy"}
                        onclick={copyTemplate}
                        title="Copy template string"
                    >
                        {copied ? "Copied" : "Copy"}
                    </IconButton>
                </div>
                <div class="preview-body">
                    {#if templateCompileResult.error}
                        <div class="error-msg">
                            <MaterialIcon iconName="error" />
                            <span>{templateCompileResult.error}</span>
                        </div>
                    {:else}
                        <span
                            class="root-dir"
                            title={`${config?.base_directory}/${config?.upload?.location}/${templateCompileResult.path}`}
                        >
                            {config?.base_directory}/{config?.upload?.location}/<span class="rendered-path"
                                >{templateCompileResult.path}</span
                            ></span
                        >
                    {/if}
                </div>
                <div class="preview-footer">
                    {#if templateCompileResult.error}
                        * Fix the template syntax error above to enable saving.
                    {:else}
                        * Evaluated in real-time based variables below.
                    {/if}
                </div>
            </div>

            <!-- Context Customizer Controls -->
            <div class="context-section">
                <div class="context-header">
                    <h4>Template Variables</h4>
                    <p>
                        Adjust the example variable values below to see how they affect the rendered path in the preview
                        above.
                    </p>
                </div>
                <div class="context-grid">
                    <div class="field-item">
                        <InputText label="Filename" bind:value={filename} placeholder="PHOTO_2193.jpg" />
                    </div>

                    <div class="field-item checkbox-field">
                        <Checkbox bind:checked={hasCollection} label="Has Collection context" />
                    </div>

                    <div class="field-item">
                        <InputText label="Camera Make" bind:value={make} placeholder="FUJIFILM" />
                    </div>

                    <div class="field-item">
                        <InputText label="Camera Model" bind:value={model} placeholder="X-S10" />
                    </div>

                    <div class="field-item">
                        <InputText label="Lens Model" bind:value={lensModel} placeholder="XF 35mm f/2.0" />
                    </div>
                </div>
            </div>
        </div>

        <!-- Right Column: Interactive Tokens Reference Guide -->
        <div class="tokens-section">
            <div class="tokens-header">
                <h4>Available Variables</h4>
                <p>Click any token below to insert it at your cursor position.</p>
            </div>

            <div class="tokens-scrollable">
                {#snippet tokenCategory(iconName: MaterialSymbol, title: string, children: import("svelte").Snippet)}
                    <div class="token-category">
                        <div class="category-header">
                            <MaterialIcon {iconName} weight={300} />
                            <h5>{title}</h5>
                        </div>
                        {@render children()}
                    </div>
                {/snippet}

                {#snippet dateTimeTokens()}
                    <div class="tokens-grid">
                        {#each Object.entries(storageTokensDateTime).sort() as [unit, tokens]}
                            <div class="token-unit-group">
                                <span class="unit-title">{toSentenceCase(unit)}</span>
                                <div class="badge-list">
                                    {#each tokens as token}
                                        <button
                                            class="token-badge"
                                            onclick={() => insertToken(token)}
                                            title={"Click to insert {{" + token + "}}"}
                                        >
                                            <span class="token-code">{token}</span>
                                            <span class="token-val">{getExampleDate().toFormat(token)}</span>
                                        </button>
                                    {/each}
                                </div>
                            </div>
                        {/each}
                    </div>
                {/snippet}

                {#snippet metadataTokens()}
                    <div class="badge-list vertical">
                        {#each Object.entries(storageTokensOther) as [token, desc]}
                            {#if ["make", "model", "lensModel", "filename", "assetUid"].includes(token)}
                                <button
                                    class="token-badge full-width"
                                    onclick={() => insertToken(token)}
                                    title={"Click to insert {{" + token + "}}"}
                                >
                                    <div class="badge-left">
                                        <span class="token-code">{token}</span>
                                        <span class="token-val-desc">{desc}</span>
                                    </div>
                                    <span class="token-example-val">
                                        "{context[token as keyof typeof context] || "Unknown"}"
                                    </span>
                                </button>
                            {/if}
                        {/each}
                    </div>
                {/snippet}

                {#snippet collectionTokens()}
                    <div class="badge-list vertical">
                        {#each Object.entries(storageTokensOther) as [token, desc]}
                            {#if ["collection", "collectionStartDateY"].includes(token)}
                                <button
                                    class="token-badge full-width"
                                    onclick={() =>
                                        insertToken(
                                            token === "collectionStartDateY" ? "collection-startDate-y" : token
                                        )}
                                    title={"Click to insert {{" +
                                        (token === "collectionStartDateY" ? "collection-startDate-y" : token) +
                                        "}}"}
                                >
                                    <div class="badge-left">
                                        <span class="token-code"
                                            >{token === "collectionStartDateY" ? "collection-startDate-y" : token}</span
                                        >
                                        <span class="token-val-desc">{desc}</span>
                                    </div>
                                    <span class="token-example-val">
                                        {#if context[token === "collectionStartDateY" ? "collection-startDate-y" : (token as keyof typeof context)]}
                                            "{context[
                                                token === "collectionStartDateY"
                                                    ? "collection-startDate-y"
                                                    : (token as keyof typeof context)
                                            ]}"
                                        {:else}
                                            <span class="null-val">null</span>
                                        {/if}
                                    </span>
                                </button>
                            {/if}
                        {/each}
                    </div>
                {/snippet}

                {@render tokenCategory("today", "Date/Time Tokens", dateTimeTokens)}
                {@render tokenCategory("photo_camera", "EXIF / Metadata Tokens", metadataTokens)}
                {@render tokenCategory("folder_special", "Collection Tokens", collectionTokens)}
            </div>
        </div>
    </div>
</div>

<style lang="scss">
    .storage-template-card {
        background-color: var(--viz-100);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .card-header {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-md);
        padding: var(--viz-spacing-lg) var(--viz-spacing-lg) var(--viz-spacing-md);
        border-bottom: var(--viz-border-thin);

        .header-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 2.5rem;
            height: 2.5rem;
            background-color: var(--viz-95);
            border: var(--viz-border-thin);
            border-radius: var(--viz-border-radius-md);
            color: var(--viz-text-color);
        }

        .header-text {
            h3 {
                margin: 0;
                font-family: var(--viz-display-font);
                font-size: var(--viz-font-size-3xl);
                font-weight: 600;
                color: var(--viz-text-color);
            }

            p {
                margin: var(--viz-spacing-xxs) 0 0;
                font-size: var(--viz-font-size-std);
                color: var(--viz-40);
            }
        }
    }

    .active-badge-bar {
        background-color: var(--viz-95);
        border-bottom: var(--viz-border-thin);
        padding: var(--viz-spacing-md) var(--viz-spacing-lg);
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xs);

        .info-tag {
            display: flex;
            align-items: center;
            gap: var(--viz-spacing-sm);
            font-size: var(--viz-font-size-lg);
            font-weight: 500;
            color: var(--viz-text-color);

            :global(span.material-symbols-outlined) {
                font-size: 1.1rem;
            }

            :global(.warning-icon) {
                color: color-mix(in srgb, var(--viz-warning-color) 75%, var(--viz-text-color));
            }

            :global(.success-icon) {
                color: var(--viz-success-color);
            }

            .mono {
                font-family: var(--viz-mono-font);
                background-color: var(--viz-90);
                padding: var(--viz-spacing-xxs) var(--viz-spacing-xs);
                border: var(--viz-border-thin);
                border-radius: var(--viz-border-radius-sm);
                font-size: var(--viz-font-size-std);
            }
        }

        .config-note {
            margin: 0;
            font-size: var(--viz-font-size-std);
            color: var(--viz-40);
        }

        .unsaved-badge {
            font-size: var(--viz-font-size-std);
            font-weight: 600;
            background-color: color-mix(in srgb, var(--viz-warning-color) 12%, var(--viz-95));
            color: color-mix(in srgb, var(--viz-warning-color) 70%, var(--viz-text-color));
            border: 1px solid color-mix(in srgb, var(--viz-warning-color) 30%, var(--viz-60));
            padding: 2px var(--viz-spacing-xs);
            border-radius: var(--viz-border-radius-pill);
            margin-left: var(--viz-spacing-sm);
            display: inline-flex;
            align-items: center;
        }
    }

    .designer-grid {
        display: grid;
        grid-template-columns: 1.2fr 1fr;
        min-height: 32rem;

        @media (max-width: 1024px) {
            grid-template-columns: 1fr;
        }
    }

    .editor-section {
        padding: var(--viz-spacing-lg);
        border-right: var(--viz-border-thin);
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-lg);

        @media (max-width: 1024px) {
            border-right: none;
            border-bottom: var(--viz-border-thin);
        }
    }

    .control-group {
        display: flex;
        flex-direction: column;

        .label-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: var(--viz-spacing-md);
            gap: var(--viz-spacing-md);

            .designer-header {
                display: flex;
                flex-direction: column;

                .designer-label {
                    margin: 0;
                    font-size: var(--viz-font-size-xl);
                    font-weight: 600;
                    color: var(--viz-text-color);
                }

                p {
                    margin: var(--viz-spacing-xs) 0 0;
                    font-size: var(--viz-font-size-std);
                    color: var(--viz-40);
                }
            }

            .action-buttons {
                display: flex;
                gap: var(--viz-spacing-xs);
                align-items: center;
                margin-top: var(--viz-spacing-xxs);
                flex-shrink: 0;
                white-space: nowrap;
            }
        }
    }

    .input-wrapper {
        position: relative;

        :global(input.mono-input) {
            background-color: var(--viz-80);
            font-family: var(--viz-mono-font) !important;
            font-weight: 700 !important;
        }
    }

    .preview-panel {
        $preview-panel-border: 1px solid #414751;

        background-color: #0d0e11;
        border-radius: var(--viz-border-radius-md);
        border: $preview-panel-border;
        overflow: hidden;
        display: flex;
        flex-direction: column;

        .preview-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: #16181d;
            padding: var(--viz-spacing-sm) var(--viz-spacing-md);
            border-bottom: $preview-panel-border;

            :global(.preview-copy-btn) {
                color: var(--viz-text-color-light);
                padding: var(--viz-spacing-xs) var(--viz-spacing-sm);
                border-color: var(--viz-40);
            }

            .preview-title {
                font-size: var(--viz-font-size-std);
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: #8f96a3;
                font-weight: 600;
            }
        }

        .preview-body {
            padding: var(--viz-spacing-lg);
            font-family: var(--viz-mono-font);
            font-size: var(--viz-font-size-lg);
            word-break: break-all;
            line-height: 1.5;

            .root-dir {
                color: #57606a;
            }

            .rendered-path {
                color: #2ea043;
                font-weight: 500;
            }

            .error-msg {
                color: var(--viz-error-color);
                display: flex;
                align-items: center;
                gap: var(--viz-spacing-sm);
                font-family: var(--viz-mono-font);
            }
        }

        .preview-footer {
            background-color: #121418;
            padding: var(--viz-spacing-xs) var(--viz-spacing-md);
            font-size: var(--viz-font-size-std);
            color: var(--viz-20-dark);
            border-top: 1px solid #1f2229;
        }

        &.has-error {
            border-color: color-mix(in srgb, var(--viz-error-color) 40%, #1f2229);
            box-shadow: 0 0 8px color-mix(in srgb, var(--viz-error-color) 8%, transparent);

            .preview-header {
                border-bottom-color: color-mix(in srgb, var(--viz-error-color) 25%, #232730);
            }
        }
    }

    .context-section {
        display: flex;
        flex-direction: column;
        border-top: var(--viz-border-thin);
        padding-top: var(--viz-spacing-md);
        gap: var(--viz-spacing-md);

        .context-header {
            h4 {
                margin: 0;
                font-size: var(--viz-font-size-xl);
                font-weight: 600;
                color: var(--viz-text-color);
            }

            p {
                margin: var(--viz-spacing-xs) 0 0;
                font-size: var(--viz-font-size-std);
                color: var(--viz-40);
            }
        }

        .context-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: var(--viz-spacing-md);

            @media (max-width: 480px) {
                grid-template-columns: 1fr;
            }
        }

        .field-item {
            display: flex;
            flex-direction: column;
        }

        .checkbox-field {
            justify-content: center;
            padding-top: var(--viz-spacing-md);
        }
    }

    .tokens-section {
        background-color: var(--viz-90);
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
    }

    .tokens-header {
        padding: var(--viz-spacing-md) var(--viz-spacing-lg);
        border-bottom: var(--viz-border-thin);

        h4 {
            margin: 0;
            font-size: var(--viz-font-size-xl);
            font-weight: 600;
            color: var(--viz-text-color);
        }

        p {
            margin: var(--viz-spacing-xs) 0 0;
            font-size: var(--viz-font-size-std);
            color: var(--viz-40);
        }
    }

    .tokens-scrollable {
        padding: var(--viz-spacing-lg);
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-lg);
        overflow-y: auto;
        flex: 1;
        max-height: 40rem;

        &::-webkit-scrollbar {
            width: 6px;
        }
        &::-webkit-scrollbar-track {
            background: transparent;
        }
        &::-webkit-scrollbar-thumb {
            background: var(--viz-80);
            border-radius: var(--viz-border-radius-pill);
        }
        &::-webkit-scrollbar-thumb:hover {
            background: var(--viz-70);
        }
    }

    .token-category {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-sm);

        .category-header {
            display: flex;
            align-items: center;
            gap: var(--viz-spacing-xs);

            :global(span) {
                font-size: 1rem;
            }

            h5 {
                margin: 0;
                font-size: var(--viz-font-size-lg);
            }
        }
    }

    .tokens-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: var(--viz-spacing-md);
    }

    .token-unit-group {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xs);

        .unit-title {
            font-size: var(--viz-font-size-std);
            font-weight: 600;
            color: var(--viz-30);
        }
    }

    .badge-list {
        display: flex;
        flex-wrap: wrap;
        gap: var(--viz-spacing-xs);

        &.vertical {
            flex-direction: column;
            gap: var(--viz-spacing-sm);
        }
    }

    .token-badge {
        background-color: var(--viz-100);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        padding: var(--viz-spacing-xs) var(--viz-spacing-sm);
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-xs);
        cursor: pointer;
        text-align: left;
        transition:
            border-color 0.15s ease,
            background-color 0.15s ease;

        &:hover {
            border-color: var(--viz-primary);
            background-color: var(--viz-80);
        }

        &:focus-visible {
            box-shadow:
                0 0 0 2px var(--viz-100),
                0 0 0 4px var(--viz-primary);
            outline: none;
        }

        .token-code {
            font-family: var(--viz-mono-font);
            font-size: var(--viz-font-size-std);
            font-weight: 600;
            color: var(--viz-text-color);
            background-color: var(--viz-95);
            padding: 2px 4px;
            border-radius: var(--viz-border-radius-sm);
            border: 1px solid var(--viz-60);
        }

        .token-val {
            font-family: var(--viz-mono-font);
            font-size: var(--viz-font-size-std);
            color: var(--viz-40);
        }

        &.full-width {
            width: 100%;
            justify-content: space-between;
            padding: var(--viz-spacing-sm) var(--viz-spacing-md);

            .badge-left {
                display: flex;
                flex-direction: column;
                gap: var(--viz-spacing-xxs);
            }

            .token-val-desc {
                font-size: var(--viz-font-size-std);
                color: var(--viz-40);
            }

            .token-example-val {
                font-size: var(--viz-font-size-lg);
                font-weight: 600;

                .null-val {
                    color: var(--viz-30);
                    font-style: italic;
                }
            }
        }
    }

    :global(.save-sptemplate-btn) {
        background-color: var(--viz-primary) !important;
        border: 1px solid var(--viz-primary) !important;
        color: var(--viz-10-dark) !important;
        font-weight: 400 !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: background-color 150ms cubic-bezier(0.4, 0, 0.2, 1) !important;

        &:hover:not(:disabled) {
            background-color: color-mix(in srgb, var(--viz-primary) 85%, var(--viz-text-color)) !important;
            border-color: transparent !important;
        }

        &:disabled {
            background-color: var(--viz-95) !important;
            border: var(--viz-border-thin) !important;
            color: var(--viz-40) !important;
            box-shadow: none !important;
        }
    }

    :global(.spinning .viz-material-icon) {
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }
</style>
