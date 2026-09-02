<script lang="ts">
    import { slide } from "svelte/transition";
    import { logoutUser } from "$lib/auth/auth_methods";
    import { contextMenu } from "$lib/context-menu";
    import { themeContextMenu } from "$lib/context-menu/menus/theme";
    import { getTheme, toggleTheme, user } from "$lib/states/index.svelte";
    import AvatarBadge from "../ui/AvatarBadge.svelte";
    import Badge from "../ui/Badge.svelte";
    import Button from "../ui/Button.svelte";
    import MaterialIcon from "../ui/MaterialIcon.svelte";

    let { openAccPanel = $bindable(false) }: { openAccPanel: boolean } = $props();

    let panelEl = $state<HTMLElement | null>(null);

    function handleClickOutside(event: MouseEvent) {
        if (panelEl && !panelEl.contains(event.target as Node)) {
            const accBtn = document.getElementById("account-button");
            if (accBtn && accBtn.contains(event.target as Node)) {
                return;
            }
            openAccPanel = false;
        }
    }

    function handleThemeContext(e: MouseEvent) {
        contextMenu.open(themeContextMenu(), e, { align: "right", offsetY: 4 });
    }
</script>

<svelte:window onpointerdown={handleClickOutside} />

<div id="account-details-panel" bind:this={panelEl} in:slide={{ duration: 100 }} out:slide={{ duration: 100 }}>
    <!-- User Profile Header -->
    <div class="user-header">
        <AvatarBadge size="3rem" />
        <div class="user-info">
            <span class="user-name">{user.data?.name || "Guest User"}</span>
            <span class="user-email">{user.data?.email || "No email"}</span>
            {#if user.isAdmin}
                <Badge variant="info" iconName="shield" iconSize="0.9rem">Admin</Badge>
            {:else}
                <Badge variant="neutral">User</Badge>
            {/if}
        </div>
    </div>

    <div class="divider"></div>

    <!-- Menu Items -->
    <div class="menu-list">
        <a href="/settings" class="menu-item" onclick={() => (openAccPanel = false)}>
            <div class="menu-icon">
                <MaterialIcon iconName="settings" size="1.3rem" />
            </div>
            <div class="menu-text">
                <span class="title">Settings</span>
            </div>
        </a>

        <div class="mobile-theme-toggle">
            <button class="menu-item" onclick={() => toggleTheme()} oncontextmenu={handleThemeContext}>
                <div class="menu-icon">
                    <MaterialIcon iconName={getTheme() === "dark" ? "dark_mode" : "light_mode"} size="1.3rem" />
                </div>
                <div class="menu-text">
                    <span class="title">Toggle Theme</span>
                    <span class="subtitle">Hold for options</span>
                </div>
            </button>
        </div>

        {#if user.isAdmin}
            <a href="/admin" class="menu-item" onclick={() => (openAccPanel = false)}>
                <div class="menu-icon">
                    <MaterialIcon iconName="admin_panel_settings" size="1.4rem" />
                </div>
                <div class="menu-text">
                    <span class="title">Admin Dashboard</span>
                </div>
            </a>
        {/if}
    </div>

    <div class="divider"></div>

    <!-- Footer Logout -->
    <div class="logout-container">
        <Button
            variant="danger"
            class="logout-btn"
            iconName="logout"
            onclick={() => {
                openAccPanel = false;
                logoutUser();
            }}
        >
            <span>Log Out</span>
        </Button>
    </div>
</div>

<style lang="scss">
    #account-details-panel {
        display: flex;
        flex-direction: column;
        position: absolute;
        top: calc(100% + var(--viz-spacing-sm));
        right: 0;
        z-index: 500;
        width: 20rem;
        background-color: var(--viz-surface-panel);
        border: 1px solid var(--viz-border-subtle);
        border-radius: var(--viz-border-radius-lg);
        box-shadow:
            0 16px 40px rgba(0, 0, 0, 0.35),
            0 4px 12px rgba(0, 0, 0, 0.15);
        padding: var(--viz-spacing-std);
        gap: var(--viz-spacing-sm);
        box-sizing: border-box;
    }

    .user-header {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-md);
        padding: var(--viz-spacing-xs) 0;
    }

    .user-info {
        display: flex;
        flex-direction: column;
        min-width: 0;
        gap: 3px;
    }

    .user-name {
        font-weight: 700;
        font-size: var(--viz-font-size-lg);
        color: var(--viz-text-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .user-email {
        font-size: var(--viz-font-size-std);
        color: var(--viz-text-secondary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .divider {
        height: 1px;
        background-color: var(--viz-border-strong, var(--viz-border-subtle));
        margin: var(--viz-spacing-xxs) 0;
    }

    .menu-list {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xs);
    }

    .menu-item {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-std);
        padding: var(--viz-spacing-sm) var(--viz-spacing-md);
        border-radius: var(--viz-border-radius-md);
        text-decoration: none;
        color: var(--viz-text-primary);
        background-color: var(--viz-surface-panel);
        border: 1px solid var(--viz-border-subtle);
        width: 100%;
        text-align: left;
        cursor: pointer;
        box-sizing: border-box;
        transition: all 150ms ease;

        &:hover {
            background-color: var(--viz-surface-hover);
            border-color: var(--viz-border-strong);
        }
    }

    .menu-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--viz-text-primary);
        min-width: 1.5rem;
    }

    .menu-text {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;

        .title {
            font-weight: 600;
            font-size: var(--viz-font-size-lg);
            color: var(--viz-text-primary);
        }
    }

    .logout-container {
        padding-top: var(--viz-spacing-xxs);

        :global(.logout-btn) {
            width: 100%;
            font-weight: 700;
            letter-spacing: 0.03em;
        }
    }

    .mobile-theme-toggle {
        display: none;
    }

    .subtitle {
        font-size: var(--viz-font-size-xs);
        color: var(--viz-text-muted);
    }

    @media (max-width: 40rem) {
        .mobile-theme-toggle {
            display: block;
        }
    }
</style>
