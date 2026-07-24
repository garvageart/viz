<script lang="ts">
    import CollectionFilter from "$lib/components/filters/CollectionFilter.svelte";
    import ImageFilter from "$lib/components/filters/ImageFilter.svelte";
    import IconButton from "$lib/components/ui/IconButton.svelte";
    import { filterManager } from "$lib/states/filter.svelte";

    const imageScope = filterManager.getScope("images");
    const collectionScope = filterManager.getScope("collections");
</script>

<div class="filter-panel-container">
    <div class="filter-panel">
        {#if filterManager.activeScopeType === "collections" && collectionScope}
            <CollectionFilter
                bind:criteria={collectionScope.criteria}
                facets={collectionScope.facets}
                bind:uiState={collectionScope.uiState}
                save={() => filterManager.save()}
            />
        {:else if filterManager.activeScopeType === "images" && imageScope}
            <ImageFilter
                bind:criteria={imageScope.criteria}
                facets={imageScope.facets}
                bind:uiState={imageScope.uiState}
                save={() => filterManager.save()}
            />
        {/if}
    </div>
    <div class="filter-panel-footer">
        <div class="filter-actions">
            <IconButton
                iconName={filterManager.keepFilters ? "keep" : "keep_off"}
                variant="mini"
                title="Keep Filters while browsing"
                style={filterManager.keepFilters ? "background-color: var(--viz-surface-hover);" : ""}
                onclick={() => filterManager.toggleKeepFilters()}
            />
            <IconButton
                iconName="layers_clear"
                variant="mini"
                onclick={() => filterManager.resetActiveScope(true)}
                title="Clear all active filters"
            />
        </div>
    </div>
</div>

<style lang="scss">
    .filter-panel-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        background-color: var(--viz-surface-base);
    }

    .filter-panel {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow-y: scroll;
        overflow-x: hidden;
        padding: var(--viz-spacing-sm);
        color: var(--viz-text-primary);
        position: relative;
    }

    .filter-panel-footer {
        border-top: 1px solid var(--viz-surface-hover);
        position: relative;
    }

    .filter-actions {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        padding: var(--viz-spacing-sm);
        background-color: var(--viz-surface-base);
        gap: var(--viz-spacing-sm);
        width: 100%;
    }
</style>
