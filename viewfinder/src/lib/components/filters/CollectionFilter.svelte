<script lang="ts">
    import type { CollectionFacets, CollectionFilters } from "$lib/states/filter.svelte";

    interface Props {
        criteria: CollectionFilters;
        facets: CollectionFacets;
        uiState: { expanded: Record<string, boolean> };
        save: () => void;
    }

    let { criteria = $bindable(), facets, uiState = $bindable(), save }: Props = $props();
</script>

<div class="collection-filter-container">
    <span class="placeholder-text">No collection-specific filters are available at this time.</span>
</div>

<style>
    .collection-filter-container {
        font-size: var(--viz-font-size-lg);
        padding: 1rem;
        color: var(--viz-border-subtle);
        font-style: italic;
        text-wrap: auto;
        text-align: center;
    }
</style>
