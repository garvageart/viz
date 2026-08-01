<!-- Modified from here: https://svelte.dev/playground/d65a4e9f0ae74d1eb1b08d13e428af32?version=5.36.8 -->
<script lang="ts">
    import type { MouseEventHandler, SvelteHTMLElements } from "svelte/elements";
    import { generateRandomString } from "$lib/utils/misc";

    interface Props {
        label: string;
        value: "on" | "off";
        labelPos?: "side" | "top";
        id?: string;
        disabled?: boolean;
    }

    let {
        label,
        value = $bindable(),
        labelPos = "side",
        id,
        disabled = false,
        ...props
    }: Props & SvelteHTMLElements["div"] = $props();

    const uniqueID = generateRandomString(6);
    const switchId = $derived(id || `switch-${uniqueID}`);

    const handleClick: MouseEventHandler<HTMLButtonElement> = (e) => {
        e.preventDefault();
        value = value === "on" ? "off" : "on";
    };
</script>

<div {...props} class="toggle-slider {labelPos === 'side' ? 'side' : 'top'}" class:disabled>
    <label for={switchId} id={`${switchId}-label`}>{label}</label>
    <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={value === "on"}
        data-checked={value === "on"}
        aria-labelledby={`${switchId}-label`}
        {disabled}
        onclick={handleClick}
    >
    </button>
</div>

<style lang="scss">
    .toggle-slider {
        display: flex;
        align-items: center;

        &.side {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;

            button {
                margin-left: 0.5em;
            }
        }

        &.top {
            flex-direction: column;
            align-items: flex-start;
            justify-content: space-between;
            height: 3.2em;
        }
    }

    .toggle-slider button {
        width: 3em;
        height: 1.5em;
        padding: 0;
        position: relative;
        box-sizing: border-box;
        border: 1px solid var(--viz-primary);
        border-radius: var(--viz-border-radius-pill);
        background-color: var(--viz-surface-input);
        cursor: pointer;
        transition:
            background-color 0.2s ease,
            border-color 0.2s ease;
    }

    .toggle-slider button::before {
        content: "";
        position: absolute;
        top: 0.05em;
        left: 0.1em;
        width: 1.2em;
        height: 1.2em;
        box-sizing: border-box;
        border-radius: 50%;
        background-color: var(--viz-bg-color);
        border: 1px solid var(--viz-border-strong);
        transition: transform 0.2s ease;
    }

    .toggle-slider button[aria-checked="true"] {
        background-color: var(--viz-primary);
        border-color: var(--viz-primary);
    }

    .toggle-slider button[aria-checked="true"]::before {
        transform: translateX(1.4em);
    }

    .toggle-slider.disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .toggle-slider.disabled button {
        cursor: not-allowed;
    }

    .toggle-slider button:focus-visible {
        outline: 2px solid var(--viz-primary);
        outline-offset: 2px;
    }
</style>
