<script lang="ts">
    import { page } from "$app/state";
    import { onMount, untrack } from "svelte";
    import "$lib/components/panels/viz-panel.scss";
    import Header from "$lib/components/ui/Header.svelte";
    import DownloadPanel from "$lib/components/ui/panels/DownloadPanel.svelte";
    import UploadPanel from "$lib/components/ui/panels/UploadPanel.svelte";
    import { loadRuntimeConfig } from "$lib/runtime-config";
    import { debugMode, download, sortState, upload } from "$lib/states/index.svelte";
    import { registerReady } from "$lib/stores/appReady";
    import { invalidateViz } from "$lib/views/views.svelte";

    let { children } = $props();

    $effect(() => {
        // Watch sort state for changes
        const { by, order } = sortState.value;
        sortState.save();

        if (debugMode) {
            console.log("Sort state changed:", by, order);
        }

        // I forgot why the fuck this was put here
        untrack(() => {
            invalidateViz();
        });
    });

    // Fetch runtime config early and have the app wait for it before marking ready
    if (typeof window !== "undefined") {
        onMount(() => {
            const p = loadRuntimeConfig();
            registerReady(p);
            p.finally(() => {
                // warn if still using localhost fallback (client exports this helper)
                import("$lib/api")
                    .then((m) => {
                        try {
                            m.warnIfLocalhostFallback();
                        } catch (e) {}
                    })
                    .catch(() => {});
            });
        });
    }
</script>

<div class="viz-app-layout">
    <Header />
    {#if upload.files.length > 0}
        <UploadPanel />
    {/if}
    {#if download.files.length > 0}
        <DownloadPanel />
    {/if}
    <main class="viz-content">
        {#key page.url.href}
            {@render children()}
        {/key}
    </main>
</div>

<style>
    .viz-app-layout {
        display: flex;
        flex-direction: column;
        height: 100vh;
        width: 100vw;
        overflow: hidden;
        position: relative;
    }

    .viz-content {
        display: flex;
        flex: 1;
        overflow: hidden;
        width: 100%;
        position: relative;
    }
</style>
