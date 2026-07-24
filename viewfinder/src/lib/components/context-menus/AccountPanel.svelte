<script lang="ts">
    import { slide } from "svelte/transition";
    import { logoutUser } from "$lib/auth/auth_methods";
    import { user } from "$lib/states/index.svelte";
    import Badge from "../ui/Badge.svelte";
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
</script>

<svelte:window onpointerdown={handleClickOutside} />

<div id="account-details-panel" bind:this={panelEl} in:slide={{ duration: 100 }} out:slide={{ duration: 100 }}>
    <!-- User Profile Header -->
    <div class="user-header">
        <div class="avatar-badge">
            <span>{user.data?.name ? user.data.name[0].toUpperCase() : "?"}</span>
        </div>
        <div class="user-info">
            <span class="user-name">{user.data?.name || "Guest User"}</span>
            <span class="user-email">{user.data?.email || "No email"}</span>
            {#if user.isAdmin}
                <Badge variant="neutral" iconName="shield" iconSize="0.9rem">Admin</Badge>
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
        <button
            class="logout-btn"
            onclick={() => {
                openAccPanel = false;
                logoutUser();
            }}
        >
            <MaterialIcon iconName="logout" size="1.2rem" />
            <span>Log Out</span>
        </button>
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
        background-color: var(--viz-bg-color);
        border: 1px solid var(--viz-70);
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

    .avatar-badge {
        width: 3rem;
        height: 3rem;
        border-radius: 50%;
        background-color: var(--viz-85);
        border: 1px solid var(--viz-70);
        color: var(--viz-text-color);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: var(--viz-font-size-2xl);
        flex-shrink: 0;
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
        color: var(--viz-text-color);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .user-email {
        font-size: var(--viz-font-size-std);
        color: var(--viz-30);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .divider {
        height: 1px;
        background-color: var(--viz-75);
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
        padding: var(--viz-spacing-sm);
        border-radius: var(--viz-border-radius-md);
        text-decoration: none;
        color: var(--viz-text-color);
        background: var(--viz-100);
        border: 1px solid var(--viz-90);
        width: 100%;
        text-align: left;
        cursor: pointer;
        box-sizing: border-box;
        transition: all 150ms ease;

        &:hover {
            background-color: var(--viz-95);
            border-color: var(--viz-75);
        }
    }

    .menu-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--viz-20);
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
            color: var(--viz-text-color);
        }
    }

    .logout-container {
        padding-top: var(--viz-spacing-xxs);
    }

    .logout-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--viz-spacing-sm);
        width: 100%;
        padding: var(--viz-spacing-sm) var(--viz-spacing-md);
        border: 1px solid color-mix(in srgb, var(--viz-error-color, #ef4444) 30%, var(--viz-75));
        background-color: color-mix(in srgb, var(--viz-error-color, #ef4444) 8%, var(--viz-95));
        color: var(--viz-error-color, #ef4444);
        font-size: var(--viz-font-size-lg);
        font-weight: 600;
        border-radius: var(--viz-border-radius-md);
        cursor: pointer;
        box-sizing: border-box;
        transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);

        &:hover {
            background-color: color-mix(in srgb, var(--viz-error-color, #ef4444) 16%, var(--viz-90));
            border-color: color-mix(in srgb, var(--viz-error-color, #ef4444) 50%, var(--viz-60));
        }

        &:active {
            background-color: color-mix(in srgb, var(--viz-error-color, #ef4444) 24%, var(--viz-85));
        }
    }
</style>
