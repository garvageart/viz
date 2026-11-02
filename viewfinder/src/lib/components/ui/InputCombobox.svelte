<script module lang="ts">
    export type OptionItem = { value: string; label: string; type?: "item" };
    export type OptionsSeparator = { type: "separator" | "label"; label?: string };
    export type NormalizedOption = OptionItem | OptionsSeparator;
    export type InputOption =
        | string
        | {
              value: string;
              label: string;
              type?: "item" | "separator" | "label";
          }
        | OptionsSeparator;
</script>

<script lang="ts">
    import { ContextKeys } from "#lib/context-keys.js";
    import { generateRandomString } from "#lib/utils/misc.ts";
    import { Combobox } from "bits-ui";
    import { getContext } from "svelte";
    import MaterialIcon from "./MaterialIcon.svelte";

    interface Props {
        label?: string;
        labelPosition?: "top" | "side";
        description?: string;
        placeholder?: string;
        value?: string;
        inputValue?: string;
        open?: boolean;
        options: Array<InputOption>;
        disabled?: boolean;
        required?: boolean;
        autofocus?: boolean;
        name?: string;
        id?: string;
        class?: string;
        contentAlign?: "start" | "center" | "end";
        onchange?: (val: string) => void;
        onkeydown?: (e: KeyboardEvent) => void;
    }

    let {
        label,
        labelPosition = "top",
        description,
        placeholder = "Search...",
        value = $bindable(""),
        inputValue = $bindable(""),
        open = $bindable(false),
        options,
        disabled = false,
        required = false,
        autofocus = false,
        name,
        id,
        class: className = "",
        contentAlign = "start",
        onchange,
        onkeydown
    }: Props = $props();

    const comboboxId = $derived(id ?? generateRandomString(6));

    const getModalZIndex = getContext<(() => number) | undefined>(ContextKeys.ModalZIndex);
    const modalZIndex = $derived(getModalZIndex?.());

    function isItemOption(opt: NormalizedOption): opt is OptionItem {
        return opt.type === "item";
    }

    function isInputItemOption(
        opt: InputOption
    ): opt is { value: string; label: string; type?: "item" | "separator" | "label" } {
        return typeof opt === "object" && opt !== null && "value" in opt;
    }

    const normalizedOptions = $derived<NormalizedOption[]>(
        options.map((opt): NormalizedOption => {
            if (typeof opt === "string") {
                return { value: opt, label: opt, type: "item" };
            }

            if (isInputItemOption(opt)) {
                return {
                    type: opt.type === "separator" || opt.type === "label" ? opt.type : "item",
                    value: opt.value,
                    label: opt.label
                };
            }

            return { type: opt.type, label: opt.label };
        })
    );

    const filteredOptions = $derived.by(() => {
        const query = inputValue.trim().toLowerCase();
        if (!query) {
            return normalizedOptions;
        }

        return normalizedOptions.filter((opt) => {
            if (isItemOption(opt)) {
                return opt.label.toLowerCase().includes(query) || opt.value.toLowerCase().includes(query);
            }

            return true;
        });
    });

    function handleValueChange(v: string) {
        value = v;
        if (onchange) {
            onchange(v);
        }
    }
</script>

