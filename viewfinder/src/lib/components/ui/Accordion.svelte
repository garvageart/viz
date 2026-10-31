<script module lang="ts">
    export type AccordionIconPosition = "left" | "right";
    export type AccordionIconType = "chevron" | "arrow" | "none";
    export type AccordionVariant = "default" | "subtle" | "bordered" | "flush";
    export type AccordionSize = "compact" | "standard" | "large";
</script>

<script lang="ts">
    import type { MaterialSymbol } from "#lib/types/MaterialSymbol.js";
    import { generateRandomString } from "#lib/utils/misc.js";
    import type { Snippet } from "svelte";
    import type { HTMLAttributes } from "svelte/elements";
    import { slide } from "svelte/transition";
    import MaterialIcon from "./MaterialIcon.svelte";

    interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "ontoggle"> {
        title?: string;
        open?: boolean;
        disabled?: boolean;
        variant?: AccordionVariant;
        size?: AccordionSize;
        iconPosition?: AccordionIconPosition;
        iconType?: AccordionIconType;
        headerClass?: string;
        contentClass?: string;
        header?: Snippet;
        actions?: Snippet;
        children?: Snippet;
        ontoggle?: (isOpen: boolean) => void;
    }

    let {
        title,
        open = $bindable(false),
        disabled = false,
        variant = "default",
        size = "standard",
        iconPosition = "left",
        iconType,
        headerClass = "",
        contentClass = "",
        header,
        actions,
        children,
        class: className = "",
        id,
        ontoggle,
        ...props
    }: Props = $props();

    const instanceId = $derived(id || `accordion-${generateRandomString(6)}`);
    const headerId = $derived(`${instanceId}-header`);
    const contentId = $derived(`${instanceId}-content`);

    let effectiveIconType = $derived(iconType ?? (iconPosition === "right" ? "arrow" : "chevron"));
    let iconName = $derived<MaterialSymbol>(effectiveIconType === "chevron" ? "chevron_right" : "keyboard_arrow_down");

    function handleToggle() {
        if (disabled) {
            return;
        }

        open = !open;
        if (ontoggle) {
            ontoggle(open);
        }
    }
</script>

{#snippet accordionIcon(pos: AccordionIconPosition)}
    {#if effectiveIconType !== "none" && iconPosition === pos}
        <span
            class="viz-accordion-icon pos-{pos}"
            class:rotate-90={effectiveIconType === "chevron" && open}
            class:rotate-180={effectiveIconType === "arrow" && open}
        >
            <MaterialIcon {iconName} size="1.2rem" />
        </span>
    {/if}
{/snippet}

<div
    class="viz-accordion variant-{variant} size-{size} {className}"
    class:is-open={open}
    class:is-disabled={disabled}
    id={instanceId}
    {...props}
>
    <div class="viz-accordion-header-row">
        <button
            type="button"
            id={headerId}
            class="viz-accordion-header {headerClass}"
            aria-expanded={open}
            aria-controls={contentId}
            {disabled}
            onclick={handleToggle}
        >
            {@render accordionIcon("left")}

            <div class="viz-accordion-title">
                {#if header}
                    {@render header()}
                {:else if title}
                    <span class="viz-accordion-title-text">{title}</span>
                {/if}
            </div>

            {@render accordionIcon("right")}
        </button>

        {#if actions}
            <div class="viz-accordion-actions">
                {@render actions()}
            </div>
        {/if}
    </div>

    {#if open}
        <div
            id={contentId}
            class="viz-accordion-content {contentClass}"
            role="region"
            aria-labelledby={headerId}
            transition:slide={{ duration: 200 }}
        >
            {@render children?.()}
        </div>
    {/if}
</div>

<style lang="scss">
    .viz-accordion {
        width: 100%;
        display: flex;
        flex-direction: column;
        transition: background-color 0.2s ease;

        &.variant-default {
            border-bottom: var(--viz-border-thin);

            &:last-child {
                border-bottom: none;
            }

            .viz-accordion-header:hover:not(:disabled) {
                background-color: var(--viz-surface-panel);
                color: var(--viz-text-secondary);
            }
        }

        &.variant-subtle {
            border-bottom: 1px solid var(--viz-surface-hover);

            .viz-accordion-header:hover:not(:disabled) {
                background-color: var(--viz-surface-panel);
            }

            &.is-open {
                background-color: var(--viz-surface-base);

                .viz-accordion-header-row {
                    border-bottom: 1px solid var(--viz-surface-hover);
                }
            }
        }

        &.variant-bordered {
            border: var(--viz-border-thin);
            border-radius: var(--viz-border-radius-md);
            overflow: hidden;

            .viz-accordion-header:hover:not(:disabled) {
                background-color: var(--viz-surface-hover);
            }

            &.is-open .viz-accordion-header-row {
                border-bottom: var(--viz-border-thin);
            }
        }

        &.variant-flush {
            border: none;

            .viz-accordion-header:hover:not(:disabled) {
                color: var(--viz-text-secondary);
            }
        }

        &.size-compact {
            .viz-accordion-header {
                padding: var(--viz-spacing-xxs) var(--viz-spacing-xs);
            }

            .viz-accordion-content {
                padding: var(--viz-spacing-xs) 0;
                gap: 2px;
            }
        }

        &.size-standard {
            .viz-accordion-header {
                padding: var(--viz-spacing-xs);
            }

            .viz-accordion-content {
                padding: 0.5rem 0;
                gap: var(--viz-spacing-sm);
            }
        }

        &.size-large {
            .viz-accordion-header {
                padding: var(--viz-spacing-sm) var(--viz-spacing-md);
            }

            .viz-accordion-content {
                padding: var(--viz-spacing-md) var(--viz-spacing-std);
                gap: var(--viz-spacing-md);
            }
        }

        &.is-disabled {
            opacity: 0.5;
            pointer-events: none;
        }
    }

    .viz-accordion-header-row {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .viz-accordion-header {
        width: 100%;
        display: flex;
        align-items: center;
        background: transparent;
        border: none;
        cursor: pointer;
        color: var(--viz-text-primary);
        font-family: var(--viz-display-font);
        font-weight: 600;
        text-align: left;
        gap: var(--viz-spacing-xs);
        transition:
            background-color 0.2s ease,
            color 0.2s ease;

        &:focus-visible {
            outline: 2px solid var(--viz-primary);
            outline-offset: -2px;
        }
    }

    .viz-accordion-title {
        display: flex;
        align-items: center;
        flex: 1;
        min-width: 0;
    }

    .viz-accordion-title-text {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .viz-accordion-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        color: var(--viz-text-secondary);
        transform-origin: center;
        transition: transform 0.2s ease;

        &.rotate-90 {
            transform: rotate(90deg);
        }

        &.rotate-180 {
            transform: rotate(180deg);
        }
    }

    .viz-accordion-actions {
        display: flex;
        align-items: center;
        flex-shrink: 0;
        padding-right: var(--viz-spacing-xs);
    }

    .viz-accordion-content {
        display: flex;
        flex-direction: column;
        color: var(--viz-text-primary);
        font-family: var(--viz-display-font);
    }
</style>
