<script lang="ts">
    import { dev } from "$app/environment";
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import hotkeys from "hotkeys-js";
    import { untrack } from "svelte";
    import Dropdown from "$lib/components/context-menus/Dropdown.svelte";
    import ThemeContextMenu from "$lib/components/context-menus/ThemeContextMenu.svelte";
    import { CLIENT_IS_PRODUCTION } from "$lib/constants";
    import { createWorkspaceViewsMenu } from "$lib/context-menu/menus/workspaceViews";
    import type { MenuItem } from "$lib/context-menu/types";
    import { performSearch } from "$lib/search/execute";
    import { eventsState } from "$lib/states/events.svelte";
    import { historyState } from "$lib/states/history.svelte";
    import { debugState, getTheme, isLayoutPage, isMobile, search, toggleTheme, user } from "$lib/states/index.svelte";
    import { toastState } from "$lib/toast-notifcations/notif-state.svelte";
    import { SUPPORTED_IMAGE_TYPES, SUPPORTED_RAW_FILES, type SupportedImageTypes } from "$lib/types/images";
    import UploadManager from "$lib/upload/manager.svelte";
    import OpenAccountPanel from "../context-menus/AccountPanel.svelte";
    import AppMenu from "../context-menus/AppMenu.svelte";
    import AvatarBadge from "./AvatarBadge.svelte";
    import IconButton from "./IconButton.svelte";
    import MaterialIcon from "./MaterialIcon.svelte";
    import SearchInput from "./SearchInput.svelte";

    let searchElement = $state<HTMLInputElement | undefined>();
    let searchInputHasFocus = $derived(searchElement && document.activeElement === searchElement);

    $effect(() => {
        if (page.url.pathname === "/search") {
            const q = page.url.searchParams.get("q");
            // Only update search.value if 'q' is present and different from current search.value
            // This prevents unnecessary updates and potential infinite loops if search.value also affects the URL
            if (q && q !== untrack(() => search.value)) {
                search.value = q;
            }
        }
    });

    // Ctrl/Cmd+I toggles dev mode
    hotkeys("ctrl+i, command+i", (e) => {
        e.preventDefault();
        debugState.toggle();
    });

    // Ctrl/Cmd+K toggles focus on the search input.
    hotkeys("ctrl+k, command+k", (e) => {
        e.preventDefault();
        if (!searchInputHasFocus) {
            searchElement?.focus();
        } else {
            searchElement?.blur();
        }
    });

    const uploadMenuItems: MenuItem[] = [
        {
            id: "upload-photos",
            label: "Upload Photos",
            icon: "photo_library",
            action: () => triggerUpload("photos")
        },
        {
            id: "upload-folder",
            label: "Upload Folder",
            icon: "folder_open",
            action: () => triggerUpload("folder")
        }
    ];

    async function triggerUpload(type: "photos" | "folder") {
        const manager = new UploadManager([...SUPPORTED_RAW_FILES, ...SUPPORTED_IMAGE_TYPES] as SupportedImageTypes[]);

        const uploadedImages =
            type === "photos" ? await manager.openPickerAndUpload() : await manager.openFolderPickerAndUpload();

        if (uploadedImages.length === 0) {
            return;
        }

        if (page.url.pathname !== "/") {
            toastState.addToast({
                title: "Upload Success",
                type: "success",
                message: `${uploadedImages.length} image(s) successfully uploaded`,
                actions: [
                    {
                        label: "Go to Photos",
                        onClick: () => goto("/")
                    }
                ]
            });
        }
    }

    let openAccPanel = $state(false);
    let openAppMenu = $state(false);
    let appMenuButton: HTMLButtonElement | undefined = $state();

    // Context Menu for Theme
    let themeCtxShowMenu = $state(false);
    let themeCtxAnchor = $state<{ x: number; y: number } | null>(null);

    function handleThemeContext(e: MouseEvent) {
        e.preventDefault();
        themeCtxAnchor = { x: e.clientX, y: e.clientY };
        themeCtxShowMenu = true;
    }

    // Context Menu for Views
    let viewCtxShowMenu = $state(false);
    let viewCtxAnchor = $state<{ x: number; y: number } | null>(null);
</script>

