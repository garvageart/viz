<script module lang="ts">
    export interface RadioGroupOption {
        value: string;
        label: string;
        description?: string;
        disabled?: boolean;
    }
</script>

<script lang="ts">
    import { generateRandomString } from "#lib/utils/misc.js";

    type Variant = "list" | "card";

    interface Props {
        options: RadioGroupOption[];
        value?: string;
        name?: string;
        label?: string;
        variant?: Variant;
        disabled?: boolean;
        class?: string;
        onchange?: (value: string) => void;
    }

    let {
        options,
        value = $bindable(),
        name,
        label,
        variant = "list",
        disabled = false,
        class: className = "",
        onchange
    }: Props = $props();

    const instanceId = generateRandomString(6);
    const groupName = $derived(name ?? `radio-group-${instanceId}`);
    const labelId = `radio-group-label-${instanceId}`;

    function select(option: RadioGroupOption) {
        if (option.disabled || disabled) {
            return;
        }

        value = option.value;
        if (onchange) {
            onchange(option.value);
        }
    }
</script>

<div class="radio-group-container {className}">
    {#if label}
        <span class="radio-group-label" id={labelId}>{label}</span>
    {/if}

    <div class="radio-group variant-{variant}" role="radiogroup" aria-labelledby={label ? labelId : undefined}>
        {#each options as option (option.value)}
            <label
                class="radio-option"
                class:selected={value === option.value}
                class:disabled={disabled || option.disabled}
            >
                <input
                    type="radio"
                    name={groupName}
                    value={option.value}
                    checked={value === option.value}
                    disabled={disabled || option.disabled}
                    onchange={() => select(option)}
                />
                <span class="radio-mark" aria-hidden="true"></span>
                <span class="option-body">
                    <span class="option-title">
                        {option.label}
                    </span>
                    {#if option.description}
                        <span class="option-description">{option.description}</span>
                    {/if}
                </span>
            </label>
        {/each}
    </div>
</div>

<style lang="scss">
    .radio-group-container {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-sm);
    }

    .radio-group-label {
        font-size: var(--viz-font-size-lg);
        font-weight: 600;
        color: var(--viz-text-primary);
    }

    .radio-group {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-sm);
    }

    .radio-option {
        position: relative;
        display: grid;
        grid-template-columns: auto 1fr;
        column-gap: var(--viz-spacing-sm);
        row-gap: var(--viz-spacing-xxs);
        align-items: start;
        cursor: pointer;

        input {
            position: absolute;
            width: 1px;
            height: 1px;
            opacity: 0;
            pointer-events: none;
        }

        &:has(input:focus-visible) {
            border-radius: var(--viz-border-radius-md);
            box-shadow:
                0 0 0 2px var(--viz-surface-base),
                0 0 0 4px var(--viz-primary);
        }

        &.disabled {
            opacity: 0.5;
            cursor: not-allowed;
            pointer-events: none;
        }
    }

    .radio-mark {
        position: relative;
        width: 1rem;
        height: 1rem;
        align-self: center;
        border: 1px solid var(--viz-border-strong);
        border-radius: 50%;
        background-color: var(--viz-surface-card);
        flex-shrink: 0;
    }

    .radio-option.selected .radio-mark {
        border-color: var(--viz-primary);

        &::after {
            content: "";
            position: absolute;
            inset: var(--viz-spacing-xxs);
            border-radius: 50%;
            background-color: var(--viz-primary);
        }
    }

    .option-body {
        display: contents;
    }

    .option-title {
        grid-column: 2;
        grid-row: 1;
        font-weight: 600;
        color: var(--viz-text-primary);
    }

    .option-description {
        grid-column: 2;
        grid-row: 2;
        font-size: var(--viz-font-size-std);
        line-height: 1.45;
        color: var(--viz-text-secondary);
    }

    .variant-card .radio-option {
        padding: var(--viz-spacing-sm);
        border: 1px solid var(--viz-border-subtle);
        border-radius: var(--viz-border-radius-md);
        background-color: var(--viz-surface-panel);
        transition:
            border-color 0.15s ease,
            background-color 0.15s ease;

        &:hover:not(.disabled) {
            border-color: var(--viz-border-strong);
        }

        &.selected {
            border-color: var(--viz-primary);
            background-color: color-mix(in srgb, var(--viz-primary) 10%, var(--viz-surface-panel));
        }
    }
</style>
