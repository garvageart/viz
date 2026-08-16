<script lang="ts">
    import Button from "$lib/components/ui/Button.svelte";
    import Checkbox from "$lib/components/ui/Checkbox.svelte";

    interface Props {
        title: string;
        items: Map<string, number>; // Value -> Count
        selected: string[];
        onChange: (selected: string[]) => void;
    }

    let { items, selected, onChange }: Props = $props();

    let searchTerm = $state("");
    let isExpanded = $state(false);

    // Convert map to array and sort by count desc
    let sortedItems = $derived(
        Array.from(items.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([value, count]) => ({ value, count }))
    );

    let filteredItems = $derived(
        sortedItems.filter((item) => item.value.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    let displayItems = $derived(isExpanded ? filteredItems : filteredItems.slice(0, 5));

    function toggle(value: string) {
        if (selected.includes(value)) {
            onChange(selected.filter((s) => s !== value));
        } else {
            onChange([...selected, value]);
        }
    }
</script>

<div class="facet-container">
    <div class="facet-list">
        {#each displayItems as item (item.value)}
            <div class="facet-item">
                <Checkbox
                    label={item.value}
                    checked={selected.includes(item.value)}
                    onchange={() => toggle(item.value)}
                />
                <span class="count">({item.count})</span>
            </div>
        {/each}

        {#if filteredItems.length === 0}
            <span class="empty">No items found</span>
        {/if}
    </div>

    {#if filteredItems.length > 5}
        <Button size="mini" class="more-btn" onclick={() => (isExpanded = !isExpanded)}>
            {isExpanded ? "Show Less" : `Show All (${filteredItems.length})`}
        </Button>
    {/if}
</div>

<style lang="scss">
    .facet-container {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .facet-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .facet-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 1rem;
        color: var(--viz-text-secondary);

        /* Align checkbox properly */
        :global(.checkbox-wrapper) {
            flex: 1;
            min-width: 0; /* allows text truncation if needed */
        }

        :global(.label-text) {
            font-size: 1rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
    }

    .count {
        margin-left: 8px;
    }

    .empty {
        font-style: italic;
        color: var(--viz-text-secondary);
    }

    /* Override Button styling to look like a link or simple toggle */
    :global(.more-btn) {
        background-color: transparent !important;
        color: var(--viz-info-color) !important;
        padding: 0 !important;
        align-self: flex-start;
        height: auto !important;
        margin-top: 4px;

        &:hover {
            text-decoration: underline;
        }
    }
</style>
