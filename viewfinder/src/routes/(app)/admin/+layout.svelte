<script lang="ts">
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import NavSidebar, { type NavItem } from "$lib/components/ui/Sidebar/NavSidebar.svelte";
    import { user } from "$lib/states/index.svelte";
    import { toastState } from "$lib/toast-notifcations/notif-state.svelte";

    const adminNavItems: NavItem[] = [
        { label: "Dashboard", href: "/admin", icon: "dashboard", exact: true },
        { label: "Users", href: "/admin/users", icon: "group" },
        { label: "Jobs", href: "/admin/jobs", icon: "compare_arrows" },
        { label: "Events", href: "/admin/events", icon: "hub" },
        { label: "Cache", href: "/admin/cache", icon: "memory" },
        { label: "Storage", href: "/admin/storage", icon: "hard_drive" }
    ];

    let { children } = $props();
    let authed = $state(false);

    onMount(() => {
        authed = !!user.data && (user.data.role === "admin" || user.data.role === "superadmin");
        if (!authed) {
            // Add a small delay before redirecting to allow the toast to be
            toastState.addToast({
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
        background-color: var(--viz-100);
    }

    .admin-content {
        flex: 1;
        overflow-y: auto;
        background-color: var(--viz-bg-color);
        display: flex;
        flex-direction: column;
    }
</style>
