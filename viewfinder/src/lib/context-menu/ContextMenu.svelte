<script lang="ts">
    import { getContext } from "svelte";
    import type { SvelteHTMLElements } from "svelte/elements";
    import { ZIndex } from "$lib/constants/z-index";
    import { ContextKeys } from "$lib/context-keys";
    import ContextMenuItem from "./ContextMenuItem.svelte";
    import { contextMenu } from "./context-menu.svelte";
    import type { ActiveContextMenuState, MenuItem } from "./types";

    type Anchor = { x: number; y: number } | HTMLElement | null;

    interface Props {
        showMenu?: boolean;
        items?: MenuItem[];
        anchor?: Anchor;
        offsetX?: number;
        offsetY?: number;
        align?: "left" | "right";
        onopen?: () => void;
        onclose?: () => void;
        onselect?: (detail: { item: MenuItem; index: number; event: MouseEvent | KeyboardEvent }) => void;
        htmlProps?: SvelteHTMLElements["div"];
    }

    let {
        showMenu = $bindable(),
        items,
        anchor,
        offsetX = 0,
        offsetY = 0,
        align = "left",
        onopen,
        onclose,
        onselect,
        htmlProps
    }: Props = $props();

    // Determine whether this instance is controlled via props or global manager
    const isControlled = $derived(showMenu !== undefined || items !== undefined);

    const activeState: ActiveContextMenuState = $derived.by(() => {
        if (isControlled) {
            return {
                show: !!showMenu,
                items: items ?? [],
                anchor: anchor ?? null,
                align,
                offsetX,
                offsetY
            };
        }

        return {
            show: contextMenu.isOpen,
            items: contextMenu.items,
            anchor: contextMenu.anchor,
            align: contextMenu.options.align ?? "left",
            offsetX: contextMenu.options.offsetX ?? 0,
            offsetY: contextMenu.options.offsetY ?? 0
        };
    });

    // Dynamic Z-Index elevation scale integration
    const getModalZIndex = getContext<(() => number | undefined) | undefined>(ContextKeys.ModalZIndex);
    const computedZIndex = $derived.by(() => {
        const modalZ = getModalZIndex?.();
        if (modalZ !== undefined) {
            return modalZ + 1;
        }

        if (isControlled) {
            return ZIndex.Popover;
        }
        return contextMenu.zIndex;
    });

    let menuEl = $state<HTMLDivElement | undefined>();
    let activeIndex = $state(0);
    let position = $state<{ top: number; left: number }>({ top: -9999, left: -9999 });
    let isPositioned = $state(false);

    function computePosition(
        el: HTMLElement,
        currentAnchor: Anchor,
        opts: { align: "left" | "right"; offsetX: number; offsetY: number }
    ): { left: number; top: number } {
        if (!currentAnchor) {
            return { top: 0, left: 0 };
        }

        const safeMargin = 8;
        const menuRect = el.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let left = safeMargin;
        let top = safeMargin;

        if (currentAnchor instanceof HTMLElement) {
            const rect = currentAnchor.getBoundingClientRect();

            if (opts.align === "left") {
                left = rect.left + opts.offsetX;
            } else {
                left = rect.right - menuRect.width - opts.offsetX;
            }

            top = rect.bottom + opts.offsetY;

            // Flip above if insufficient space below and more space above
            const spaceBelow = vh - rect.bottom;
            const spaceAbove = rect.top;
            if (menuRect.height + safeMargin > spaceBelow && spaceAbove > spaceBelow) {
                top = rect.top - menuRect.height - opts.offsetY;
            }
        } else {
            left = currentAnchor.x + opts.offsetX;
            top = currentAnchor.y + opts.offsetY;

            // If coordinates overflow bottom edge, flip upward
            if (top + menuRect.height + safeMargin > vh && currentAnchor.y - menuRect.height > 0) {
                top = currentAnchor.y - menuRect.height - opts.offsetY;
            }
        }

        // Clamp inside viewport
        const maxLeft = Math.max(safeMargin, vw - menuRect.width - safeMargin);
        const maxTop = Math.max(safeMargin, vh - menuRect.height - safeMargin);

        left = Math.round(Math.max(safeMargin, Math.min(left, maxLeft)));
        top = Math.round(Math.max(safeMargin, Math.min(top, maxTop)));

        return { left, top };
    }

    function setInitialFocus() {
        const firstEnabled = activeState.items.findIndex((i) => !i.disabled && !i.separator);
        activeIndex = firstEnabled === -1 ? 0 : firstEnabled;

        const current = menuEl?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
        current?.focus();
    }

    function closeMenu() {
        if (isControlled) {
            showMenu = false;
            onclose?.();
        } else {
            contextMenu.close();
        }
    }

    $effect(() => {
        if (activeState.show) {
            if (!menuEl) {
                return;
            }

            position = computePosition(menuEl, activeState.anchor, {
                align: activeState.align,
                offsetX: activeState.offsetX,
                offsetY: activeState.offsetY
            });

            isPositioned = true;
            setInitialFocus();
            onopen?.();
        } else {
            isPositioned = false;
            position = { top: -9999, left: -9999 };
            onclose?.();
        }
    });

    function portal(node: HTMLElement) {
        document.body.appendChild(node);
        return {
            destroy() {
                if (node.parentElement === document.body) {
                    document.body.removeChild(node);
                }
            }
        };
    }

    function onWindowPointerDown(e: PointerEvent) {
        if (!activeState.show) {
            return;
        }

        const path = (e.composedPath && e.composedPath()) || [];
        if (menuEl && path.includes(menuEl)) {
            return;
        }

        closeMenu();
    }

    function onWindowKeyDown(e: KeyboardEvent) {
        if (!activeState.show) {
            return;
        }

        const enabled = activeState.items.filter((i) => !i.disabled && !i.separator);
        if (enabled.length === 0) {
            return;
        }

        switch (e.key) {
            case "Escape":
                e.preventDefault();
                closeMenu();
                break;
            case "ArrowDown": {
                e.preventDefault();
                let next = activeIndex;
                for (let step = 0; step < activeState.items.length; step++) {
                    next = (next + 1) % activeState.items.length;
                    if (!activeState.items[next].disabled && !activeState.items[next].separator) {
                        activeIndex = next;
                        focusActive();
                        break;
                    }
                }
                break;
            }
            case "ArrowUp": {
                e.preventDefault();
                let prev = activeIndex;
                for (let step = 0; step < activeState.items.length; step++) {
                    prev = (prev - 1 + activeState.items.length) % activeState.items.length;
                    if (!activeState.items[prev].disabled && !activeState.items[prev].separator) {
                        activeIndex = prev;
                        focusActive();
                        break;
                    }
                }
                break;
            }
            case "Home":
                e.preventDefault();
                activeIndex = activeState.items.findIndex((i) => !i.disabled && !i.separator);
                focusActive();
                break;
            case "End":
                e.preventDefault();
                for (let i = activeState.items.length - 1; i >= 0; i--) {
                    if (!activeState.items[i].disabled && !activeState.items[i].separator) {
                        activeIndex = i;
                        break;
                    }
                }
                focusActive();
                break;
        }
    }

    function focusActive() {
        const el = menuEl?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
        el?.focus();
    }

    function handleSelect(detail: { item: MenuItem; index: number; event: MouseEvent | KeyboardEvent }) {
        if (isControlled) {
            onselect?.(detail);
        } else if (contextMenu.options.onSelect) {
            contextMenu.options.onSelect(detail);
        }
        closeMenu();
    }
