<script lang="ts">
    import type { HTMLButtonAttributes, MouseEventHandler } from "svelte/elements";
    import MaterialIcon, { type IconProps } from "./MaterialIcon.svelte";
    import { tooltip } from "$lib/components/tooltips/tooltip";

    import type { TooltipParams } from "$lib/components/tooltips/tooltip";

    interface ButtonProps extends HTMLButtonAttributes {
        hoverColor?: string;
        variant?: "big" | "primary" | "small" | "mini";
        element?: HTMLButtonElement;
        tooltipParams?: TooltipParams | string | null;
    }

    type Props = ButtonProps & Partial<IconProps>;

    let {
        iconName,
        iconStyle = "sharp",
        fill = false,
        weight = 400,
        grade = 0,
        opticalSize = 24,
        size,
        children,
        hoverColor = "var(--viz-80)",
        variant = "primary",
        element = $bindable(),
        tooltipParams,
        ...props
    }: Props = $props();
</script>

<button
    type="button"
    use:tooltip={tooltipParams ?? props.title}
    {...props}
    bind:this={element}
    class="{variant} {props.class || ''}"
    class:with-children={!!children}
    aria-label={props["aria-label"] ?? props.title}
    style:--button-hover-bg={hoverColor}
>
    {#if iconName}
        <MaterialIcon {iconName} {size} {iconStyle} {fill} {grade} {opticalSize} />
    {/if}
    {@render children?.()}
</button>

<style lang="scss">
    button {
        cursor: pointer;
        color: var(--viz-text-color);
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
            padding: var(--viz-spacing-xs);
        }

        &:focus-visible {
            box-shadow:
                0 0 0 2px var(--viz-bg-color),
                0 0 0 4px var(--viz-primary);
        }

        &:hover:not(:disabled) {
            background-color: var(--button-hover-bg);
            border-color: var(--viz-80);
        }

        &:active:not(:disabled) {
            background-color: var(--viz-75);
        }

        &:disabled {
            cursor: not-allowed;
            opacity: 0.5;
            background-color: transparent;
            border-color: transparent;
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
