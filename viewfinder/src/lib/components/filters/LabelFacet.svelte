<script lang="ts">
    import { LabelColours } from "$lib/images/constants";
    import type { ImageFacets, ImageFilters } from "$lib/states/filter.svelte";
    import Checkbox from "../ui/Checkbox.svelte";

    interface Props {
        criteria: ImageFilters;
        facets: ImageFacets;
        onChange: (label: string) => void;
    }

    let { criteria = $bindable(), facets, onChange }: Props = $props();

    function toggleLabel(label: string) {
        onChange(label);
    }

    function getLabelName(hex: string): string {
        const entry = Object.entries(LabelColours).find(([_, colour]) => colour === hex);
        return entry ? entry[0] : "";
    }

    let sortedLabels = $derived(
        Array.from(facets.labels.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([value, count]) => ({ value, count }))
    );
</script>

<div class="label-list">
    {#each sortedLabels as item (item.value)}
        <div class="label-item">
            <div class="label-row">
                <Checkbox
                    checked={criteria.label === item.value}
                    onchange={() => {
                        toggleLabel(item.value);
                    }}
                />
                <div class="color-indicator" style="background-color: {item.value}"></div>
                <span class="label-name">{getLabelName(item.value)}</span>
            </div>
            <span class="count">({item.count})</span>
        </div>
    {/each}

    {#if sortedLabels.length === 0}
        <div class="empty">No labels found</div>
    {/if}
</div>

<style lang="scss">
    .label-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .label-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: var(--viz-60);
        cursor: pointer;

        .label-row {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .label-name {
            color: var(--viz-text-color);
        }
    }

    .color-indicator {
        width: 1em;
        height: 1em;
        border: 1px solid var(--viz-60);
    }

    .count {
        font-size: 1rem;
        opacity: 0.7;
        margin-left: 8px;
    }

    .empty {
        font-style: italic;
        opacity: 0.6;
        color: var(--viz-60);
    }
</style>
