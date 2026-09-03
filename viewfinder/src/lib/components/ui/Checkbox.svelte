<script lang="ts">
    import type { SvelteHTMLElements } from "svelte/elements";
    import { generateRandomString } from "$lib/utils/misc";

    interface Props {
        checked: boolean;
        indeterminate?: boolean;
        label?: string;
        id?: string;
        disabled?: boolean;
        variant?: "square" | "round";
        size?: "small" | "regular" | "large";
        onchange?: (e: Event & { currentTarget: HTMLInputElement }) => void;
    }

    let {
        checked = $bindable(),
        indeterminate = false,
        label,
        id,
        disabled = false,
        variant = "square",
        size = "regular",
        class: classes,
        onchange,
        ...props
    }: Props & SvelteHTMLElements["div"] = $props();

    const uniqueId = $derived(id || `checkbox-${generateRandomString(6)}`);

    function handleKeydown(event: KeyboardEvent) {
        if (disabled) {
            return;
        }

        if (event.key === "Enter") {
            event.preventDefault();
            checked = !checked;

            const changeEvent = new Event("change", { bubbles: true });
            const input = document.getElementById(uniqueId) as HTMLInputElement;
            if (input) {
                input.dispatchEvent(changeEvent);
            }
        }
    }

    function handleChange(e: Event & { currentTarget: HTMLInputElement }) {
        checked = e.currentTarget.checked;
        if (onchange) {
            onchange(e);
        }
    }
</script>

<div
    class="checkbox-wrapper {classes}"
    {...props}
    class:disabled
    class:small={size === "small"}
    class:large={size === "large"}
    class:is-indeterminate={indeterminate && !checked}
>
    <input
        type="checkbox"
        id={uniqueId}
        {checked}
        {indeterminate}
        {disabled}
        onchange={handleChange}
        onkeydown={handleKeydown}
    />
    <label for={uniqueId}>
        <span
            class="viz-checkbox"
            class:small={size === "small"}
            class:large={size === "large"}
            class:round={variant === "round"}
            aria-hidden="true"
        >
            {#if indeterminate && !checked}
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3.5"
                    stroke-linecap="square"
                    stroke-linejoin="miter"
                >
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            {:else}
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3.5"
                    stroke-linecap="square"
                    stroke-linejoin="miter"
                >
                    <polyline points="4 12 9 17 20 6"></polyline>
                </svg>
            {/if}
        </span>
        {#if label}
            <span class="label-text">{label}</span>
        {/if}
    </label>
</div>

<style lang="scss">
    .checkbox-wrapper {
        display: inline-flex;
        align-items: center;
        user-select: none;

        &.disabled {
            opacity: 0.5;
            cursor: not-allowed;
            pointer-events: none;
        }

        /* Cohesive hover feedback */
        &:hover:not(.disabled) {
            .viz-checkbox {
                border-color: var(--viz-text-secondary);
                background-color: var(--viz-surface-panel);
            }

            .label-text {
                color: var(--viz-text-primary);
            }
        }
    }

    input[type="checkbox"] {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }

    .viz-checkbox {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1rem;
        height: 1rem;
        font-size: 1rem;
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-sm);
        background-color: var(--viz-surface-card);
        color: transparent;
        flex-shrink: 0;
        cursor: pointer;

        &.small {
            width: 0.75rem;
            height: 0.75rem;

            svg {
                width: 0.5rem;
                height: 0.5rem;
            }
        }

        &.large {
            width: 1.2rem;
            height: 1.2rem;
        }

        &.round {
            border-radius: var(--viz-border-radius-pill);
        }
    }

    /* Checkmark & Line SVG styling */
    svg {
        width: 0.7rem;
        height: 0.7rem;
        display: block;
    }

    /* Checked & Indeterminate states */
    input[type="checkbox"]:checked + label,
    .is-indeterminate input[type="checkbox"] + label {
        .viz-checkbox {
            background-color: var(--viz-primary);
            border-color: var(--viz-primary);
            color: #ffffff;
        }

        .label-text {
            color: var(--viz-text-primary);
        }
    }

    /* Checked & Indeterminate hover states */
    .checkbox-wrapper:hover:not(.disabled) {
        input[type="checkbox"]:checked + label,
        &.is-indeterminate input[type="checkbox"] + label {
            .viz-checkbox {
                background-color: var(--viz-primary-hover);
                border-color: var(--viz-primary-hover);
            }
        }
    }

    /* Keyboard Focus Ring (focus-visible) */
    input[type="checkbox"]:focus-visible + label {
        .viz-checkbox {
            box-shadow:
                0 0 0 2px var(--viz-surface-base),
                0 0 0 4px var(--viz-primary);
            border-color: var(--viz-primary);
        }
    }

    label {
        display: inline-flex;
        align-items: center;
        cursor: pointer;
        font-family: var(--viz-display-font);
        gap: var(--viz-spacing-sm);
        user-select: none;
    }

    .label-text {
        font-size: var(--viz-font-size-lg);
        color: var(--viz-text-secondary);
    }

    .checkbox-wrapper.small {
        label {
            gap: var(--viz-spacing-xs);
        }

        .label-text {
            font-size: 1rem;
            font-weight: 500;
            color: var(--viz-text-primary);
        }
    }

    .checkbox-wrapper.large .label-text {
        font-size: var(--viz-font-size-xl);
    }
</style>
