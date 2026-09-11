<script lang="ts">
    import Badge from "$lib/components/ui/Badge.svelte";
    import { dragCoordinator } from "./coordinator.svelte";

    let session = $derived(dragCoordinator.session);
    let primaryItem = $derived(session?.items[0]);

    let count = $derived(
        Array.isArray(primaryItem?.payload) ? primaryItem.payload.length : (session?.items.length ?? 0)
    );
</script>

<div class="viz-drag-tooltip" style="transform: translate3d({session?.coords.x}px, {session?.coords.y}px, 0);">
    {#if primaryItem?.thumbnailUrl}
        <img src={primaryItem.thumbnailUrl} alt="" class="tooltip-thumbnail" />
    {/if}

    {#if count > 1}
        <Badge size="small" variant="info">+{count}</Badge>
    {/if}

    <span class="entity-desc">
        {session?.label}
    </span>

    {#if session?.actionLabel}
        <div class="action-segment">
            {#if session?.modifiers.altKey}
                <Badge size="small" variant="neutral">Alt</Badge>
            {/if}
            <span class="action-text">{session?.actionLabel}</span>
        </div>
    {/if}
</div>

<style lang="scss">
    .viz-drag-tooltip {
        position: fixed;
        top: 0;
        left: 0;
        pointer-events: none;
        z-index: var(--viz-z-tooltip);
        display: inline-flex;
        align-items: center;
        gap: var(--viz-spacing-xs);
        padding: var(--viz-padding-xs) var(--viz-padding-sm);
        background-color: var(--viz-surface-popover);
        border: 1px solid var(--viz-border-subtle);
        border-radius: var(--viz-border-radius-md);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        color: var(--viz-text-primary);
        font-family: var(--viz-display-font);
        line-height: 1;
        margin-top: var(--viz-spacing-md);
        margin-left: var(--viz-spacing-md);
        transition: transform 0.04s linear;
        will-change: transform;
    }

    .tooltip-thumbnail {
        width: 2rem;
        height: 2rem;
        object-fit: cover;
        border-radius: var(--viz-border-radius-sm);
    }

    .entity-desc {
        font-weight: 600;
        color: var(--viz-text-primary);
    }

    .action-segment {
        display: inline-flex;
        align-items: center;
        gap: var(--viz-spacing-xs);
        color: var(--viz-text-secondary);
        border-left: 1px solid var(--viz-border-subtle);
        padding-left: var(--viz-spacing-xs);
    }

    .action-text {
        white-space: nowrap;
    }
</style>
