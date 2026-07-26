<script lang="ts">
    import { SvelteMap } from "svelte/reactivity";

    type Variants = "small" | "medium" | "large" | "xlarge";

    const variantMappings = new SvelteMap<Variants, number>([
        ["small", 3],
        ["medium", 6],
        ["large", 10],
        ["xlarge", 16]
    ]);

    interface Props {
        width: number;
        label?: string;
        valueLabel?: string;
        variant?: Variants;
        colour?: string;
        trackColour?: string;
    }

    let {
        width = $bindable(),
        label,
        valueLabel,
        variant = "medium",
        colour = "var(--viz-secondary)",
        trackColour = "var(--viz-primary)"
    }: Props = $props();

    let height = $derived(variantMappings.get(variant) ?? 6);
</script>

<div class="progress-bar-container">
    {#if label || valueLabel}
        <div class="labels">
            <span class="title-label">{label}</span>
            <span class="val-label">{valueLabel}</span>
        </div>
    {/if}
    <div
        class="progress-bar-track"
        style="background-color: {trackColour}"
        class:has-border={height >= 6}
        style:height="{height}px"
    >
        <div class="progress-fill" style="width: {width}%; background-color: {colour};"></div>
    </div>
</div>

<style lang="scss">
    .progress-bar-container {
        width: 100%;
        display: flex;
        flex-direction: column;

        .labels {
            font-size: var(--viz-font-size-lg);
            margin-bottom: var(--viz-spacing-xs);
            display: flex;
            justify-content: space-between;

            .title-label {
                font-weight: bold;
            }
        }
    }

    .progress-bar-track {
        width: 100%;
        overflow: hidden;
        box-sizing: border-box;

        &.has-border {
            border: var(--viz-border-thin);
            border-color: var(--viz-border-subtle);
        }
    }

    .progress-fill {
        height: 100%;
        position: relative;
        overflow: hidden;
        transition: width 0.3s ease;
    }
</style>
