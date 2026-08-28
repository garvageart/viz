<script lang="ts">
    import type { Snippet } from "svelte";
    import type { HTMLAttributes } from "svelte/elements";
    import type { MaterialSymbol } from "$lib/types/MaterialSymbol";
    import Button from "./Button.svelte";
    import MaterialIcon from "./MaterialIcon.svelte";

    export type BannerVariant = "error" | "warning" | "info" | "success" | "neutral" | "default";

    interface Props extends HTMLAttributes<HTMLDivElement> {
        variant?: BannerVariant;
        title?: string;
        message?: string;
        iconName?: MaterialSymbol | null;
        dismissible?: boolean;
        ondismiss?: () => void;
        actions?: Snippet;
        children?: Snippet;
    }

    let {
        variant = "info",
        title,
        message,
        iconName,
        dismissible = false,
        ondismiss,
        actions,
        children,
        class: className = "",
        ...props
    }: Props = $props();

    let resolvedIcon = $derived.by(() => {
        if (iconName !== undefined) {
            return iconName;
        }

        switch (variant) {
            case "error": {
                return "error";
            }
            case "warning": {
                return "warning";
            }
            case "success": {
                return "check_circle";
            }
            case "neutral": {
                return "info";
            }
            default: {
                return "info";
            }
        }
    });
</script>

<div class="viz-banner variant-{variant} {className}" role="alert" {...props}>
    {#if resolvedIcon}
        <div class="banner-icon-wrapper">
            <MaterialIcon iconName={resolvedIcon} size="1.25rem" />
        </div>
    {/if}

    <div class="banner-content">
        {#if title}
            <div class="banner-title">{title}</div>
        {/if}
        {#if message}
            <div class="banner-message">{message}</div>
        {/if}
        {@render children?.()}
    </div>

    {#if actions}
        <div class="banner-actions">
            {@render actions()}
        </div>
    {/if}

    {#if dismissible}
        <Button
            iconName="close"
            variant="ghost"
            size="small"
            class="banner-dismiss-btn"
            title="Dismiss"
            onclick={ondismiss}
        />
    {/if}
</div>

<style lang="scss">
    .viz-banner {
        display: flex;
        align-items: flex-start;
        gap: var(--viz-spacing-md);
        padding: var(--viz-spacing-md);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
        box-sizing: border-box;
        width: 100%;
        line-height: 1.4;

        .banner-icon-wrapper {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            margin-top: 1px;
        }

        .banner-content {
            display: flex;
            flex-direction: column;
            gap: var(--viz-spacing-xxs);
            flex: 1;
            min-width: 0;
        }

        .banner-title {
            font-weight: 600;
            font-size: var(--viz-font-size-std);
        }

        .banner-message {
            font-size: var(--viz-font-size-std);
            color: var(--viz-text-primary);
            word-break: break-word;
        }

        .banner-actions {
            display: flex;
            align-items: center;
            gap: var(--viz-spacing-sm);
            flex-shrink: 0;
        }

        :global(.banner-dismiss-btn) {
            flex-shrink: 0;
            opacity: 0.7;
            transition: opacity 0.15s ease;

            &:hover {
                opacity: 1;
            }
        }

        @mixin banner-variant($color, $text-color: #ffffff) {
            background-color: color-mix(in srgb, $color 10%, var(--viz-surface-card));
            border-color: color-mix(in srgb, $color 30%, transparent);

            .banner-icon-wrapper,
            .banner-title {
                color: $color;
            }

            :global([data-theme="light"]) &,
            :global(:root[data-theme="light"]) & {
                background-color: $color;
                border-color: $color;

                .banner-icon-wrapper,
                .banner-title,
                .banner-message,
                :global(.banner-dismiss-btn) {
                    color: $text-color;
                }
            }
        }

        &.variant-error {
            @include banner-variant(var(--viz-error-color));
        }

        &.variant-warning {
            @include banner-variant(var(--viz-warning-color), var(--viz-10-dark));
        }

        &.variant-success {
            @include banner-variant(var(--viz-success-color));
        }

        &.variant-info,
        &.variant-default {
            @include banner-variant(var(--viz-info-color));
        }

        &.variant-neutral {
            background-color: var(--viz-surface-panel);
            border-color: var(--viz-border-subtle);

            .banner-icon-wrapper,
            .banner-title {
                color: var(--viz-text-secondary);
            }
        }
    }
</style>
