<script lang="ts">
    import { type Snippet } from "svelte";

    interface Props {
        x?: number;
        y?: number;
        children: Snippet;
        class?: string;
        style?: string;
        role?: "toolbar" | "dialog" | "region";
        ariaLabel?: string;
    }

    let {
        x = 0,
        y = 0,
        children,
        class: className = "",
        style = "",
        role = "toolbar",
        ariaLabel = "Floating panel"
    }: Props = $props();

    let computedStyle = $derived(`left: ${x}px; top: ${y}px; ${style}`.trim());
</script>

<div
    class="viz-floating-panel {className}"
    style={computedStyle}
    {role}
    aria-label={ariaLabel}
    onwheel={(e) => {
        e.stopPropagation();
    }}
    onpointerdown={(e) => {
        e.stopPropagation();
    }}
>
    {@render children?.()}
</div>

<style lang="scss">
    .viz-floating-panel {
        position: fixed;
        background-color: var(--viz-surface-card);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-lg);
        box-shadow: var(--viz-shadow-lg, 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3));
        padding: var(--viz-spacing-md);
        z-index: 250;
        pointer-events: auto;
        min-width: 20rem;
        box-sizing: border-box;
        font-family: var(--viz-display-font);
    }
</style>
