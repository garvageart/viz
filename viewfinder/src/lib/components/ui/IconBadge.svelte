<script lang="ts">
    import type { SvelteHTMLElements } from "svelte/elements";
    import type { MaterialSymbol } from "$lib/types/MaterialSymbol";
    import MaterialIcon, { type IconProps } from "./MaterialIcon.svelte";

    type Variant = "primary" | "info" | "warning" | "error" | "success" | "neutral";
    type BadgeShape = "rounded" | "circle" | "pill";

    interface Props extends IconProps {
        variant?: Variant;
        bgColor?: string;
        color?: string;
        shape?: BadgeShape;
        padding?: string;
    }

    let {
        iconName,
        variant = "primary",
        bgColor,
        color = "#ffffff",
        shape = "rounded",
        size = "1.25rem",
        padding = "var(--viz-spacing-sm)",
        class: className = "",
        ...props
    }: Props & SvelteHTMLElements["span"] = $props();

    const variantBgMap: Record<Variant, string> = {
        primary: "var(--viz-primary)",
        info: "var(--viz-info-color)",
        warning: "var(--viz-warning-color)",
        error: "var(--viz-error-color)",
        success: "var(--viz-success-color)",
        neutral: "var(--viz-surface-hover)"
    };

    let computedBg = $derived(bgColor || variantBgMap[variant]);
</script>

<div class="viz-icon-badge {shape} {className}" style:padding style:background-color={computedBg} style:color>
    <MaterialIcon {iconName} {size} {...props} />
</div>

<style lang="scss">
    .viz-icon-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-sizing: border-box;
        line-height: 1;
        border: none;

        &.rounded {
            border-radius: var(--viz-border-radius-md);
        }

        &.circle {
            border-radius: 50%;
        }

        &.pill {
            border-radius: var(--viz-border-radius-pill);
        }

        :global(.viz-material-icon),
        :global(svg),
        :global(path) {
            color: inherit !important;
            fill: currentColor;
        }
    }
</style>
