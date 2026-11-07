<script lang="ts">
    import { type ModalOptions, modalsManager } from "#lib/components/modals/manager/ModalManager.svelte.ts";
    import Badge from "#lib/components/ui/Badge.svelte";
    import Button from "#lib/components/ui/Button.svelte";
    import ColourPicker from "#lib/components/ui/ColourPicker.svelte";
    import InputCombobox, { type InputOption } from "#lib/components/ui/InputCombobox.svelte";
    import InputText from "#lib/components/ui/InputText.svelte";
    import { type Keyword, type KeywordCreate, type KeywordUpdate, createKeyword, listKeywords } from "@viz/api";
    import { onMount } from "svelte";

    interface Props {
        id?: string;
        mode?: "edit" | "create" | "add";
        heading?: string;
        data?: Keyword;
        keywords?: Keyword[];
        selectedKeywords?: (Keyword | KeywordUpdate)[];
        buttonText?: string;
        modalAction?: (data: KeywordCreate | KeywordUpdate) => Promise<void> | void;
        onAdd?: (keywords: KeywordUpdate[]) => Promise<void> | void;
    }

    export const modalOptions: ModalOptions = {
        width: "30%"
    };

    let { mode, data, keywords = [], selectedKeywords = [], buttonText, modalAction, onAdd }: Props = $props();

    let currentMode = $derived<"edit" | "create" | "add">(mode ?? (data ? "edit" : "create"));

    // Form state for edit/create
    let name = $derived(data?.name ?? "");
    let colour = $derived(data?.colour ?? "");
    let parent = $derived(data?.parent ?? "");
    let isSubmitting = $state(false);

    // State for keywords
    let availableKeywords = $state<Keyword[]>([]);
    let activeKeywords = $state<KeywordUpdate[]>([]);
    let newKeywordInput = $state("");
    let isCreatingKeyword = $state(false);
    let isComboboxOpen = $state(false);
    let comboboxSelectedValue = $state("");
    let comboboxInputEl = $state<HTMLInputElement | null>(null);
    let submitButtonEl = $state<HTMLButtonElement | HTMLAnchorElement>();

    const hasKeywordChanges = $derived.by(() => {
        if (activeKeywords.length !== selectedKeywords.length) {
            return true;
        }

        const initialNames = new Set(
            selectedKeywords.map((k) => {
                return k.name?.toLowerCase();
            })
        );

        return activeKeywords.some((k) => {
            return !initialNames.has(k.name?.toLowerCase());
        });
    });

    const isNewKeyword = $derived.by(() => {
        const trimmed = newKeywordInput.trim().toLowerCase();
        if (!trimmed) {
            return false;
        }

        return !availableKeywords.some((k) => {
            return k.name?.toLowerCase() === trimmed;
        });
    });

    onMount(async () => {
        activeKeywords = selectedKeywords.map((k) => ({
            name: k.name,
            colour: k.colour,
            parent: k.parent
        }));

        if (keywords.length > 0) {
            availableKeywords = [...keywords];
            return;
        }

        try {
            const res = await listKeywords();
            if (res.status === 200 && res.data.keywords) {
                availableKeywords = res.data.keywords;
            }
        } catch (err) {
            const error = err as Error;
            console.error("Failed to fetch keywords:", error);
        }
    });

    const submitButtonText = $derived.by(() => {
        if (buttonText) {
            return buttonText;
        }

        if (currentMode === "create") {
            return "Create Keyword";
        }

        if (currentMode === "edit") {
            return "Save Changes";
        }

        return "Save Keywords";
    });

    const parentOptions = $derived<InputOption[]>([
        { value: "", label: "None" },
        ...availableKeywords
            .filter((k) => {
                if (data && k.uid === data.uid) {
                    return false;
                }

                return true;
            })
            .map((k) => ({
                value: k.uid,
                label: k.name
            }))
    ]);

    const comboboxOptions = $derived.by<InputOption[]>(() => {
        const trimmed = newKeywordInput.trim();
        const baseOptions = availableKeywords
            .filter((k) => {
                const activeNames = new Set(activeKeywords.map((ak) => ak.name?.toLowerCase()));
                return !activeNames.has(k.name?.toLowerCase());
            })
            .map((k) => ({
                value: k.uid,
                label: k.name
            }));

        if (trimmed && isNewKeyword) {
            const hasSuggestions = baseOptions.some((opt) => {
                return opt.label.toLowerCase().includes(trimmed.toLowerCase());
            });

            if (hasSuggestions) {
                return [
                    {
                        value: trimmed,
                        label: `Add: "${trimmed}"`
                    },
                    {
                        type: "separator"
                    },
                    ...baseOptions
                ];
            }

            return [
                {
                    value: trimmed,
                    label: `Add: "${trimmed}"`
                }
            ];
        }

        return baseOptions;
    });

    function handleComboboxSelect(selectedValue: string) {
        if (!selectedValue) {
            return;
        }

        const match = availableKeywords.find((k) => {
            return k.uid === selectedValue || k.name?.toLowerCase() === selectedValue.toLowerCase();
        });

        if (match) {
            addKeywordToImages(match);
        } else {
            addKeywordsFromInput(selectedValue);
        }

        comboboxSelectedValue = "";
        isComboboxOpen = false;
        newKeywordInput = "";
        queueMicrotask(() => {
            newKeywordInput = "";
            if (comboboxInputEl) {
                comboboxInputEl.value = "";
                comboboxInputEl.focus();
            }
        });
    }

    function addKeywordToImages(kw: Keyword | KeywordUpdate) {
        const lowerName = kw.name?.toLowerCase();
        const exists = activeKeywords.some((k) => {
            return k.name?.toLowerCase() === lowerName;
        });

        if (exists) {
            return;
        }

        activeKeywords.push({
            name: kw.name,
            colour: kw.colour,
            parent: kw.parent
        });
        newKeywordInput = "";
    }

    async function handleCreateAndAddKeyword() {
        const trimmed = newKeywordInput.trim();
        if (!trimmed || isCreatingKeyword) {
            return;
        }

        isCreatingKeyword = true;
        try {
            const res = await createKeyword({ name: trimmed });
            if (res.status === 201) {
                availableKeywords.push(res.data);
                addKeywordToImages(res.data);

                newKeywordInput = "";
                isComboboxOpen = false;
                comboboxInputEl?.focus();
            }
        } catch (err) {
            const error = err as Error;
            console.error("Failed to create keyword:", error);
        } finally {
            isCreatingKeyword = false;
        }
    }

    function removeKeyword(kw: KeywordUpdate) {
        activeKeywords = activeKeywords.filter((k) => {
            return k.name?.toLowerCase() !== kw.name?.toLowerCase();
        });
    }

    function addKeywordsFromInput(inputStr: string) {
        const trimmed = inputStr.trim();
        if (!trimmed) {
            newKeywordInput = "";
            return;
        }

        const parts = trimmed
            .split(",")
            .map((k) => {
                return k.trim();
            })
            .filter((k) => {
                return k.length > 0;
            });

        if (parts.length === 0) {
            newKeywordInput = "";
            return;
        }

        const lowerExisting = new Set(
            activeKeywords.map((k) => {
                return k.name?.toLowerCase();
            })
        );
        const toAdd: KeywordUpdate[] = [];

        for (const part of parts) {
            const partLower = part.toLowerCase();
            if (lowerExisting.has(partLower)) {
                continue;
            }

            lowerExisting.add(partLower);

            const match = availableKeywords.find((k) => {
                return k.name?.toLowerCase() === partLower;
            });

            if (match) {
                toAdd.push({
                    name: match.name,
                    colour: match.colour,
                    parent: match.parent
                });
                continue;
            }

            toAdd.push({ name: part });
        }

        if (toAdd.length > 0) {
            activeKeywords.push(...toAdd);
        }

        newKeywordInput = "";
        comboboxInputEl?.focus();
    }

    function addKeywordFromCombobox() {
        const query = newKeywordInput.trim().toLowerCase();
        if (!query && !comboboxSelectedValue) {
            return;
        }

        if (comboboxSelectedValue) {
            const match = availableKeywords.find((k) => {
                return k.uid === comboboxSelectedValue;
            });
            if (match) {
                addKeywordToImages(match);
                newKeywordInput = "";
                comboboxSelectedValue = "";
                isComboboxOpen = false;
                comboboxInputEl?.focus();
                return;
            }
        }

        const exactMatch = availableKeywords.find((k) => {
            const activeNames = new Set(
                activeKeywords.map((ak) => {
                    return ak.name?.toLowerCase();
                })
            );
            return !activeNames.has(k.name?.toLowerCase()) && k.name?.toLowerCase() === query;
        });

        if (exactMatch) {
            addKeywordToImages(exactMatch);
            newKeywordInput = "";
            comboboxSelectedValue = "";
            isComboboxOpen = false;
            comboboxInputEl?.focus();
            return;
        }

        addKeywordsFromInput(newKeywordInput);
        isComboboxOpen = false;
        comboboxInputEl?.focus();
    }

    function handleEmptyQuerySubmit(e: KeyboardEvent) {
        e.preventDefault();
        e.stopPropagation();

        if (isSubmitting) {
            return;
        }

        if (currentMode === "add" && hasKeywordChanges) {
            isComboboxOpen = false;
            void handleSubmit();
            return;
        }

        if (currentMode !== "add" && name.trim()) {
            void handleSubmit();
            return;
        }
    }

    function handleInputKeydown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            if (hasKeywordChanges) {
                e.preventDefault();
                e.stopPropagation();
                submitButtonEl?.focus();
            }
            return;
        }

        if (e.key === ",") {
            e.preventDefault();
            e.stopPropagation();

            const trimmed = newKeywordInput.trim();
            if (trimmed) {
                addKeywordsFromInput(trimmed);
            }
            return;
        }

        if (e.key !== "Enter" || e.shiftKey) {
            return;
        }

        const query = newKeywordInput.trim().toLowerCase();
        if (!query) {
            handleEmptyQuerySubmit(e);
            return;
        }

        const hasOptions =
            isComboboxOpen &&
            comboboxOptions.some((opt) => {
                if (typeof opt === "string") {
                    return opt.toLowerCase().includes(query);
                }

                if ("value" in opt && opt.label) {
                    return opt.label.toLowerCase().includes(query);
                }

                return false;
            });

        if (hasOptions) {
            // Allow bits-ui onkeydown to process Enter and select the highlighted candidate
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        addKeywordFromCombobox();
    }

    async function handleSubmit(e?: SubmitEvent) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (currentMode === "add") {
            if (!hasKeywordChanges) {
                return;
            }

            isSubmitting = true;
            try {
                if (onAdd) {
                    await onAdd(activeKeywords);
                }
            } finally {
                isSubmitting = false;
            }
            return;
        }

        // Handle edit or create mode
        const trimmedName = name.trim();
        if (!trimmedName) {
            return;
        }

        isSubmitting = true;
        try {
            const trimmedColour = colour?.trim();
            const payload: KeywordUpdate = {
                name: trimmedName,
                colour: trimmedColour ? trimmedColour : undefined,
                parent: parent ? parent : undefined
            };

            if (modalAction) {
                await modalAction(payload);
            }
        } finally {
            isSubmitting = false;
        }
    }