<Combobox.Root type="single" bind:open bind:value {inputValue} onValueChange={handleValueChange} {disabled} {name}>
    <div class="input-container" class:disabled class:side-label={labelPosition === "side"}>
        {#if label}
            <label for={comboboxId} class="input-label">
                {label}
                {#if required}
                    <span class="required-asterisk">*</span>
                {/if}
            </label>
        {/if}

        <div class="input-wrapper">
            <Combobox.Input
                id={comboboxId}
                class="combobox-input {className}"
                {placeholder}
                {autofocus}
                onfocus={() => {
                    open = true;
                }}
                oninput={(e) => {
                    inputValue = e.currentTarget.value;
                    open = true;
                }}
                onkeydown={(e) => {
                    if (e.key === "Escape" && open) {
                        e.preventDefault();
                        e.stopPropagation();
                        open = false;
                        (e.currentTarget as HTMLElement)?.blur();
                        onkeydown?.(e);
                        return;
                    }

                    onkeydown?.(e);
                }}
                spellcheck="false"
            />

            {#if filteredOptions.length > 0}
                <Combobox.Portal>
                    <Combobox.Content
                        class="select-content"
                        sideOffset={4}
                        align={contentAlign}
                        style={modalZIndex ? `z-index: ${modalZIndex + 10};` : undefined}
                    >
                        <Combobox.Viewport class="select-viewport">
                            {#each filteredOptions as item}
                                {#if item.type === "separator"}
                                    <div class="select-separator" role="separator"></div>
                                {:else if item.type === "label"}
                                    <div class="select-group-label" role="presentation">{item.label}</div>
                                {:else if isItemOption(item)}
                                    <Combobox.Item class="select-item" value={item.value} label={item.label}>
                                        {#snippet children({ selected })}
                                            <span class="item-label">{item.label}</span>
                                            {#if selected}
                                                <span class="item-indicator">
                                                    <MaterialIcon iconName="check" style="color: var(--viz-primary);" />
                                                </span>
                                            {/if}
                                        {/snippet}
                                    </Combobox.Item>
                                {/if}
                            {/each}
                        </Combobox.Viewport>
                    </Combobox.Content>
                </Combobox.Portal>
            {/if}
        </div>

        {#if description}
            <div class="input-description">{description}</div>
        {/if}
    </div>
</Combobox.Root>

<style lang="scss">
    .input-container {
        display: flex;
        flex-direction: column;
        min-width: 0%;
        position: relative;
        width: 100%;
        gap: var(--viz-spacing-xs);

        &.disabled {
            opacity: 0.5;

            :global(.combobox-input) {
                cursor: not-allowed;
            }
        }

        &.side-label {
            flex-direction: row;
            align-items: center;

            .input-label {
                width: 30%;
                margin-bottom: 0;
            }

            .input-wrapper {
                flex: 1;
            }
        }
    }

    .input-label {
        font-weight: 500;
        color: var(--viz-text-secondary);

        .required-asterisk {
            color: var(--viz-error-color);
            margin-left: var(--viz-spacing-xxs);
        }
    }

    .input-description {
        color: var(--viz-text-muted);
        padding-left: var(--viz-spacing-xs);
    }

    .input-wrapper {
        position: relative;
        width: 100%;

        :global(.combobox-input) {
            box-sizing: border-box;
            width: 100%;
            max-width: 100%;
            min-height: 2rem;
            color: var(--viz-text-primary);
            background-color: var(--viz-surface-panel);
            outline: none;
            border: none;
            box-shadow: 0 -1px 0 var(--viz-border-subtle) inset;
            font-family: var(--viz-display-font);
            font-size: var(--viz-font-size-std);
            padding: var(--viz-spacing-sm) var(--viz-spacing-std);
            text-align: left;
            transition:
                background-color 0.15s ease,
                box-shadow 0.15s ease;

            &:hover:not(:disabled) {
                box-shadow: 0 -1px 0 var(--viz-text-secondary) inset;
            }

            &:focus {
                background-color: var(--viz-surface-panel);
                box-shadow: 0 -2px 0 var(--viz-primary) inset;
            }
        }
    }

    :global(.select-content) {
        background-color: var(--viz-surface-popover);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        padding: var(--viz-spacing-xs);
        min-width: 12.5rem;
        z-index: 99999;
        box-sizing: border-box;
    }

    :global(.select-viewport) {
        max-height: 15rem;
        overflow-y: auto;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xxs);
        outline: none;
    }

    :global(.select-item) {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--viz-spacing-xs) var(--viz-spacing-sm);
        font-family: var(--viz-display-font);
        color: var(--viz-text-primary);
        border-radius: var(--viz-border-radius-sm);
        cursor: pointer;
        outline: none;
        user-select: none;
        position: relative;
        transition: background-color 80ms ease;
    }

    :global(.select-item:hover),
    :global(.select-item[data-highlighted]) {
        background-color: var(--viz-surface-hover);
    }

    :global(.select-item[data-selected]) {
        background-color: var(--viz-surface-hover);
        font-weight: 500;
    }

    :global(.select-separator) {
        height: 1px;
        background-color: var(--viz-border-subtle);
        margin: var(--viz-spacing-xxs) 0;
    }

    :global(.select-group-label) {
        padding: var(--viz-spacing-xs) var(--viz-spacing-sm);
        font-size: var(--viz-font-size-sm);
        font-weight: 600;
        color: var(--viz-text-secondary);
    }

    :global(.item-indicator) {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-left: var(--viz-spacing-xs);
    }
</style>
