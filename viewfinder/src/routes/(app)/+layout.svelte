<script lang="ts">
    import "$lib/components/panels/viz-panel.scss";
    import Header from "$lib/components/ui/Header.svelte";
    import DownloadPanel from "$lib/components/ui/panels/DownloadPanel.svelte";
    import UploadPanel from "$lib/components/ui/panels/UploadPanel.svelte";
    import DragTooltipOverlay from "$lib/drag-drop/DragTooltipOverlay.svelte";
    import { dragCoordinator } from "$lib/drag-drop/coordinator.svelte";
    import { download, upload } from "$lib/states/index.svelte";

    let { children } = $props();

    function handleWindowDragOver(e: DragEvent) {
        if (e.dataTransfer?.types.includes("Files")) {
            e.preventDefault();
        }
    }

    function handleWindowDrop(e: DragEvent) {
        if (e.dataTransfer?.types.includes("Files")) {
            e.preventDefault();
        }
    }
</script>

<svelte:window ondragover={handleWindowDragOver} ondrop={handleWindowDrop} />

<div class="viz-app-layout" role="presentation">
    <Header />
    <main id="main" class="viz-content" tabindex="-1">
        {@render children()}
    </main>
    {#if upload.files.length > 0}
        <UploadPanel />
    {/if}
    {#if download.files.length > 0}
        <DownloadPanel />
    {/if}
    {#if dragCoordinator.isDragging && dragCoordinator.session}
        <DragTooltipOverlay />
    {/if}
</div>

<style lang="scss">
    .viz-app-layout {
        display: flex;
        flex-direction: column;
        height: 100vh;
        height: 100dvh;
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
