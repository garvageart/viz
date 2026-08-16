<script lang="ts">
    import type { Snippet } from "svelte";
    import ContextMenu from "$lib/context-menu/ContextMenu.svelte";
    import type { MenuItem } from "$lib/context-menu/types";
    import type { MaterialSymbol } from "$lib/types/MaterialSymbol";
    import Button, { type ButtonVariant } from "../ui/Button.svelte";

    interface Props {
        id?: string;
        class?: string;
        /** Menu items to render directly in ContextMenu */
        items: MenuItem[];
        /** If provided, shows this id as the current selection and displays a check icon next to it in the menu */
        selectedItemId?: string;
        showMenu?: boolean;
        /** Button text when no selection (or for action menus that don't track selection) */
        title?: string;
        /** Icon to show on the button */
        iconName?: MaterialSymbol;
        /** Button variant */
        variant?: ButtonVariant;
        /** Called when an item is selected */
        onSelect?: (item: MenuItem) => void;
        /** If true, show check icons for selected item. Set to false for action menus. Default: true */
        showSelectionIndicator?: boolean;
        /** Horizontal alignment of the menu relative to the button: 'left' or 'right' */
        align?: "left" | "right";
        /** Debug: forward to ContextMenu to render overlays and logs */
        debug?: boolean;
        /** Custom trigger button snippet. Receives toggle function, open state, and title. */
        trigger?: Snippet<
            [
                {
                    toggle: () => void;
                    showMenu: boolean;
                    title: string | undefined;
                }
            ]
        >;
        /** Hide the button title text (icon-only mode) */
        hideTitle?: boolean;
    }

    let {
        id,
        items,
        selectedItemId = $bindable(),
        showMenu = $bindable(false),
        title,
        iconName: icon,
        variant = "primary",
        onSelect,
        showSelectionIndicator = true,
        align = "left",
        debug = false,
        class: className,
        trigger,
        hideTitle = false
    }: Props = $props();

    let buttonEl: HTMLButtonElement | undefined = $state(undefined);
    let containerEl: HTMLElement | null = $state(null);

    // Derived selected item from items by id
    let selectedItem: MenuItem | undefined = $derived(items?.find((i) => i.id === selectedItemId));

    // Prefer an explicit dropdown icon prop for the button. If none is provided,
    // fall back to the selected item's icon.
    let currentIcon: MaterialSymbol | undefined = $derived(
        icon ?? (selectedItem?.iconName as MaterialSymbol | undefined)
    );

    let menuItems: MenuItem[] = $state([]);
    let hideTitleState = $derived(hideTitle || (!title && !(selectedItem && selectedItem.label)));

    function buildMenuItems(): MenuItem[] {
        return items.map((it) => ({
            ...it,
            iconName: it.iconName ?? (showSelectionIndicator && selectedItemId === it.id ? "check" : undefined),
            // wrap existing action so dropdown selection handling runs first
            action: (e) => handleItemSelect(it, e)
        }));
    }

    function handleItemSelect(item: MenuItem, e: MouseEvent | KeyboardEvent) {
        onSelect?.(item);
        if (showSelectionIndicator) {
            selectedItemId = item.id;
        }
        showMenu = false;
        if (!onSelect) {
            item.action?.(e);
        }
    }

    function toggleMenu() {
        menuItems = buildMenuItems();
        showMenu = !showMenu;
    }
</script>

<svelte:window
    onkeydown={(e) => {
        if (e.key === "Escape") {
            showMenu = false;
        }
    }}
    onclick={(e) => {
        if (!containerEl?.contains(e.target as Node)) {
            showMenu = false;
        }
    }}
    onresize={() => {
        /* ContextMenu handles collisions */
    }}
/>

{#snippet buttonContent()}
    {#if selectedItem && selectedItem.label}
        <span class="viz-dropdown-title">{selectedItem.label}</span>
    {:else if title}
        <span class="viz-dropdown-title">{title}</span>
    {/if}
{/snippet}

<div class="viz-dropdown-container" bind:this={containerEl}>
    {#if trigger}
        {@render trigger({ toggle: toggleMenu, showMenu, title })}
    {:else}
        <Button
            {id}
            {variant}
            iconName={currentIcon}
            class="viz-dropdown-button {className}"
            {title}
            bind:element={buttonEl}
            onclick={toggleMenu}
        >
            {#if !hideTitleState}
                {@render buttonContent()}
            {/if}
        </Button>
    {/if}

    <!-- Render menu without a positioned wrapper; ContextMenu uses fixed coords anchored to button -->
    <ContextMenu
        bind:showMenu
        items={menuItems}
        anchor={(buttonEl ?? containerEl) as HTMLElement}
        offsetY={0}
        {align}
        {debug}
    />
</div>

<style lang="scss">
    .viz-dropdown-container {
        position: relative;
        display: inline-block;
    }

    .viz-dropdown-title {
        margin: 0 var(--viz-spacing-xs);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    :global(.viz-dropdown-button) {
        display: flex;
        align-items: center;
        border-radius: var(--viz-border-radius-pill);
        white-space: nowrap;

        &:focus,
        &:active {
            background-color: var(--viz-surface-hover);
        }

        &:hover {
            background-color: var(--viz-surface-panel);
        }
    }
</style>
