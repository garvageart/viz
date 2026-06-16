<script lang="ts">
    import Sidebar from "$lib/components/ui/Sidebar.svelte";
    import { page } from "$app/state";

    const items = [
        { label: "Dashboard", href: "/admin", exact: true },
        { label: "Users", href: "/admin/users" },
        { label: "Jobs", href: "/admin/jobs" },
        { label: "Events", href: "/admin/events" },
        { label: "Cache", href: "/admin/cache" },
        { label: "Storage", href: "/admin/storage" }
    ];

    function isActive(href: string, exact = false) {
        if (exact) {
            return page.url.pathname === href;
        }

        return page.url.pathname.startsWith(href);
    }
</script>

<Sidebar width={"15%"} title="Admin">
    <div class="admin-nav-content">
        <nav
            class="admin-nav"
            data-sveltekit-preload-data="hover"
            data-sveltekit-preload-code="hover"
        >
            <ul class="nav-list">
                {#each items as item}
                    <li>
                        <a
                            href={item.href}
                            class={["nav-link", isActive(item.href, item.exact) ? "active" : ""]}
                        >
                            {item.label}
                        </a>
                    </li>
                {/each}
            </ul>
        </nav>
    </div>
</Sidebar>

<style lang="scss">
    .admin-nav-content {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 1rem 0;
    }

    .nav-list {
        list-style: none;
        padding: 0 0.5rem;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .nav-link {
        display: block;
        padding: 0.2rem 0.5rem;
        color: var(--viz-20);
        text-decoration: none;
        font-size: var(--viz-font-size-std);
        border-bottom: 2px solid transparent;

        &:hover {
            border-bottom: 2px solid var(--viz-primary);
        }

        &.active {
            background-color: var(--viz-90);
            border-bottom: 2px solid var(--viz-primary);
        }
    }
</style>
