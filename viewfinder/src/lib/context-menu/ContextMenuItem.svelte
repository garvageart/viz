<script lang="ts">
    import MaterialIcon from "../components/ui/MaterialIcon.svelte";
    import ContextMenuItem from "./ContextMenuItem.svelte";
    import type { MenuItem } from "./types";

    interface Props {
        item: MenuItem;
        index?: number;
        active?: boolean;
        onselect?: (detail: { item: MenuItem; index: number; event: MouseEvent }) => void;
    }

    let { item, index = 0, active = false, onselect }: Props = $props();

    // submenu visibility on hover/focus
    let showSubmenu = $state(false);

    function onClick(e: MouseEvent) {
        if (item.disabled || item.separator) {
            return;
        }

        // If the item has children, clicking the parent shouldn't immediately activate
        if (item.children && item.children.length > 0) {
            showSubmenu = true;
            return;
        }

        onselect?.({ item, index, event: e });
    }

    function onChildSelect(detail: { item: MenuItem; index: number; event: MouseEvent }) {
        onselect?.(detail);
        showSubmenu = false;
    }
</script>

<li role="none" onmouseenter={() => (showSubmenu = true)} onmouseleave={() => (showSubmenu = false)}>
    {#if item.content}
        <div
            id={item.id}
            role="menuitem"
            class="ctx-content"
            class:disabled={!!item.disabled}
            data-index={index}
            tabindex={active ? 0 : -1}
        >
            {@render item.content(item, index)}
        </div>
    {:else}
        <button
            id={item.id}
            role="menuitem"
            aria-disabled={item.disabled ? "true" : undefined}
            class:disabled={!!item.disabled}
            data-index={index}
            tabindex={active ? 0 : -1}
            onclick={onClick}
        >
            {#if item.iconName}
                {#if typeof item.iconName === "string"}
                    <MaterialIcon class="icon" iconName={item.iconName} weight={300} />
                {:else}
                    <MaterialIcon class="icon" weight={300} {...item.iconName} />
                {/if}
            {/if}
            <span class="label">{item.label}</span>
            {#if item.shortcut}
                <span class="shortcut" aria-hidden="true">{item.shortcut}</span>
            {/if}
            {#if item.children && item.children.length > 0}
                <span class="submenu-arrow" aria-hidden="true">▸</span>
            {/if}
        </button>
    {/if}
    {#if item.children && item.children.length > 0}
        {#if showSubmenu}
            <div class="submenu" role="menu">
                <ul>
                    {#each item.children as child, ci}
                        {#if child.separator}
                            <li class="ctx-separator" role="separator" aria-hidden="true"></li>
                        {:else}
                            <ContextMenuItem item={child} index={ci} active={false} onselect={onChildSelect} />
                        {/if}
                    {/each}
                </ul>
            </div>
        {/if}
    {/if}
</li>

<style>
    ul {
        margin: 0;
        padding: 0;
        list-style: none;
    }

    li {
        display: flex;
        list-style-type: none;
        width: 100%;
        position: relative;
    }

    li > button {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: var(--viz-spacing-xs);
        align-items: center;
        font-size: 1rem;
        font-weight: 500;
        padding: var(--viz-spacing-xs) var(--viz-spacing-sm);
        text-align: left;
        width: 100%;
        border: 0px;
        color: var(--viz-text-primary);
        background-color: var(--viz-surface-popover);
        cursor: pointer;
        transition: background-color 0.1s ease;
    }

    li > button:hover {
        background-color: var(--viz-surface-hover);
    }

    li > button.disabled {
        color: var(--viz-border-subtle);
        cursor: default;
    }

    li > button.disabled:hover {
        background-color: var(--viz-surface-popover);
    }

    .ctx-content {
        display: flex;
        align-items: center;
        width: 100%;
        padding: var(--viz-spacing-xs) var(--viz-spacing-sm);
        box-sizing: border-box;
        cursor: pointer;

        &.disabled {
            opacity: 0.5;
            pointer-events: none;
        }
    }

    li:hover > .ctx-content {
        background-color: var(--viz-surface-hover);
    }

    .shortcut {
        opacity: 0.6;
        font-size: 1rem;
        margin-left: auto;
    }

    .submenu {
        position: absolute;
        /* overlap slightly with parent to avoid hover gap */
        left: calc(100% - 6px);
        top: 0.15rem;
        background: var(--viz-surface-popover);
        box-shadow:
            0 5px 10px rgba(0, 0, 0, 0.15),
            0 2px 8px rgba(0, 0, 0, 0.3);
        border-radius: 0.5rem;
        overflow: hidden;
        z-index: 995;
        box-sizing: border-box;
        min-width: 15rem;
    }

    .submenu-arrow {
        opacity: 0.7;
        margin-left: 0.5rem;
        font-size: 0.9em;
    }

    .ctx-separator {
        height: 0;
        background: transparent;
        border: none;
        border-top: 1px solid color-mix(in srgb, var(--viz-surface-hover) 70%, transparent);
        margin: var(--viz-spacing-xs) 0;
        width: 100%;
        list-style: none;
        box-sizing: border-box;
    }
</style>
