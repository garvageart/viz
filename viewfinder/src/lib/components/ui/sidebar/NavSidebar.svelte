<script lang="ts" module>
    import type { MaterialSymbol } from "$lib/types/MaterialSymbol";

    export interface NavItem {
        label: string;
        href: string;
        iconName?: MaterialSymbol;
        exact?: boolean;
    }
</script>

<script lang="ts">
    import { page } from "$app/state";
    import MaterialIcon from "../MaterialIcon.svelte";
    import Sidebar from "./Sidebar.svelte";

    interface Props {
        title?: string;
        width?: string;
        items: NavItem[];
    }

    let { title, width = "15%", items }: Props = $props();

    function isActive(href: string, exact = false) {
        const pathname = page.url.pathname;
        const normPath = pathname.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
        const normHref = href.endsWith("/") && href.length > 1 ? href.slice(0, -1) : href;

        if (exact) {
            return normPath === normHref;
        }
        return normPath.startsWith(normHref);
    }
</script>

<Sidebar {width} {title}>
    <div class="nav-sidebar-content">
        <nav class="nav-sidebar-menu" data-sveltekit-preload-data="hover" data-sveltekit-preload-code="hover">
            <ul class="nav-list">
                {#each items as item}
                    <li>
                        <a href={item.href} class={["nav-link", isActive(item.href, item.exact) ? "active" : ""]}>
                            {#if item.iconName}
                                <MaterialIcon iconName={item.iconName} size="1.5rem" />
                            {/if}
                            <span>{item.label}</span>
                        </a>
                    </li>
                {/each}
            </ul>
        </nav>
    </div>
</Sidebar>

<style lang="scss">
    .nav-sidebar-content {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 1rem 0;
        width: 100%;
    }

    .nav-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0;
        width: 100%;
    }

    .nav-link {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-sm);
        padding: var(--viz-spacing-xs) var(--viz-spacing-md);
        color: var(--viz-text-secondary);
        text-decoration: none;
        font-size: var(--viz-font-size-lg);
        border-bottom: 2px solid transparent;
        white-space: nowrap;
        transition:
            background-color 0.15s ease,
            color 0.15s ease,
            border-bottom-color 0.15s ease;

        &:hover {
            background-color: var(--viz-surface-hover);
            color: var(--viz-text-primary);
            border-bottom-color: var(--viz-primary-hover);
        }

        &.active {
            background-color: var(--viz-surface-hover);
            color: var(--viz-text-primary);
            font-weight: 600;
            border-bottom: 3px solid var(--viz-primary);
        }
    }
</style>
