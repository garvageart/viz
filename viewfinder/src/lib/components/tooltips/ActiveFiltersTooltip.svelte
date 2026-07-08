<script lang="ts">
    import { filterManager } from "$lib/states/filter.svelte";
    import { LabelColours } from "$lib/images/constants";
    import type { ImageFilters } from "$lib/states/filter.svelte";

    const scope = $derived(filterManager.activeScope);
    const criteria = $derived(scope && scope.type === "images" ? (scope.criteria as ImageFilters) : null);

    // Dynamic helper list containing only active filters to keep layout logic simple
    interface ActiveFilterItem {
        label: string;
        value: string;
        color?: string;
    }

    function formatSS(v: number | undefined): string {
        if (v === undefined) {
            return "*";
        }

        return v < 1 ? `1/${Math.round(1 / v)}s` : `${v}s`;
    }

    function formatRange(min: number | undefined, max: number | undefined, unit = ""): string {
        return `${min ?? "*"} - ${max ?? "*"}${unit}`;
    }

    let activeItems = $derived.by<ActiveFilterItem[]>(() => {
        if (!criteria) {
            return [];
        }

        const items: ActiveFilterItem[] = [];

        if (criteria.rating !== null) {
            items.push({
                label: "Rating",
                value: "★".repeat(criteria.rating) + "☆".repeat(5 - criteria.rating)
            });
        }

        if (criteria.label !== null) {
            items.push({
                label: "Label",
                value: criteria.label,
                color: LabelColours[criteria.label as keyof typeof LabelColours]
            });
        }

        if (criteria.tags?.length > 0) {
            items.push({ label: "Keywords", value: criteria.tags.join(", ") });
        }

        if (criteria.camera?.length > 0) {
            items.push({ label: "Camera", value: criteria.camera.join(", ") });
        }

        if (criteria.lens?.length > 0) {
            items.push({ label: "Lens", value: criteria.lens.join(", ") });
        }

        if (criteria.date?.after || criteria.date?.before) {
            items.push({
                label: "Date",
                value:
                    criteria.date.after && criteria.date.before
                        ? `${criteria.date.after} to ${criteria.date.before}`
                        : criteria.date.after
                          ? `After ${criteria.date.after}`
                          : `Before ${criteria.date.before}`
            });
        }

        if (criteria.iso?.min !== undefined || criteria.iso?.max !== undefined) {
            items.push({ label: "ISO", value: formatRange(criteria.iso.min, criteria.iso.max) });
        }

        if (criteria.fStop?.min !== undefined || criteria.fStop?.max !== undefined) {
            items.push({
                label: "Aperture",
                value: formatRange(criteria.fStop.min, criteria.fStop.max, " ƒ").replace("-", "- ƒ")
            });
        }

        if (criteria.shutterSpeed?.min !== undefined || criteria.shutterSpeed?.max !== undefined) {
            items.push({
                label: "Shutter",
                value: `${formatSS(criteria.shutterSpeed.min)} - ${formatSS(criteria.shutterSpeed.max)}`
            });
        }

        if (criteria.focalLength?.min !== undefined || criteria.focalLength?.max !== undefined) {
            items.push({
                label: "Focal Length",
                value: formatRange(criteria.focalLength.min, criteria.focalLength.max, "mm")
            });
        }

        return items;
    });
</script>

<div class="active-filters-tooltip">
    {#if activeItems.length === 0}
        <div class="no-filters-msg">No active filters applied</div>
    {:else}
        <div class="tooltip-header">Active Filters</div>
        <div class="filter-list">
            {#each activeItems as item}
                <div class="filter-item">
                    <span class="filter-label">{item.label}</span>
                    <span class="filter-value" class:label-pill={!!item.color}>
                        {#if item.color}
                            <span class="color-dot" style:background-color={item.color}></span>
                        {/if}
                        {item.value}
                    </span>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style lang="scss">
    .active-filters-tooltip {
        text-align: left;
        padding: var(--viz-spacing-xxs);
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xs);
    }

    .no-filters-msg {
        color: var(--viz-40);
        font-style: italic;
    }

    .tooltip-header {
        font-weight: 700;
        border-bottom: 1px solid var(--viz-80);
        padding-bottom: var(--viz-spacing-xs);
        margin-bottom: var(--viz-spacing-xxs);
    }

    .filter-list {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xxs);
    }

    .filter-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--viz-spacing-md);
        font-size: var(--viz-font-size-lg);
    }

    .filter-label {
        color: var(--viz-40);
        font-weight: 500;
    }

    .filter-value {
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 10rem;
    }

    .label-pill {
        display: inline-flex;
        align-items: center;
        gap: var(--viz-spacing-xs);
    }

    .color-dot {
        display: inline-block;
        width: var(--viz-font-size-lg);
        height: var(--viz-font-size-lg);
        border-radius: var(--viz-border-radius-pill);
    }
</style>
