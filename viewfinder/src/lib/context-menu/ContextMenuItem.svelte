<script lang="ts">
    import { tick } from "svelte";
    import MaterialIcon from "../components/ui/MaterialIcon.svelte";
    import ContextMenu from "./ContextMenu.svelte";
    import type { MenuItem } from "./types";

    interface Props {
        item: MenuItem;
        index?: number;
        active?: boolean;
        onselect?: (detail: { item: MenuItem; index: number; event: MouseEvent | KeyboardEvent }) => void;
        oncloseparent?: () => void;
    }

    let { item, index = 0, active = false, onselect, oncloseparent }: Props = $props();

    let showSubmenu = $state(false);
    let flipLeft = $state(false);
    let flipUp = $state(false);
    let submenuEl = $state<HTMLDivElement | null>(null);
    let itemEl = $state<HTMLElement | null>(null);

    function checkSubmenuPosition() {
        if (!submenuEl) {
            return;
        }

        const rect = submenuEl.getBoundingClientRect();
        const safeMargin = 8;

        if (rect.right > window.innerWidth - safeMargin) {
            flipLeft = true;
        } else {
            flipLeft = false;
        }

        if (rect.bottom > window.innerHeight - safeMargin) {
            flipUp = true;
        } else {
            flipUp = false;
        }
    }

    $effect(() => {
        showSubmenu && tick().then(() => checkSubmenuPosition());
    });

    function onClick(e: MouseEvent) {
        if (item.disabled || item.separator) {
            return;
        }

        if (item.children && item.children.length > 0) {
            showSubmenu = !showSubmenu;
            return;
        }

        if (item.action) {
            item.action(e);
        }
        if (onselect) {
            onselect({ item, index, event: e });
        }
    }

    function onKeyDown(e: KeyboardEvent) {
        if (item.disabled || item.separator) {
            return;
        }

        if (e.key === "ArrowRight" && item.children && item.children.length > 0) {
            e.preventDefault();
            e.stopPropagation();

            showSubmenu = true;

            tick().then(() => {
                const firstSubItem = submenuEl?.querySelector<HTMLElement>('[role="menuitem"]:not(.disabled)');
                if (firstSubItem) {
                    firstSubItem.focus();
                }
            });

            return;
        }

        if (e.key === "ArrowLeft") {
            if (oncloseparent) {
                e.preventDefault();
                e.stopPropagation();

                oncloseparent();
            }

            return;
        }

        if (e.key === "Enter" || e.key === " ") {
            if (item.children && item.children.length > 0) {
                e.preventDefault();
                e.stopPropagation();

                showSubmenu = !showSubmenu;
                return;
            }

            e.preventDefault();
            if (item.action) {
                item.action(e);
            }

            if (onselect) {
                onselect({ item, index, event: e });
            }
        }
    }

    function onChildSelect(detail: { item: MenuItem; index: number; event: MouseEvent | KeyboardEvent }) {
        if (onselect) {
            onselect(detail);
        }

        showSubmenu = false;
    }

    function closeSubmenu() {
        showSubmenu = false;
        if (itemEl) {
            itemEl.focus();
        }
    }
</script>

<li
    role="none"
    onmouseenter={() => {
        if (!item.disabled && item.children && item.children.length > 0) {
            showSubmenu = true;
        }
    }}
    onmouseleave={() => {
        if (item.children && item.children.length > 0) {
            showSubmenu = false;
        }
    }}
>
    {#if item.content}
        <div
            id={item.id}
            role="menuitem"
            class="ctx-content"
            class:disabled={!!item.disabled}
            data-index={index}
            tabindex={active ? 0 : -1}
            bind:this={itemEl}
            onkeydown={onKeyDown}
        >
            {@render item.content(item, index)}
        </div>
    {:else}
        <button
            id={item.id}
            role="menuitem"
            aria-disabled={item.disabled ? "true" : undefined}
            aria-haspopup={item.children && item.children.length > 0 ? "menu" : undefined}
            aria-expanded={item.children && item.children.length > 0 ? showSubmenu : undefined}
            class="ctx-button"
            class:disabled={!!item.disabled}
            class:active-parent={showSubmenu}
            data-index={index}
            tabindex={active ? 0 : -1}
            onclick={onClick}
            onkeydown={onKeyDown}
            bind:this={itemEl}
        >
            {#if item.iconName}
                {#if typeof item.iconName === "string"}
                    <MaterialIcon class="ctx-icon" iconName={item.iconName} />
                {:else}
                    <MaterialIcon class="ctx-icon" {...item.iconName} />
                {/if}
            {/if}
            <span class="label">{item.label}</span>
            {#if item.shortcut}
                <span class="shortcut" aria-hidden="true">{item.shortcut}</span>
            {/if}
            {#if item.children && item.children.length > 0}
                <MaterialIcon class="submenu-arrow" iconName="arrow_right" aria-hidden="true" />
            {/if}
        </button>
    {/if}

    {#if item.children && item.children.length > 0 && showSubmenu}
        <div class="viz-context-menu-submenu" class:flip-left={flipLeft} class:flip-up={flipUp} bind:this={submenuEl}>
            <ContextMenu
                showMenu={true}
                items={item.children}
                portal={false}
                onselect={onChildSelect}
                onclose={closeSubmenu}
            />
        </div>
    {/if}
</li>

<style lang="scss">
    li {
        display: flex;
        list-style-type: none;
        width: 100%;
        position: relative;
    }

    .ctx-button {
        display: grid;
        grid-template-columns: auto 1fr auto auto;
        gap: var(--viz-spacing-xs);
        align-items: center;
        font-size: 1rem;
        padding: var(--viz-spacing-xs) var(--viz-spacing-sm);
        text-align: start;
        width: 100%;
        border-radius: var(--viz-border-radius-sm);
        color: var(--viz-text-primary);
        background-color: var(--viz-surface-popover);
        transition: background-color 0.1s ease;

        &:hover,
        &:focus-visible,
        &.active-parent {
            background-color: var(--viz-surface-hover);
        }

        &.disabled {
            color: var(--viz-border-subtle);
            cursor: default;
            pointer-events: none;

            &:hover {
                background-color: var(--viz-surface-popover);
            }
        }
    }

    :global(.ctx-icon) {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .label {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .shortcut {
        opacity: 0.6;
        font-size: 1rem;
        margin-left: auto;
    }

    :global(.submenu-arrow) {
        opacity: 0.7;
        margin-left: 0.5rem;
    }

    .ctx-content {
        display: flex;
        align-items: center;
        width: 100%;
        padding: var(--viz-spacing-xs) var(--viz-spacing-sm);
        box-sizing: border-box;
        cursor: pointer;
        outline: none;

        &:hover,
        &:focus-visible {
            background-color: var(--viz-surface-hover);
        }

        &.disabled {
            opacity: 0.5;
            pointer-events: none;
        }
    }

    .viz-context-menu-submenu {
        position: absolute;
        /* overlap slightly with parent to avoid hover gap */
        left: calc(100% - 6px);
        top: 0.15rem;
        z-index: calc(var(--viz-z-popover) + 1);

        &.flip-left {
            left: auto;
            right: calc(100% - 6px);
        }

        &.flip-up {
            top: auto;
            bottom: 0.15rem;
        }
    }
</style>
