<script lang="ts">
    import type { Snippet } from "svelte";
    import type { HTMLAttributes } from "svelte/elements";
    import Button from "$lib/components/ui/Button.svelte";
    import type { SelectionScope } from "$lib/states/selection.svelte";

    interface Props extends HTMLAttributes<HTMLDivElement> {
        /** Whether the toolbar sticks to the top of its scrolling container */
        stickyToolbar?: boolean;
        /** Selection scope to monitor for selection count and clear operations */
        selectionScope?: SelectionScope | null;
        /** Leading content (left side: e.g. intake buttons, context title) */
        leading?: Snippet;
        /** Selection actions content (appears immediately following the selection count on the left) */
        selectionActions?: Snippet;
        /** Trailing content (right side: sort controls, filter button, display options) */
        trailing?: Snippet;
        /** Custom children fallback if manual composition is required */
        children?: Snippet;
    }

    let {
        stickyToolbar = true,
        selectionScope = null,
        leading,
        selectionActions,
        trailing,
        children,
        class: className = "",
        style: customStyle = "",
        ...props
    }: Props = $props();

    let hasSelection = $derived(Boolean(selectionScope && selectionScope.size > 0));
</script>

<div
    {...props}
    data-keep-selection="true"
    class="viz-toolbar-container viz-toolbar {className}"
    style="{stickyToolbar ? 'position: sticky; top: 0;' : 'position: relative;'} {customStyle}"
>
    <div class="viz-toolbar-section leading">
        {#if leading}
            {@render leading()}
        {/if}
    </div>

    <div class="viz-toolbar-section trailing">
        {#if hasSelection && selectionActions}
            <div class="selection-actions">
                {@render selectionActions()}
            </div>
            {#if trailing && hasSelection}
                <div class="toolbar-separator"></div>
            {/if}

            {#if hasSelection && selectionScope}
                <div class="selection-info">
                    <Button
                        variant="ghost"
                        iconName="close"
                        class="toolbar-button clear-selection-btn"
                        title="Clear selection"
                        aria-label="Clear selection"
                        onclick={() => {
                            selectionScope.clear();
                        }}
                    />
                    <span class="selection-count">{selectionScope.size} selected</span>
                </div>
            {/if}
            {#if trailing}
                <div class="toolbar-separator"></div>
            {/if}
        {/if}

        {#if trailing}
            {@render trailing()}
        {/if}
    </div>

    {#if children}
        {@render children()}
    {/if}
</div>

<style lang="scss">
    :global(:root) {
        --viz-toolbar-height: 3rem;
    }

    .viz-toolbar-container {
        z-index: var(--viz-z-local);
        height: var(--viz-toolbar-height);
        background-color: var(--viz-surface-panel);
        backdrop-filter: blur(var(--viz-spacing-xs));
        border-bottom: var(--viz-border-thin);
        font-size: var(--viz-font-size-std);
        width: 100%;
        max-width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-direction: row;
        box-sizing: border-box;
        padding: 0 var(--viz-spacing-md);
        gap: var(--viz-spacing-sm);
    }

    .viz-toolbar-section {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-sm);

        &.leading {
            flex-shrink: 1;
            min-width: 0;
        }

        &.trailing {
            margin-left: auto;
            flex-shrink: 0;
        }
    }

    :global(.toolbar-separator),
    .toolbar-separator {
        height: 1.25rem;
        width: 1px;
        background-color: var(--viz-border-subtle);
        margin: 0 var(--viz-spacing-xxs);
        flex-shrink: 0;
    }

    .selection-info {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-xs);
        white-space: nowrap;
        flex-shrink: 0;
    }

    .selection-count {
        font-weight: 600;
        white-space: nowrap;
    }

    .selection-actions {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-xs);
    }

    @media (max-width: 40rem) {
        .viz-toolbar-container {
            padding: 0 var(--viz-spacing-sm);
            gap: var(--viz-spacing-xs);
        }

        .viz-toolbar-section {
            gap: var(--viz-spacing-xs);
        }

        :global(.toolbar-button span:not(.viz-material-icon)) {
            display: none;
        }
    }
</style>
