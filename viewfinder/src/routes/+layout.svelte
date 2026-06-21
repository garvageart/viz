<script lang="ts">
    import { dev } from "$app/environment";
    import { afterNavigate, beforeNavigate } from "$app/navigation";

    if (dev) {
        import("material-symbols/index.css");
    }

    import { page } from "$app/state";
    import ModalRenderer from "$lib/components/modals/ModalContainer.svelte";
    import { modalsManager } from "$lib/components/modals/manager/ModalManager.svelte";
    import NavigationProgressBar from "$lib/components/ui/NavigationProgressBar.svelte";
    import { eventsState } from "$lib/states/events.svelte";
    import { historyState } from "$lib/states/history.svelte";
    import { debugState, themeState, user } from "$lib/states/index.svelte";
    import { loadingState } from "$lib/states/loading.svelte";
    import "$lib/stores/appReady";
    import "$lib/styles/scss/main.scss";
    import Notifications from "$lib/toast-notifcations/Notifications.svelte";
    import { toggleFullscreen } from "$lib/utils/misc";
    import "@fontsource-variable/geist/index.css";
    import "@fontsource-variable/manrope/index.css";
    import "@fontsource-variable/roboto-mono/index.css";
    import hotkeys from "hotkeys-js";

    historyState.init();

    $effect(() => {
        if (user.data) {
            eventsState.init();
        } else {
            eventsState.destroy();
        }
    });

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
        debugState.storage.set(debugState.value);
    });

    $effect(() => {
        themeState.ls.set(themeState.value);
        if (typeof document !== "undefined") {
            document.documentElement.setAttribute("data-theme", themeState.resolved);
        }
    });

    hotkeys("shift+f", (e) => {
        e.preventDefault();
        toggleFullscreen();
    });

    let showNavProgress = $state(false);

    beforeNavigate(() => {
        showNavProgress = true;
        loadingState.startNavigation();
    });

    afterNavigate(() => {
        showNavProgress = false;
        loadingState.endNavigation();
    });
</script>

{@render children()}
<Notifications />
<ModalRenderer />

{#if showNavProgress}
    <div
        class="nav-progress-container"
        class:app={!page.url.pathname.startsWith("/auth") && modalsManager.modals.length === 0}
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