<svelte:window
    onkeydown={(e) => {
        if (e.key !== "Escape") {
            return;
        }

        if (searchInputHasFocus) {
            console.log("Escape key pressed, blurring search input");
            searchElement?.blur();
            return;
        }

        if (openAccPanel) {
            openAccPanel = false;
        }

        if (openAppMenu) {
            openAppMenu = false;
        }
    }}
    onclick={(e) => {
        if (openAccPanel && !(e.target as HTMLElement).closest("#account-container")) {
            openAccPanel = false;
        }
    }}
/>

<header class="no-select">
    <div id="left-menu-container">
        <button
            bind:this={appMenuButton}
            id="viz-title"
            onclick={() => (openAppMenu = !openAppMenu)}
            aria-label="App Menu"
            title="App Menu"
        >
            viz
            <MaterialIcon iconName="expand_more" weight={300} size="1em" style="margin-left: 0.15em;" />
        </button>
        <AppMenu bind:isOpen={openAppMenu} bind:anchor={appMenuButton} />
        <div class="header-separator menu"></div>
        {#if isLayoutPage()}
            <Dropdown icon="view_quilt" items={createWorkspaceViewsMenu()} />
        {:else}
            <IconButton
                class="header-button"
                iconName="space_dashboard"
                title="Go to Workspace"
                onclick={() => goto("/")}
            />
        {/if}
        <div class="header-separator"></div>
        <div class="icon-group-container">
            <a class="page-nav-btn" href="/photos">
                <IconButton class="header-button" iconName="imagesmode" title="Go to Photos" />
            </a>
            <a class="page-nav-btn" href="/collections">
                <IconButton class="header-button" iconName="photo_album" title="Go to Collections" />
            </a>
        </div>
    </div>
    <div class="center-container">
        <IconButton
            class="header-button"
            iconName="arrow_back"
            title="Go Back"
            disabled={!historyState.canGoBack}
            onclick={() => history.back()}
        />
        <IconButton
            class="header-button"
            iconName="arrow_forward"
            title="Go Forward"
            disabled={!historyState.canGoForward}
            onclick={() => history.forward()}
        />
        <div class="header-separator"></div>
        <SearchInput
            inputId="header-search"
            placeholder="Search{!isMobile ? ' (Ctrl/Cmd + K)' : ''}"
            bind:searchInputHasFocus
            bind:loading={search.loading}
            bind:value={search.value}
            bind:element={searchElement}
            {performSearch}
            style="width: 100%;"
        />
    </div>
    <div class="header-button-container">
        {#if eventsState.initialized && !eventsState.connected}
            <div class="offline-badge" title="Server Offline (WebSocket Disconnected)">
                <span class="offline-dot"></span>
                <span>Offline</span>
            </div>
        {/if}
        <IconButton
            weight={300}
            iconName={getTheme() === "dark" ? "dark_mode" : "light_mode"}
            id="theme-toggle"
            class="header-button theme-toggle"
            title="Toggle theme (Right-click to set default)"
            aria-label="Toggle Theme"
            onclick={() => toggleTheme()}
            oncontextmenu={handleThemeContext}
        />
        <Dropdown
            class="header-button header-upload-dropdown"
            icon="upload"
            variant="success"
            title="Upload"
            items={uploadMenuItems}
            showSelectionIndicator={false}
            align="right"
            hideTitle={isMobile}
        />
        {#if dev || !CLIENT_IS_PRODUCTION}
            <IconButton
                iconName="bug_report"
                id="debug-button"
                class="header-button"
                aria-label="Toggle Debug Mode"
                onclick={() => debugState.toggle()}
                title="Toggle Debug Mode"
            >
                <span class="debug-mode-text">{debugState.value ? "ON" : "OFF"}</span>
            </IconButton>
        {/if}
        <div id="account-container">
            <button
                id="account-button"
                aria-label="Account"
                onclick={() => (openAccPanel = !openAccPanel)}
                title={user.data?.name ? `${user.data.name} (${user.data.email})` : "Account"}
            >
                <AvatarBadge size="2rem" />
            </button>
            {#if openAccPanel}
                <OpenAccountPanel bind:openAccPanel />
            {/if}
        </div>
    </div>
</header>
<ThemeContextMenu bind:showMenu={themeCtxShowMenu} bind:anchor={themeCtxAnchor} />

<style lang="scss">
    header {
        background-color: var(--viz-surface-base);
        height: var(--viz-header-height);
        padding: 0 var(--viz-spacing-md);
        display: flex;
        align-items: center;
        border-bottom: var(--viz-border-thin);
        /* I'm sure I can get used to it */
        border-color: var(--viz-secondary);
        position: relative;
        justify-content: space-between;
        flex-direction: row;
        box-sizing: border-box;
    }

    #viz-title {
        font-family: var(--viz-mono-font);
        font-weight: 700;
        font-size: var(--viz-font-size-xl);
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-xxs);
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        color: var(--viz-text-primary);
        cursor: pointer;
        padding: var(--viz-spacing-xxs) 0;
        border-radius: 0;
        transition: border-color 150ms ease;

        &:hover {
            background-color: transparent;
            border-bottom-color: var(--viz-primary);
        }

        &:active {
            background-color: transparent;
            border-bottom-color: var(--viz-primary);
        }
    }

    #left-menu-container {
        border-radius: var(--viz-border-radius-sm);
        z-index: 300;
        gap: var(--viz-spacing-sm);
        height: 100%;
        display: flex;
        flex-direction: row;
        align-items: center;
    }

    .header-separator {
        background-color: var(--viz-border-subtle);
        height: 50%;
        width: 1px;

        &.menu {
            background-color: var(--viz-accent);
        }
    }

    .icon-group-container {
        gap: var(--viz-spacing-xs);
        display: flex;
        flex-direction: row;
    }

    .page-nav-btn {
        display: flex;
        justify-content: center;
        align-items: center;
        text-decoration: none;
    }

    .center-container {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--viz-spacing-sm);
        width: 30%;
        height: 100%;
    }

    #account-container {
        position: relative;
    }

    #account-button {
        height: 2rem;
        width: 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--viz-border-radius-pill);
        border: var(--viz-border-thin);
        border-color: var(--viz-border-subtle);
        background-color: var(--viz-surface-panel);
        cursor: pointer;
        outline: none;
        transition:
            background-color 150ms ease,
            border-color 150ms ease;

        &:hover {
            background-color: var(--viz-surface-hover);
            border-color: var(--viz-text-secondary);
        }

        &:focus-visible {
            box-shadow:
                0 0 0 2px var(--viz-surface-base),
                0 0 0 4px var(--viz-primary);
        }
    }

    .header-button-container {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-std);
    }

    .debug-mode-text {
        margin-right: 0.4em;
        font-family: var(--viz-mono-font);
        font-weight: 500;
        font-size: 1em;
    }

    .offline-badge {
        display: inline-flex;
        align-items: center;
        gap: var(--viz-spacing-xs);
        background-color: transparent;
        border: var(--viz-border-thin);
        border-color: var(--viz-error-color);
        color: var(--viz-error-color);
        padding: var(--viz-spacing-xxs) var(--viz-spacing-xs);
        border-radius: var(--viz-border-radius-sm);
        font-size: var(--viz-font-size-std);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        line-height: 1;
        user-select: none;
    }

    .offline-dot {
        width: 6px;
        height: 6px;
        background-color: var(--viz-error-color);
        border-radius: var(--viz-border-radius-pill);
        display: inline-block;
        animation: offline-pulse 1.5s infinite ease-in-out;
    }

    @keyframes offline-pulse {
        0% {
            opacity: 0.4;
        }
        50% {
            opacity: 1;
        }
        100% {
            opacity: 0.4;
        }
    }

    @media (max-width: 40rem) {
        header {
            padding: 0 var(--viz-spacing-sm);
        }

        #left-menu-container {
            gap: var(--viz-spacing-xs);
        }

        .center-container {
            flex: 1;
            width: auto;
            padding: 0 var(--viz-spacing-sm);

            :global(.header-button:nth-child(1)),
            :global(.header-button:nth-child(2)),
            :global(.header-separator) {
                display: none;
            }
        }

        :global(#debug-button),
        :global(#theme-toggle) {
            display: none;
        }

        .icon-group-container {
            display: none;
        }

        #left-menu-container > :global(.header-separator),
        #left-menu-container > :global(.header-button) {
            display: none;
        }

        .header-button-container {
            gap: var(--viz-spacing-xs);
        }
    }
</style>
