<script lang="ts">
    import { dev } from "$app/environment";
    import { afterNavigate, beforeNavigate } from "$app/navigation";
    import { page, updated } from "$app/state";
    import "@fontsource-variable/geist/index.css";
    import "@fontsource-variable/manrope/index.css";
    import "@fontsource-variable/roboto-mono/index.css";
    import hotkeys from "hotkeys-js";
    import ModalRenderer from "$lib/components/modals/ModalContainer.svelte";
    import { modalsManager } from "$lib/components/modals/manager/ModalManager.svelte";
    import "$lib/components/tooltips/tooltip.scss";
    import NavigationProgressBar from "$lib/components/ui/NavigationProgressBar.svelte";
    import ContextMenu from "$lib/context-menu/ContextMenu.svelte";
    import { eventsState } from "$lib/states/events.svelte";
    import { historyState } from "$lib/states/history.svelte";
    import { debugState, themeState, upload, user } from "$lib/states/index.svelte";
    import { loadingState } from "$lib/states/loading.svelte";
    import "$lib/stores/appReady";
    import "$lib/styles/scss/main.scss";
    import Notifications from "$lib/toast-notifcations/Notifications.svelte";
    import { UploadState } from "$lib/upload/asset.svelte";
    import { toggleFullscreen } from "$lib/utils/misc";

    if (dev) {
        import("material-symbols/index.css");
    }

    historyState.init();

    $effect(() => {
        if (user.data) {
            eventsState.init();
        } else {
            eventsState.destroy();
        }
    });

    function handleBeforeUnload(e: BeforeUnloadEvent) {
        const hasActiveUploads = upload.files.some(
            (file) => file.state === UploadState.STARTED || file.state === UploadState.PENDING
        );
        if (hasActiveUploads) {
            e.preventDefault();
        }
    }

    window.___viewfinderConfig = {
        environment: dev ? "dev" : "prod",
        version: __APP_VERSION__
    };

    let { children } = $props();

    $effect(() => {
        const themeScript = document.getElementById("theme-ready-script");
        if (themeScript) {
            themeScript.remove();
        }
    });

    $effect(() => {
        const handlePreloadError = (e: Event) => {
            e.preventDefault();
            window.location.reload();
        };
        window.addEventListener("vite:preloadError", handlePreloadError);
        return () => {
            window.removeEventListener("vite:preloadError", handlePreloadError);
        };
    });

    $effect(() => {
        debugState.storage.set(debugState.value);
    });

    $effect(() => {
        themeState.ls.set(themeState.value);
        document.documentElement.setAttribute("data-theme", themeState.resolved);
    });

    hotkeys("shift+f", (e) => {
        e.preventDefault();
        toggleFullscreen();
    });

    beforeNavigate(({ to, willUnload }) => {
        loadingState.startNavigation();
        if (updated.current && !willUnload && to) {
            location.href = to.url.href;
        }
    });

    afterNavigate(() => {
        loadingState.endNavigation();
    });
</script>

<svelte:window onbeforeunload={handleBeforeUnload} />

<a href="#main" class="skip-to-main" aria-label="Skip to main content"> Skip to main content </a>

{@render children()}
<Notifications />
<ModalRenderer />
<ContextMenu />

{#if loadingState.isNavigating}
    <div
        class="nav-progress-container"
        class:app={!page.url.pathname.startsWith("/auth") && modalsManager.modals.length === 0}
    >
        <NavigationProgressBar />
    </div>
{/if}

<style lang="scss">
    .skip-to-main {
        position: absolute;
        top: -20rem;
        left: 50%;
        transform: translateX(-50%);
        background: var(--viz-secondary);
        color: var(--viz-text-color-light);
        padding: var(--viz-spacing-std) var(--viz-spacing-xxl);
        border: var(--viz-border-thin);
        border-top: none;
        font-weight: 600;
        font-size: var(--viz-font-size-md);
        z-index: 10000;
        text-decoration: none;
        transition: top 0.2s cubic-bezier(0, 0, 0.2, 1);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);

        &:focus,
        &:focus-visible {
            top: 0;
            outline: 3px solid var(--viz-accent);
            outline-offset: -3px;
        }
    }

    .nav-progress-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        z-index: var(--viz-z-chrome);
        pointer-events: none;

        &.app {
            top: var(--viz-header-height, 2rem);
        }
    }
</style>
