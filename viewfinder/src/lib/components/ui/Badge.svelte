<script lang="ts">
    import type { Snippet } from "svelte";
    import type { HTMLAttributes } from "svelte/elements";
    import type { MaterialSymbol } from "$lib/types/MaterialSymbol";
    import MaterialIcon from "./MaterialIcon.svelte";

    interface Props extends HTMLAttributes<HTMLDivElement> {
        variant?: "default" | "warning" | "error" | "info" | "success" | "neutral" | "outline";
        size?: "small" | "std" | "lg";
        pill?: boolean;
        iconName?: MaterialSymbol;
        iconFill?: boolean;
        iconSize?: string;
        children?: Snippet;
    }

    let {
        variant = "default",
        size = "std",
        pill = false,
        iconName,
        iconFill = false,
        iconSize = "0.85rem",
        children,
        class: className = "",
        ...props
    }: Props = $props();
</script>

<div class="viz-badge {variant} size-{size} {className}" class:is-pill={pill} {...props}>
    {#if iconName}
        <MaterialIcon {iconName} fill={iconFill} size={iconSize} />
    {/if}
    {@render children?.()}
</div>

<style lang="scss">
    @use "$lib/styles/scss/viz-mixins.scss" as m;

    .viz-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--viz-spacing-xs);
        padding: var(--viz-spacing-xxs) var(--viz-spacing-xs);
        border-radius: var(--viz-border-radius-sm);
        font-size: var(--viz-font-size-sm);
        font-family: var(--viz-mono-font);
        font-weight: 600;
        line-height: 1;
        width: max-content;
        box-sizing: border-box;
        border: 1px solid transparent;

        &.size-small {
            font-size: var(--viz-font-size-sm);
            padding: 0.15rem 0.35rem;
        }

        &.size-std {
            font-size: var(--viz-font-size-std);
            padding: 0.2rem 0.5rem;
        }

        &.size-lg {
            font-size: var(--viz-font-size-lg);
            padding: 0.3rem 0.65rem;
        }

        &.is-pill {
            border-radius: var(--viz-border-radius-pill);
            padding: 0.35rem 0.75rem;
        }

        &.default {
            background-color: var(--viz-surface-hover);
            color: var(--viz-text-primary);
            border-color: var(--viz-border-strong);
        }

        &.neutral {
            background-color: var(--viz-surface-panel);
            color: var(--viz-text-secondary);
            border-color: var(--viz-border-subtle);
        }

        &.warning {
            @include m.status-tint("warning");
        }

        &.error {
            @include m.status-tint("error");
        }

        &.info {
            @include m.status-tint("info");
        }

        &.success {
            @include m.status-tint("success");
        }

        &.outline {
            background-color: transparent;
            border-color: var(--viz-border-subtle);
            color: var(--viz-text-primary);
        }
    }
</style>
