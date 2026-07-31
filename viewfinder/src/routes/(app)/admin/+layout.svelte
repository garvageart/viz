<script lang="ts">
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import NavSidebar, { type NavItem } from "$lib/components/ui/Sidebar/NavSidebar.svelte";
    import { user } from "$lib/states/index.svelte";
    import { toasts } from "$lib/toast-notifcations/toasts.svelte";

    const adminNavItems: NavItem[] = [
        { label: "Dashboard", href: "/admin", iconName: "dashboard", exact: true },
        { label: "Users", href: "/admin/users", iconName: "group" },
        { label: "Jobs", href: "/admin/jobs", iconName: "compare_arrows" },
        { label: "Events", href: "/admin/events", iconName: "hub" },
        { label: "Cache", href: "/admin/cache", iconName: "memory" },
        { label: "Storage", href: "/admin/storage", iconName: "hard_drive" }
    ];

    let { children } = $props();
    let authed = $state(false);

    onMount(() => {
        authed = !!user.data && (user.data.role === "admin" || user.data.role === "superadmin");
        if (!authed) {
            // Add a small delay before redirecting to allow the toast to be
            toasts.add({
                message: "You do not have permission to access the admin panel.",
                type: "error"
            });
            goto("/");
        }
    });
</script>

{#if authed}
    <div class="admin-layout">
        <NavSidebar title="Admin" items={adminNavItems} />
        <main class="admin-content">
            {@render children()}
        </main>
    </div>
{/if}

<style lang="scss">
    .admin-layout {
        display: flex;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background-color: var(--viz-surface-panel);
    }

    .admin-content {
        flex: 1;
        overflow-y: auto;
        background-color: var(--viz-surface-base);
        display: flex;
        flex-direction: column;
    }
</style>
