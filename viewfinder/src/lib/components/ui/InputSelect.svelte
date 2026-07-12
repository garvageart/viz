<script lang="ts">
    import { ContextKeys } from "$lib/context-keys";
    import { generateKeyId } from "$lib/utils/layout";
    import { Select } from "bits-ui";
    import { getContext } from "svelte";
    import type { SvelteHTMLElements } from "svelte/elements";
    import MaterialIcon from "./MaterialIcon.svelte";

    interface Props {
        label?: string;
        labelPosition?: "top" | "side";
        description?: string;
        value?: string | number | boolean;
        options: Array<
            | string
            | {
                  value: string;
                  label: string;
                  type?: "item" | "separator" | "label";
              }
        >;
        disabled?: boolean;
        required?: boolean;
        name?: string;
        id?: string;
        class?: string;
        style?: string; // UI style prop
        contentAlign?: "start" | "center" | "end";
        onchange?: (val: string) => void;
    }

    let {
        label,
        labelPosition = "top",
        description,
        value = $bindable(),
        options,
        disabled = false,
        required = false,
        name,
        class: className,
        style,
        contentAlign = "start",
        onchange,
        ...props
    }: Props & Omit<SvelteHTMLElements["button"], "onchange" | "value"> = $props();

    const fallbackId = generateKeyId();
    const selectId = $derived(props.id ?? fallbackId);

    const stringValue = $derived(String(value ?? ""));

    // Propagate changes from stringValue back to value
    function handleValueChange(v: string) {
        value = v;
        if (onchange) {
            onchange(v);
        }
    }

    const normalizedOptions = $derived(
        options.map((opt) => {
            if (typeof opt === "string") {
                return { value: opt, label: opt, type: "item" as const };
            }
            return { type: "item" as const, ...opt };
        })
    );

    const selectedLabel = $derived(normalizedOptions.find((opt) => opt.value === stringValue)?.label ?? "");

    const getModalZIndex = getContext<(() => number) | undefined>(ContextKeys.ModalZIndex);
    const modalZIndex = $derived(getModalZIndex?.());
</script>

<Select.Root type="single" value={stringValue} onValueChange={handleValueChange} {disabled} {name}>
    <div class="input-container" class:disabled class:side-label={labelPosition === "side"}>
        {#if label}
            <label for={selectId} class="input-label">
                {label}
                {#if required}
                    <span class="required-asterisk">*</span>
                {/if}
            </label>
        {/if}
        <div class="input-wrapper">
            <Select.Trigger id={selectId} class="select-trigger {className || ''}" {style} {...props}>
                <span class="select-value">{selectedLabel || "Select an option..."}</span>
            </Select.Trigger>
            <Select.Portal>
                <Select.Content
                    class="select-content"
                    sideOffset={4}
                    align={contentAlign}
                    style={modalZIndex ? `z-index: ${modalZIndex + 10};` : undefined}
                >
                    <Select.Viewport class="select-viewport">
                        {#each normalizedOptions as item}
                            {#if item.type === "separator" || item.value === "---"}
                                <div class="select-separator" role="separator"></div>
                            {:else if item.type === "label"}
                                <div class="select-group-label" role="presentation">{item.label}</div>
                            {:else}
                                <Select.Item class="select-item" value={item.value} label={item.label}>
                                    {#snippet children({ selected })}
                                        <span class="item-label">{item.label}</span>
                                        {#if selected}
                                            <span class="item-indicator">
                                                <MaterialIcon
                                                    iconName="check"
                                                    style="font-size: 1rem; color: var(--viz-primary);"
                                                />
                                            </span>
                                        {/if}
                                    {/snippet}
                                </Select.Item>
                            {/if}
                        {/each}
                    </Select.Viewport>
                </Select.Content>
            </Select.Portal>
        </div>
        {#if description}
            <div class="input-description">{description}</div>
        {/if}
    </div>
</Select.Root>

<style lang="scss">
    .input-container {
        display: flex;
        flex-direction: column;
        min-width: 0%;
        position: relative;
        width: 100%;
        gap: var(--viz-spacing-sm);

        &.side-label {
            flex-direction: row;
            align-items: center;

            .input-label {
                margin-right: var(--viz-spacing-sm);
                margin-bottom: 0;
                white-space: nowrap;
            }
        }

        &.disabled {
            opacity: 0.5;

            :global(.select-trigger) {
                cursor: not-allowed;
            }
        }
    }

    .input-label {
        font-size: var(--viz-font-size-lg);
        font-weight: 500;
        color: var(--viz-40);
    }

    .required-asterisk {
        color: var(--viz-error-color);
        margin-left: var(--viz-spacing-xxs);
    }

    .input-description {
        font-size: var(--viz-font-size-std);
        color: var(--viz-60);
        padding-left: var(--viz-spacing-sm);
    }

    .input-wrapper {
        position: relative;
        width: 100%;

        :global(.select-trigger) {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            max-width: 100%;
            min-height: 2rem; // Standard density height
            color: var(--viz-text-color);
            background-color: var(--viz-100);
            outline: none;
            border: none;
            box-shadow: 0 -1px 0 var(--viz-60) inset;
            font-family: var(--viz-display-font);
            font-size: var(--viz-font-size-std);
            padding: var(--viz-spacing-sm) 2rem var(--viz-spacing-sm) var(--viz-spacing-std);
            cursor: pointer;
            text-align: left;
            position: relative;

            // Scalable high-contrast neutral chevron SVG arrow (light/dark adaptive)
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23888888' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right var(--viz-spacing-xs) center;
            background-size: var(--viz-font-size-std);

            &:hover:not(:disabled) {
                box-shadow: 0 -1px 0 var(--viz-40) inset;
            }

            &:focus {
                background-color: var(--viz-100);
                box-shadow: 0 -2px 0 var(--viz-primary) inset;
            }

            &:focus-visible {
                outline: 2px solid var(--viz-primary);
                outline-offset: 1px;
            }

            :global(.select-value) {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                min-width: 0;
            }
        }
    }

    :global(.select-content) {
        background-color: var(--viz-95);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        padding: var(--viz-spacing-xs);
        min-width: 12.5rem;
        z-index: 99999;
        box-sizing: border-box;
    }

    :global(.select-viewport) {
        max-height: 15rem; // Scroll boundary
        overflow-y: auto;
        // width: 100%;
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
        font-size: 1rem;
        color: var(--viz-text-color);
        border-radius: var(--viz-border-radius-sm);
        cursor: pointer;
        outline: none;
        user-select: none;
        position: relative;
        transition: background-color 80ms ease;
    }

    :global(.select-item:hover),
    :global(.select-item[data-highlighted]) {
        background-color: var(--viz-80);
    }

    :global(.select-item[data-selected]) {
        background-color: var(--viz-80);
        font-weight: 500;
    }

    :global(.item-indicator) {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-left: var(--viz-spacing-sm);
    }

    :global(.select-separator) {
        border-top: 1px solid var(--viz-80);
        background-color: var(--viz-60);
        margin: var(--viz-spacing-xxs) 0;
    }

    :global(.select-group-label) {
        font-size: var(--viz-font-size-std);
        font-weight: 700;
        color: var(--viz-40);
        padding: var(--viz-spacing-xs) var(--viz-spacing-sm);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
</style>
