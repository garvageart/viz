<script lang="ts">
    import type { HTMLButtonAttributes } from "svelte/elements";
    import { tooltip } from "$lib/components/tooltips/tooltip";
    import type { TooltipParams } from "$lib/components/tooltips/tooltip";
    import type { ButtonVariant } from "$lib/components/ui/Button.svelte";
    import MaterialIcon, { type IconProps } from "./MaterialIcon.svelte";

    interface ButtonProps extends HTMLButtonAttributes {
        hoverColor?: string;
        variant?: ButtonVariant;
        element?: HTMLButtonElement;
        tooltipParams?: TooltipParams | string | null;
    }

    type Props = ButtonProps & IconProps;

    let {
        iconName,
        iconStyle = "sharp",
        fill = false,
        weight = 400,
        grade = 0,
        opticalSize = 24,
        size,
        children,
        hoverColor,
        variant = "primary",
        element = $bindable(),
        tooltipParams,
        ...props
    }: Props = $props();

    let childrenEl: HTMLSpanElement | undefined = $state();
    let hasVisibleChildren = $derived.by(() => {
        if (childrenEl) {
            return childrenEl.childNodes.length > 0 && childrenEl.textContent?.trim() !== "";
        }
    });

    let buttonStyle = $derived(
        hoverColor ? `${props.style ? `${props.style}; ` : ""}--button-hover-bg: ${hoverColor}` : props.style
    );
</script>

<button
    type="button"
    use:tooltip={tooltipParams ?? props.title}
    {...props}
    bind:this={element}
    class="{variant} {props.class || ''}"
    class:with-children={hasVisibleChildren}
    aria-label={props["aria-label"] ?? props.title}
    style={buttonStyle}
>
    {#if iconName}
        <MaterialIcon {iconName} {size} {iconStyle} {fill} {grade} {opticalSize} />
    {/if}
    <span class="icon-button-content" bind:this={childrenEl}>
        {@render children?.()}
    </span>
</button>

<style lang="scss">
    @use "$lib/styles/scss/viz-mixins.scss" as m;

    .icon-button-content {
        display: contents;
    }

    button {
        cursor: pointer;
        color: var(--viz-text-primary);
        font-weight: 500;
        letter-spacing: 0.02em;
        height: max-content;
        border: 1px solid transparent;
        padding: var(--viz-spacing-xs);
        gap: var(--viz-spacing-xs);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-direction: row;
        text-align: center;
        white-space: nowrap;
        transition:
            background-color 150ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,
            border-color 150ms ease;
        border-radius: var(--viz-border-radius-pill);
        outline: none;

        /* Material icon SVGs have ~20% internal viewBox whitespace around the glyph.
           Negative margins compensate for this optical padding inside the button. */
        :global(.viz-material-icon) {
            padding: -0.25em;
        }

        &.with-children {
            padding: var(--viz-spacing-xs) var(--viz-spacing-sm);
        }

        &:focus-visible {
            box-shadow:
                0 0 0 2px var(--viz-surface-base),
                0 0 0 4px var(--viz-primary);
        }

        &:hover:not(:disabled) {
            background-color: var(--button-hover-bg, var(--viz-surface-hover));
            border-color: var(--viz-surface-hover);
        }

        &:active:not(:disabled) {
            background-color: var(--viz-surface-hover);
        }

        &:disabled {
            cursor: not-allowed;
            opacity: 0.5;
            background-color: transparent;
            border-color: transparent;
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
