<script lang="ts">
    import type { HTMLButtonAttributes } from "svelte/elements";

    type ButtonVariant =
        "primary" | "secondary" | "danger" | "warning" | "success" | "info" | "ghost" | "big" | "small" | "mini";

    interface Props extends HTMLButtonAttributes {
        hoverColor?: string;
        variant?: ButtonVariant;
        element?: HTMLButtonElement;
    }

    let { children, hoverColor, variant = "primary", element = $bindable(), ...props }: Props = $props();
</script>

<button
    {...props}
    bind:this={element}
    class="{variant} {props.class || ''}"
    aria-label={props["aria-label"] ?? props.title}
    style={hoverColor ? `--button-hover-bg: ${hoverColor}` : undefined}
>
    {@render children?.()}
</button>

<style lang="scss">
    @use "$lib/styles/scss/viz-mixins.scss" as m;

    button {
        cursor: pointer;
        color: var(--viz-text-primary);
        font-weight: 500;
        font-size: var(--viz-font-size-lg);
        letter-spacing: 0.02em;
        height: max-content;
        background-color: var(--viz-surface-panel);
        border: var(--viz-border-thin);
        padding: var(--viz-spacing-xs) var(--viz-spacing-md);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-direction: row;
        gap: var(--viz-spacing-xs);
        text-align: center;
        position: relative;
        transition:
            background-color 150ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,
            border-color 150ms ease;
        border-radius: var(--viz-border-radius-pill);
        outline: none;

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
            padding: var(--viz-spacing-sm) var(--viz-spacing-std);
        }

        &.small {
            font-size: var(--viz-font-size-lg);
            padding: var(--viz-spacing-xs) var(--viz-spacing-md);
        }

        &.mini {
            font-size: var(--viz-font-size-std);
            padding: var(--viz-spacing-xxs) var(--viz-spacing-sm);
        }
    }
</style>
