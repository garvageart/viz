<script lang="ts">
    import { SvelteMap } from "svelte/reactivity";

    type Variants = "small" | "medium" | "large" | "xlarge";
    type BarColour = "primary" | "secondary" | "100" | "90" | "80" | "70" | "60" | "50" | "40" | "30" | "20" | "10";

    const variantMappings = new SvelteMap<Variants, number>([
        ["small", 3],
        ["medium", 6],
        ["large", 10],
        ["xlarge", 16]
    ]);

    interface Props {
        width: number;
        variant?: Variants;
        colour?: BarColour;
    }

    let { width = $bindable(), variant = "medium", colour = "primary" }: Props = $props();

    let height = $derived(variantMappings.get(variant) ?? 6);
</script>

<div class="progress-bar-track" class:has-border={height >= 6} style:height="{height}px">
    <div class="progress-fill" style="width: {width}%; background-color: var(--viz-{colour})"></div>
</div>

<style lang="scss">
    .progress-bar-track {
        width: 100%;
        background-color: var(--viz-surface-panel);
        overflow: hidden;
        box-sizing: border-box;

        &.has-border {
            border: var(--viz-border-thin);
            border-color: var(--viz-border-subtle);
        }
    }

    .progress-fill {
        height: 100%;
        border-radius: var(--viz-border-radius-sm);
        position: relative;
        overflow: hidden;
        transition: width 0.3s ease;
    }
</style>
