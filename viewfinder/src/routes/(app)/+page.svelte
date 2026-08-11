<script lang="ts">
    import VizWorkspace from "$lib/components/workspace/VizWorkspace.svelte";
</script>

<svelte:head>
    <title>viz</title>
</svelte:head>

<div class="viz-content-container">
    <VizWorkspace id="viz-content" />
</div>

<style lang="scss">
    .viz-content-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        height: 100%;
        overflow: auto;
    }
</style>
