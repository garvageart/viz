<script module lang="ts">
    export type ButtonVariant = "primary" | "secondary" | "danger" | "warning" | "success" | "info" | "ghost";
    export type ButtonSize = "big" | "small" | "mini";
</script>

<script lang="ts">
    import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";
    import { type TooltipParams, tooltip } from "$lib/components/tooltips/tooltip";
    import type { MaterialSymbol } from "$lib/types/MaterialSymbol";
    import MaterialIcon from "./MaterialIcon.svelte";

    interface Props {
        hoverColor?: string;
        variant?: ButtonVariant;
        size?: ButtonSize;
        href?: string;
        tooltipParams?: TooltipParams | string | null;
        element?: HTMLButtonElement | HTMLAnchorElement;
        iconName?: MaterialSymbol;
        iconStyle?: "sharp" | "outlined" | "rounded" | "filled";
        iconSize?: string;
        fill?: boolean;
        weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
        grade?: -25 | 0 | 200;
        opticalSize?: 20 | 24 | 40 | 48;
    }

    let {
        href,
        children,
        hoverColor,
        variant = "primary",
        size,
        element = $bindable(),
        tooltipParams,
        iconName,
        iconStyle = "sharp",
        iconSize,
        fill = false,
        weight = 400,
        grade = 0,
        opticalSize = 24,
        ...props
    }: Props & HTMLButtonAttributes = $props();

    let childrenEl: HTMLSpanElement | undefined = $state();
    let hasVisibleChildren = $derived.by(() => {
        if (childrenEl) {
            return childrenEl.childNodes.length > 0 && childrenEl.textContent?.trim() !== "";
        }
    });

    let buttonStyle = $derived(
        hoverColor ? `${props.style ? `${props.style}; ` : ""}--button-hover-bg: ${hoverColor}` : props.style
    );

    let classList = $derived(`${variant ?? ""} ${size ?? ""} ${props.class ?? ""}`.trim());
</script>

{#snippet internalButtonContent()}
    {#if iconName}
        <MaterialIcon {iconName} {iconStyle} {fill} {weight} {grade} {opticalSize} size={iconSize} />
    {/if}
    <span class="button-content" bind:this={childrenEl}>
        {@render children?.()}
    </span>
{/snippet}

{#if href}
    <a
        {...props as HTMLAnchorAttributes}
        bind:this={element}
        {href}
        class={classList}
        class:with-children={hasVisibleChildren}
        aria-label={props["aria-label"] ?? props.title}
        style={buttonStyle}
        use:tooltip={tooltipParams ?? props.title}
    >
        {@render internalButtonContent()}
    </a>
{:else}
    <button
        {...props as HTMLButtonAttributes}
        bind:this={element}
        class={classList}
        class:with-children={hasVisibleChildren}
        aria-label={props["aria-label"] ?? props.title}
        style={buttonStyle}
        use:tooltip={tooltipParams ?? props.title}
    >
        {@render internalButtonContent()}
    </button>
{/if}

<style lang="scss">
    @use "$lib/styles/scss/viz-mixins.scss" as m;

    .button-content {
        display: contents;
    }

    a,
    button {
        cursor: pointer;
        color: var(--viz-text-primary);
        font-weight: 500;
        height: max-content;
        border: 1px solid transparent;
        padding: var(--viz-spacing-xs);
        gap: var(--viz-spacing-xs);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-direction: row;
        text-align: center;
        text-decoration: none;
        white-space: nowrap;
        position: relative;
        transition:
            background-color 150ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,
            border-color 150ms ease;
        border-radius: var(--viz-border-radius-pill);
        outline: none;

        :global(.viz-material-icon) {
            padding: -0.25em;
        }

        &.with-children {
            padding: var(--viz-spacing-xs) var(--viz-spacing-sm);
        }

        :global(.viz-material-icon) {
            padding: -0.25em;
        }

        &:focus-visible {
            box-shadow:
                0 0 0 2px var(--viz-surface-base),
                0 0 0 4px var(--viz-primary);
        }

        &:disabled {
            cursor: not-allowed;
            opacity: 0.5;
            background-color: var(--viz-surface-card);
            border-color: var(--viz-surface-hover);
        }

        &:hover:not(:disabled) {
            background-color: var(--button-hover-bg, var(--viz-surface-hover));
            border-color: var(--viz-border-subtle);
        }

        &:active:not(:disabled) {
            background-color: var(--viz-surface-hover);
        }

        &.danger {
            @include m.status-tint("error", true);
        }

        &.warning {
            @include m.status-tint("warning", true);
        }

        &.success {
            @include m.status-tint("success", true);
        }

        &.info {
            @include m.status-tint("info", true);
        }

        &.secondary {
            background-color: var(--viz-surface-panel);
            border-color: var(--viz-surface-hover);
            color: var(--viz-text-primary);

            &:hover:not(:disabled) {
                background-color: var(--viz-surface-hover);
                border-color: var(--viz-border-subtle);
            }
        }

        &.ghost {
            background-color: transparent;
            border-color: transparent;
            color: var(--viz-text-primary);

            &:hover:not(:disabled) {
                background-color: var(--viz-surface-hover);
            }
        }

        &.big {
            font-size: var(--viz-font-size-xl);
            padding: var(--viz-spacing-sm);

            &.with-children {
                padding: var(--viz-spacing-sm) var(--viz-spacing-std);
            }
        }

        &.small {
            font-size: var(--viz-font-size-lg);
            padding: var(--viz-spacing-xxs);

            &.with-children {
                padding: var(--viz-spacing-xxs) var(--viz-spacing-sm);
            }
        }

        &.mini {
            font-size: var(--viz-font-size-std);
            padding: 0;

            &.with-children {
                padding: var(--viz-spacing-xs);
            }
        }
    }
</style>
