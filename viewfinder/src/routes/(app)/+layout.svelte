<script lang="ts">
    import Header from "$lib/components/ui/Header.svelte";
    import UploadPanel from "$lib/components/ui/panels/UploadPanel.svelte";
    import DownloadPanel from "$lib/components/ui/panels/DownloadPanel.svelte";
    import { download, sortState, upload } from "$lib/states/index.svelte";
    import "$lib/components/panels/viz-panel.scss";
    import { registerReady } from "$lib/stores/appReady";
    import { loadRuntimeConfig } from "$lib/runtime-config";
    import { onMount, untrack } from "svelte";
    import { page } from "$app/state";
    import { invalidateViz } from "$lib/views/views.svelte";
    import { dev } from "$app/environment";

    let { children } = $props();

    $effect(() => {
        // Watch sort state for changes
        const { by, order } = sortState.value;
        sortState.save();

        if (dev) {
            console.log("Sort state changed:", by, order);
        }

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
