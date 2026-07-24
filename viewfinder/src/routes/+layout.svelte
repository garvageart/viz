<script lang="ts">
    import { dev } from "$app/environment";
    import { afterNavigate, beforeNavigate } from "$app/navigation";
    import { page } from "$app/state";
    import { updated } from "$app/stores";
    import "@fontsource-variable/geist/index.css";
    import "@fontsource-variable/manrope/index.css";
    import "@fontsource-variable/roboto-mono/index.css";
    import hotkeys from "hotkeys-js";
    import { fade } from "svelte/transition";
    import ModalRenderer from "$lib/components/modals/ModalContainer.svelte";
    import { modalsManager } from "$lib/components/modals/manager/ModalManager.svelte";
    import "$lib/components/tooltips/tooltip.scss";
    import NavigationProgressBar from "$lib/components/ui/NavigationProgressBar.svelte";
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
        if ($updated && !willUnload && to) {
            location.href = to.url.href;
        }
    });

    afterNavigate(() => {
        loadingState.endNavigation();
    });
</script>

<svelte:window onbeforeunload={handleBeforeUnload} />

{@render children()}
<Notifications />
<ModalRenderer />

{#if loadingState.isNavigating}
    <div
        class="nav-progress-container"
        class:app={!page.url.pathname.startsWith("/auth") && modalsManager.modals.length === 0}
        transition:fade={{ duration: 400 }}
    >
        <NavigationProgressBar />
    </div>
{/if}

<style lang="scss">
    .nav-progress-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        z-index: 9000;
        pointer-events: none;

        &.app {
            top: var(--viz-header-height, 2rem);
        }
    }
</style>
