<script lang="ts">
    import Button from "$lib/components/ui/Button.svelte";
    import Checkbox from "$lib/components/ui/Checkbox.svelte";

    interface Props {
        title: string;
        items: Map<string, number>; // Value -> Count
        selected: string[];
        onChange: (selected: string[]) => void;
        ontoggle?: (isExpanded: boolean, el?: HTMLElement) => void;
    }

    let { items, selected, onChange, ontoggle }: Props = $props();

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

    function handleToggleMore(el?: HTMLElement) {
        isExpanded = !isExpanded;
        ontoggle?.(isExpanded, el);
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
        <Button class="more-btn" variant="secondary" size="mini" onclick={(e) => handleToggleMore(e.currentTarget)}>
            {isExpanded ? "Show Less" : `Show All (${filteredItems.length})`}
        </Button>
    {/if}
</div>

<style lang="scss">
    .facet-container {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-sm);
    }

    .facet-list {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xs);
    }

    .facet-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--viz-spacing-xs);
        color: var(--viz-text-secondary);

        /* Align checkbox properly */
        :global(.checkbox-wrapper) {
            flex: 1;
            min-width: 0; /* allows text truncation if needed */
        }

        :global(.label-text) {
            font-size: var(--viz-font-size-std);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
    }

    .count {
        margin: 0;
        font-size: var(--viz-font-size-sm);
        font-weight: bold;
        flex-shrink: 0;
    }

    .empty {
        font-style: italic;
        color: var(--viz-text-secondary);
    }

    :global(.more-btn) {
        &:hover {
            text-decoration: underline;
        }
    }
</style>
