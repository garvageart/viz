<script lang="ts">
    import { onMount } from "svelte";
    import { IS_MOBILE_VIEWPORT } from "$lib/constants";
    import IconButton from "../IconButton.svelte";

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

    onMount(() => {
        if (IS_MOBILE_VIEWPORT) {
            open = false;
        }
    });
</script>

<nav
    bind:this={sidebarEl}
    class="viz-sidebar"
    class:open
    style:width={sidebarWidthState}
    style:min-width={sidebarWidthState}
    style:max-width={sidebarWidthState}
>
    <div class="sidebar-header" class:closed={!open}>
        {#if open}
            <IconButton
                iconName="arrow_menu_close"
                title="Collapse Sidebar"
                onclick={() => (open = !open)}
                variant="small"
                class="sidebar-toggle-btn"
            ></IconButton>
            {#if title}
                <h3 class="sidebar-heading">{title}</h3>
            {/if}
        {:else}
            <div style:display="inline-flex">
                <IconButton
                    iconName="arrow_menu_open"
                    title="Expand Sidebar"
                    onclick={() => (open = true)}
                    variant="small"
                    class="sidebar-toggle-btn open-btn"
                ></IconButton>
            </div>
        {/if}
    </div>
    {#if open}
        <div class="sidebar-content">
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
        overflow-x: hidden;
        overflow-y: auto;
        box-sizing: border-box;
        white-space: nowrap;
    }

    :global(.sidebar-toggle-btn) {
        color: var(--viz-text-muted) !important;
        &:hover {
            background-color: var(--viz-surface-panel) !important;
        }
    }

    @media (max-width: 40rem) {
        .viz-sidebar.open {
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            z-index: 1000;
            width: 100% !important;
            min-width: 100% !important;
            max-width: 100% !important;
            box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3);
        }
    }
</style>
