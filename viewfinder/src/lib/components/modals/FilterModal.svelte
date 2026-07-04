<script module>
    import type { ModalOptions } from "$lib/components/modals/manager/ModalManager.svelte";

    export const FilterModalOptions: ModalOptions = {
        heading: "Filter Images",
        applyPadding: false
    };
</script>

<script lang="ts">
    import FilterPanel from "../panels/workspace/FilterPanel.svelte";
</script>

<div class="filter-modal-content">
    <FilterPanel />
</div>

<style lang="scss">
    .filter-modal-content {
        width: 100%;
        height: 80vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }
</style>
