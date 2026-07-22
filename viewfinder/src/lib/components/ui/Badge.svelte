<script lang="ts">
    import type { MaterialSymbol } from "$lib/types/MaterialSymbol";
    import MaterialIcon from "./MaterialIcon.svelte";
    import type { Snippet } from "svelte";
    import type { HTMLAttributes } from "svelte/elements";

    interface Props extends HTMLAttributes<HTMLDivElement> {
        variant?: "default" | "warning" | "error" | "info" | "success" | "neutral" | "outline";
        pill?: boolean;
        iconName?: MaterialSymbol;
        iconFill?: boolean;
        iconSize?: string;
        children?: Snippet;
    }

    let {
        variant = "default",
        pill = false,
        iconName,
        iconFill = false,
        iconSize = "0.85rem",
        children,
        class: className = "",
        ...props
    }: Props = $props();
</script>

<div class="viz-badge {variant} {className}" class:is-pill={pill} {...props}>
    {#if iconName}
        <MaterialIcon {iconName} fill={iconFill} size={iconSize} />
    {/if}
    {@render children?.()}
</div>

<style lang="scss">
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

        &.is-pill {
            border-radius: var(--viz-border-radius-pill);
            padding: 0.35rem 0.75rem;
            font-size: var(--viz-font-size-std);
        }

        &.default {
            background-color: var(--viz-80);
            color: var(--viz-text-color);
            border-color: var(--viz-70);
        }

        &.neutral {
            background-color: var(--viz-90);
            color: var(--viz-40);
            border-color: var(--viz-80);
        }

        &.warning {
            background-color: color-mix(in srgb, var(--viz-warning-color) 15%, var(--viz-95));
            border-color: color-mix(in srgb, var(--viz-warning-color) 35%, var(--viz-80));
            color: var(--viz-warning-color);
        }

        &.error {
            background-color: color-mix(in srgb, var(--viz-error-color) 15%, var(--viz-95));
            border-color: color-mix(in srgb, var(--viz-error-color) 35%, var(--viz-80));
            color: var(--viz-error-color);
        }

        &.info {
            background-color: color-mix(in srgb, var(--viz-primary) 15%, var(--viz-95));
            border-color: color-mix(in srgb, var(--viz-primary) 35%, var(--viz-80));
            color: var(--viz-primary);
        }

        &.success {
            background-color: color-mix(in srgb, var(--viz-success-color, #10b981) 15%, var(--viz-95));
            border-color: color-mix(in srgb, var(--viz-success-color, #10b981) 35%, var(--viz-80));
            color: var(--viz-success-color, #10b981);
        }

        &.outline {
            background-color: transparent;
            border-color: var(--viz-70);
            color: var(--viz-text-color);
        }
    }
</style>
