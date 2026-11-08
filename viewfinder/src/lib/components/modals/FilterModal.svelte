<script lang="ts">
    import FilterPanel from "../panels/workspace/FilterPanel.svelte";
    import Modal from "./Modal.svelte";

    interface Props {
        id?: string;
    }

    let { id }: Props = $props();
</script>

<Modal {id} heading="Filter Images" iconName="filter_list" applyPadding={false}>
    <div class="filter-modal-content">
        <FilterPanel />
    </div>
</Modal>

<style lang="scss">
    .filter-modal-content {
        width: 100%;
        height: 80vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }
</style>