</script>

<div id="viz-keyword-modal" class="mode-{currentMode}">
    <form id="keyword-form" autocomplete="off" onsubmit={handleSubmit}>
        {#if currentMode === "add"}
            <div class="search-row">
                <div class="combobox-field">
                    <InputCombobox
                        id="keyword-search-input"
                        label="Search"
                        placeholder="Type keyword and press Enter (or comma)..."
                        options={comboboxOptions}
                        autofocus
                        bind:value={comboboxSelectedValue}
                        bind:inputValue={newKeywordInput}
                        bind:open={isComboboxOpen}
                        bind:inputElement={comboboxInputEl}
                        onchange={handleComboboxSelect}
                        onkeydown={handleInputKeydown}
                    />
                </div>
                {#if isNewKeyword}
                    <Button
                        variant="primary"
                        iconName="add"
                        type="button"
                        class="create-keyword-btn"
                        title="Create keyword"
                        aria-label="Create keyword"
                        disabled={isCreatingKeyword}
                        onclick={handleCreateAndAddKeyword}
                    />
                {/if}
            </div>

            {#if activeKeywords.length > 0}
                <div class="form-field">
                    <span class="field-label">Keywords</span>
                    <div class="keywords-list">
                        {#each activeKeywords as keyword (keyword.name)}
                            <Badge size="large" class="keyword-badge">
                                <Button
                                    variant="ghost"
                                    size="mini"
                                    iconName="close"
                                    class="keyword-remove-btn"
                                    title="Remove Keyword"
                                    aria-label="Remove Keyword"
                                    onclick={(e) => {
                                        e.stopPropagation();
                                        removeKeyword(keyword);
                                    }}
                                />
                                <span class="keyword-text">{keyword.name}</span>
                                {#if keyword.colour}
                                    <span
                                        class="keyword-colour-dot"
                                        style="background-color: {keyword.colour ??
                                            'inherit'}; width: 0.5rem; height: 0.5rem; border: var(--viz-border-thin); border-radius: var(--viz-border-radius-pill); display: inline-block;"
                                    ></span>
                                {/if}
                            </Badge>
                        {/each}
                    </div>
                </div>
            {/if}
        {:else}
            <!-- Create / Edit Mode Form -->
            <InputText
                id="keyword-name"
                name="name"
                label="Name"
                placeholder="Keyword"
                type="text"
                autocomplete="off"
                autofocus
                bind:value={name}
                selectOnFocus={false}
                required
                spellcheck="false"
            />

            <div class="form-field colour-field">
                <span class="field-label">Colour</span>
                <div class="colour-row">
                    <!-- <input
                        id="keyword-colour-picker"
                        type="color"
                        value={colour}
                        onchange={(e) => {
                            colour = e.currentTarget.value;
                        }}
                        class="colour-picker"
                        aria-label="Select keyword colour"
                    /> -->
                    <ColourPicker id="keyword-colour-picker" bind:hex={colour} />
                    <InputText
                        id="keyword-colour-text"
                        name="colour"
                        placeholder="None"
                        autocomplete="off"
                        bind:value={colour}
                        spellcheck="false"
                        class="colour-text-input"
                    />
                    {#if colour}
                        <Button
                            variant="ghost"
                            size="small"
                            iconName="close"
                            type="button"
                            onclick={() => {
                                colour = "";
                            }}
                            title="Clear colour"
                            aria-label="Clear colour"
                        />
                    {/if}
                </div>
            </div>

            <div class="form-field">
                <InputCombobox id="keyword-parent" label="Parent Keyword" options={parentOptions} bind:value={parent} />
            </div>
        {/if}

        <div class="form-actions">
            <Button variant="danger" type="button" onclick={() => modalsManager.pop()}>
                <span>Cancel</span>
            </Button>
            <Button
                id="keyword-submit-btn"
                bind:element={submitButtonEl}
                variant="primary"
                type="submit"
                disabled={isSubmitting ||
                    (currentMode !== "add" && !name.trim()) ||
                    (currentMode === "add" && !hasKeywordChanges)}
            >
                <span>{submitButtonText}</span>
            </Button>
        </div>
    </form>
</div>

<style lang="scss">
    #viz-keyword-modal {
        display: flex;
        flex-direction: column;
        width: 100%;
        box-sizing: border-box;
    }

    #keyword-form {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-md);
        width: 100%;
    }

    .search-row {
        display: flex;
        align-items: flex-end;
        gap: var(--viz-spacing-xs);
        width: 100%;

        .combobox-field {
            flex: 1;
            min-width: 0;
        }

        :global(.create-keyword-btn) {
            flex-shrink: 0;
            margin-bottom: 1px;
        }
    }

    .form-field {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xs);
        width: 100%;
    }

    .field-label {
        font-weight: 500;
        color: var(--viz-text-secondary);
    }

    .empty-state-text {
        font-weight: bold;
    }

    .keywords-list {
        display: flex;
        flex-wrap: wrap;
        gap: var(--viz-spacing-sm);
        background: var(--viz-surface-panel);
        align-items: center;

        :global(.keyword-badge) {
            display: inline-flex;
            align-items: center;
            flex-shrink: 0;
        }

        :global(.keyword-remove-btn) {
            line-height: 1;
        }
    }

    .keyword-colour-dot {
        width: 0.5rem;
        height: 0.5rem;
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-pill);
        display: inline-block;
        flex-shrink: 0;
    }

    .colour-row {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-sm);
        width: 100%;
    }

    .colour-picker {
        width: 3rem;
        height: 3rem;
        padding: 0;
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-sm);
        cursor: pointer;
        background: transparent;

        &::-webkit-color-swatch-wrapper {
            padding: 2px;
        }

        &::-webkit-color-swatch {
            border: none;
            border-radius: var(--viz-border-radius-xs);
        }
    }

    :global(.colour-text-input) {
        flex: 1;
    }

    .form-actions {
        margin: var(--viz-spacing-sm) 0;
        display: flex;
        justify-content: flex-end;
        gap: var(--viz-spacing-sm);
        width: 100%;
    }
</style>