</script>

<svelte:window onpointerdown={onWindowPointerDown} onkeydown={onWindowKeyDown} />

{#if activeState.show}
    <div
        {...htmlProps}
        class="viz-context-menu context-menu {htmlProps?.class ?? ''}"
        role="menu"
        aria-orientation="vertical"
        bind:this={menuEl}
        use:portal
        onclick={(e) => e.stopPropagation()}
        style="position: fixed; top: {position.top}px; left: {position.left}px; z-index: {computedZIndex}; visibility: {isPositioned
            ? 'visible'
            : 'hidden'}; {htmlProps?.style ?? ''}"
    >
        <div class="context-menu-options">
            <ul role="menu" aria-orientation="vertical">
                {#each activeState.items as item, i (item.id ?? i)}
                    {#if item.separator}
                        <li class="ctx-separator" role="separator" aria-hidden="true"></li>
                    {:else}
                        <ContextMenuItem {item} index={i} active={i === activeIndex} onselect={handleSelect} />
                    {/if}
                {/each}
            </ul>
        </div>
    </div>
{/if}

<style lang="scss">
    .viz-context-menu {
        min-width: 15rem;
        list-style: none;
        box-shadow:
            0 10px 30px rgba(0, 0, 0, 0.35),
            0 2px 8px rgba(0, 0, 0, 0.3);
        border-radius: 0.5rem;
        max-width: calc(100vw - 1em);
        overflow: visible;
        background-color: var(--viz-surface-popover);
        box-sizing: border-box;
        display: flex;
    }

    .context-menu-options {
        display: inline-flex;
        background-color: var(--viz-surface-popover);
        color: var(--viz-text-primary);
        border: 1px solid var(--viz-border-subtle);
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.4);
        flex-direction: column;
        border-radius: 0.5rem;
        width: 100%;
        max-width: inherit;
    }

    ul {
        margin: 0;
        padding: 0px;
        list-style: none;
    }

    .ctx-separator {
        height: 0 !important;
        background: transparent !important;
        border: none !important;
        border-top: 1px solid var(--viz-border-subtle) !important;
        list-style: none !important;
        display: block !important;
        padding: 0 !important;
        width: 100% !important;
        box-sizing: border-box !important;
    }
</style>
