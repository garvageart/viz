<script lang="ts">
    import { generateRandomString } from "$lib/utils/misc";
    import type { SvelteHTMLElements } from "svelte/elements";

    interface Props {
        checked: boolean;
        label?: string;
        id?: string;
        disabled?: boolean;
        onchange?: (e: Event & { currentTarget: HTMLInputElement }) => void;
    }

    let {
        checked = $bindable(),
        label,
        id,
        disabled = false,
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
</script>

<div class="checkbox-wrapper" class:disabled {...props}>
    <input
        type="checkbox"
        id={uniqueId}
        bind:checked
        {disabled}
        {onchange}
        onkeydown={handleKeydown}
    />
    <label for={uniqueId}>
        <span class="viz-checkbox" aria-hidden="true">
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3.5"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <polyline points="4 12 9 17 20 6"></polyline>
            </svg>
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
                border-color: var(--viz-40);
                background-color: var(--viz-90);
            }

            .label-text {
                color: var(--viz-text-color);
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
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-sm);
        background-color: var(--viz-95);
        color: transparent;
        transition: 
            background-color 0.12s ease, 
            border-color 0.12s ease, 
            box-shadow 0.12s ease;
        flex-shrink: 0;
        cursor: pointer;
    }

    /* Checkmark SVG styling & self-drawing polyline */
    svg {
        width: 0.7rem;
        height: 0.7rem;
        display: block;

        polyline {
            stroke-dasharray: 24;
            stroke-dashoffset: 24;
            transition: stroke-dashoffset 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        }
    }

    /* Checked state */
    input[type="checkbox"]:checked + label {
        .viz-checkbox {
            background-color: var(--viz-primary);
            border-color: var(--viz-primary);
            color: #ffffff;
            /* Inset highlight shadow for premium 3D feel */
            box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.2), 0 1px 2px rgba(0, 0, 0, 0.1);

            polyline {
                stroke-dashoffset: 0;
            }
        }

        .label-text {
            color: var(--viz-text-color);
        }
    }

    /* Keyboard Focus Ring (focus-visible) */
    input[type="checkbox"]:focus-visible + label {
        .viz-checkbox {
            box-shadow: 0 0 0 2px var(--viz-bg-color), 0 0 0 4px var(--viz-primary);
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
        font-size: var(--viz-font-size-sm);
        font-weight: 500;
        color: var(--viz-40);
        transition: color 0.12s ease;
    }
</style>
