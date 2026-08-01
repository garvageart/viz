<!--
@component
Toggle switch built on bits-ui's Switch.
Docs: https://www.bits-ui.com/docs/components/switch
-->
<script lang="ts">
    import { Switch } from "bits-ui";
    import type { SvelteHTMLElements } from "svelte/elements";
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

    let checked = $derived(value === "on");

    function handleCheckedChange(next: boolean) {
        value = next ? "on" : "off";
    }
</script>

<div {...props} class="toggle-slider {labelPos === 'side' ? 'side' : 'top'}" class:disabled>
    <label for={switchId} id={`${switchId}-label`}>{label}</label>
    <Switch.Root
        id={switchId}
        {checked}
        onCheckedChange={handleCheckedChange}
        {disabled}
        aria-labelledby={`${switchId}-label`}
        class="switch-track"
    >
        <Switch.Thumb class="switch-thumb" />
    </Switch.Root>
</div>

<style lang="scss">
    .toggle-slider {
        display: flex;
        align-items: center;

        &.side {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;

            :global(.switch-track) {
                margin-left: 0.5em;
            }
        }

        &.top {
            flex-direction: column;
            align-items: flex-start;
            justify-content: space-between;
            height: 3.4em;
        }

        label {
            cursor: pointer;
            color: var(--viz-text-secondary);
            font-size: var(--viz-font-size-lg);
            user-select: none;
        }
    }

    :global(.switch-track) {
        position: relative;
        display: flex;
        align-items: center;
        flex-shrink: 0;
        width: 3.6em;
        height: 2em;
        padding: 0.2em;
        box-sizing: border-box;
        border: none;
        border-radius: var(--viz-border-radius-pill);
        background-color: var(--viz-surface-input);
        box-shadow: inset 0 0 0 1px var(--viz-border-strong);
        cursor: pointer;
        transition:
            background-color 0.18s ease,
            box-shadow 0.18s ease;
    }

    :global(.switch-track[data-state="checked"]) {
        background-color: var(--viz-primary);
        box-shadow: inset 0 0 0 1px var(--viz-primary);
    }

    :global(.switch-track:focus-visible) {
        outline: 2px solid var(--viz-primary);
        outline-offset: 2px;
    }

    :global(.switch-thumb) {
        flex-shrink: 0;
        width: 1.6em;
        height: 1.6em;
        box-sizing: border-box;
        border-radius: 50%;
        background-color: #ffffff;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.28);
        transition: transform 0.18s ease;
    }

    :global(.switch-thumb[data-state="checked"]) {
        transform: translateX(1.6em);
    }

    .toggle-slider.disabled {
        opacity: 0.5;
        cursor: not-allowed;

        :global(.switch-track) {
            cursor: not-allowed;
        }
    }
</style>
