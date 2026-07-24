<script lang="ts">
    import { slide } from "svelte/transition";
    import IconButton from "../IconButton.svelte";
    import IconLeftPanelCloseCustom from "../icons/IconLeftPanelCloseCustom.svelte";
    import IconLeftPanelOpenCustom from "../icons/IconLeftPanelOpenCustom.svelte";

    interface Props {
        open?: boolean;
        children?: import("svelte").Snippet;
        title?: string;
        width?: string;
    }

    let {
        open = $bindable(true),
        title,
        width: sidebarWidth = "var(--viz-sidebar-width-expanded)",
        children
    }: Props = $props();

    let sidebarEl: HTMLElement;
    let sidebarWidthState = $derived(open ? sidebarWidth : "var(--viz-sidebar-width-collapsed)");
</script>

<nav
    bind:this={sidebarEl}
    class="viz-sidebar"
    style:width={sidebarWidthState}
    style:min-width={sidebarWidthState}
    style:max-width={sidebarWidthState}
>
    <div class="sidebar-header" class:closed={!open}>
        {#if open}
            <IconButton
                title="Collapse Sidebar"
                onclick={() => (open = !open)}
                variant="small"
                class="sidebar-toggle-btn"
            >
                <IconLeftPanelCloseCustom size="1.25em" />
            </IconButton>
            {#if title}
                <h3 class="sidebar-heading">{title}</h3>
            {/if}
        {:else}
            <div out:slide={{ axis: "x", duration: 300 }} style:display="inline-flex">
                <IconButton
                    title="Expand Sidebar"
                    onclick={() => (open = true)}
                    variant="small"
                    class="sidebar-toggle-btn open-btn"
                >
                    <IconLeftPanelOpenCustom size="1.25em" />
                </IconButton>
            </div>
        {/if}
    </div>
    {#if open}
        <div class="sidebar-content" transition:slide={{ axis: "x", duration: 300 }}>
            {@render children?.()}
        </div>
    {/if}
</nav>

<style lang="scss">
    .viz-sidebar {
        background-color: var(--viz-sidebar-bg, var(--viz-surface-panel));
        border-right: var(--viz-border-thin);
        height: 100%;
        display: flex;
        flex-direction: column;
        position: relative;
        transition:
            width 0.3s ease,
            min-width 0.3s ease,
            max-width 0.3s ease;
        box-sizing: border-box;
    }

    .sidebar-header {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        border-bottom: var(--viz-border-thin);
        padding: var(--viz-spacing-sm) var(--viz-spacing-md);
        gap: var(--viz-spacing-sm);
        height: var(--viz-header-height);
        box-sizing: border-box;
        transition: border-bottom 0.3s ease;

        &.closed {
            border-bottom: none;
            justify-content: center;
            padding: var(--viz-spacing-sm) 0;
        }
    }

    .sidebar-heading {
        font-family: var(--viz-display-font);
        font-size: var(--viz-font-size-lg);
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--viz-text-secondary);
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .sidebar-content {
        width: 100%;
        height: calc(100% - var(--viz-header-height));
        overflow-y: auto;
        box-sizing: border-box;
    }

    :global(.sidebar-toggle-btn) {
        color: var(--viz-text-muted) !important;
        &:hover {
            background-color: var(--viz-surface-panel) !important;
        }
    }

    :global(.sidebar-toggle-btn.open-btn) {
        width: 80%;
        margin: 0 auto;
    }
</style>
