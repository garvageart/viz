<script module>
    export function toggleSection(
        section: keyof typeof uiState.expanded,
        uiState: { expanded: Record<string, boolean> },
        save: () => void
    ) {
        uiState.expanded[section] = !uiState.expanded[section];
        save();
    }
</script>

<script lang="ts">
    import Calendar from "$lib/components/ui/Calendar.svelte";
    import type { ImageFacets, ImageFilters } from "$lib/states/filter.svelte";
    import { slide } from "svelte/transition";
    import StarRating from "../image-tools/StarRating.svelte";
    import MaterialIcon from "../ui/MaterialIcon.svelte";
    import ChecklistFacet from "./ChecklistFacet.svelte";
    import LabelFacet from "./LabelFacet.svelte";
    import RangeInput from "./RangeInput.svelte";

    interface Props {
        criteria: ImageFilters;
        facets: ImageFacets;
        uiState: { expanded: Record<string, boolean> };
        save: () => void;
    }

    let { criteria = $bindable(), facets, uiState = $bindable(), save }: Props = $props();

    // Convert an ISO date string from criteria to a JS Date for the Calendar.
    // Falls back to today when absent.
    function isoToDate(iso: string | undefined): Date {
        return iso ? new Date(iso) : new Date();
    }

    // Convert a JS Date from Calendar back to an ISO date-only string (YYYY-MM-DD)
    // used by the filter criteria.
    function dateToIso(d: Date): string {
        return d.toISOString().slice(0, 10);
    }

    // Derive the locale's date format as a placeholder string, e.g. "DD/MM/YYYY".
    // Uses a sample date with distinct day/month/year values so field order and
    // separators are detected correctly for any locale.
    function getLocaleDatePlaceholder(): string {
        const sample = new Date(2024, 10, 23); // Nov 23, 2024 — all parts distinct
        return new Intl.DateTimeFormat(undefined, {
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        })
            .formatToParts(sample)
            .map(({ type, value }) => {
                if (type === "year") {
                    return "YYYY";
                }
                if (type === "month") {
                    return "MM";
                }
                if (type === "day") {
                    return "DD";
                }
                return value;
            })
            .join("");
    }

    // Format a criteria ISO string for display in the calendar trigger button.
    function formatCriteriaDate(iso: string | undefined): string {
        if (!iso) {
            return getLocaleDatePlaceholder();
        }

        return new Date(iso).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }
</script>

<!-- Rating -->
<div class="filter-section">
    <button class="section-header" onclick={() => toggleSection("rating", uiState, save)}>
        <span>Rating</span>
        <MaterialIcon
            iconName={uiState.expanded.rating ? "keyboard_arrow_up" : "keyboard_arrow_down"}
            class="arrow-icon"
        />
    </button>
    {#if uiState.expanded.rating}
        <div class="section-content" transition:slide={{ duration: 200 }}>
            <div class="rating-row">
                <span>≥</span>
                <StarRating
                    value={criteria.rating}
                    onChange={(r) => {
                        criteria.rating = r;
                        save();
                    }}
                />
            </div>
        </div>
    {/if}
</div>

<!-- Labels -->
<div class="filter-section">
    <button class="section-header" onclick={() => toggleSection("labels", uiState, save)}>
        <span>Labels</span>
        <MaterialIcon
            iconName={uiState.expanded.labels ? "keyboard_arrow_up" : "keyboard_arrow_down"}
            class="arrow-icon"
        />
    </button>
    {#if uiState.expanded.labels}
        <div class="section-content" transition:slide={{ duration: 200 }}>
            <LabelFacet
                {criteria}
                {facets}
                onChange={(label) => {
                    if (criteria.label === label) {
                        criteria.label = null;
                    } else {
                        criteria.label = label;
                    }
                }}
            />
        </div>
    {/if}
</div>

<!-- Tags -->
<div class="filter-section">
    <button class="section-header" onclick={() => toggleSection("tags", uiState, save)}>
        <span>Keywords</span>
        <MaterialIcon
            iconName={uiState.expanded.tags ? "keyboard_arrow_up" : "keyboard_arrow_down"}
            class="arrow-icon"
        />
    </button>
    {#if uiState.expanded.tags}
        <div class="section-content" transition:slide={{ duration: 200 }}>
            <ChecklistFacet
                title=""
                items={facets.tags}
                selected={criteria.tags}
                onChange={(sel) => {
                    criteria.tags = sel;
                    save();
                }}
            />
        </div>
    {/if}
</div>

<!-- Camera -->
<div class="filter-section">
    <button class="section-header" onclick={() => toggleSection("camera", uiState, save)}>
        <span>Camera</span>
        <MaterialIcon
            iconName={uiState.expanded.camera ? "keyboard_arrow_up" : "keyboard_arrow_down"}
            class="arrow-icon"
        />
    </button>
    {#if uiState.expanded.camera}
        <div class="section-content" transition:slide={{ duration: 200 }}>
            <ChecklistFacet
                title=""
                items={facets.cameras}
                selected={criteria.camera}
                onChange={(sel) => {
                    criteria.camera = sel;
                    save();
                }}
            />
        </div>
    {/if}
</div>

<!-- Lens -->
<div class="filter-section">
    <button class="section-header" onclick={() => toggleSection("lens", uiState, save)}>
        <span>Lens</span>
        <MaterialIcon
            iconName={uiState.expanded.lens ? "keyboard_arrow_up" : "keyboard_arrow_down"}
            class="arrow-icon"
        />
    </button>
    {#if uiState.expanded.lens}
        <div class="section-content" transition:slide={{ duration: 200 }}>
            <ChecklistFacet
                title=""
                items={facets.lenses}
                selected={criteria.lens}
                onChange={(sel) => {
                    criteria.lens = sel;
                    save();
                }}
            />
        </div>
    {/if}
</div>

<!-- Technical -->
<div class="filter-section">
    <button class="section-header" onclick={() => toggleSection("tech", uiState, save)}>
        <span>EXIF</span>
        <MaterialIcon
            iconName={uiState.expanded.tech ? "keyboard_arrow_up" : "keyboard_arrow_down"}
            class="arrow-icon"
        />
    </button>
    {#if uiState.expanded.tech}
        <div class="section-content" transition:slide={{ duration: 200 }}>
            <RangeInput
                label="ISO"
                min={facets.iso.min}
                max={facets.iso.max}
                value={criteria.iso}
                onChange={(v) => {
                    criteria.iso = v;
                    save();
                }}
            />
            <RangeInput
                label="Aperture"
                min={facets.fStop.min}
                max={facets.fStop.max}
                value={criteria.fStop}
                step={0.1}
                unit="ƒ"
                onChange={(v) => {
                    criteria.fStop = v;
                    save();
                }}
            />
            <RangeInput
                label="Shutter Speed"
                min={parseFloat(facets.shutterSpeed.min.toFixed(4))}
                max={parseFloat(facets.shutterSpeed.max.toFixed(4))}
                value={criteria.shutterSpeed}
                step={0.001}
                unit="s"
                onChange={(v) => {
                    criteria.shutterSpeed = v;
                    save();
                }}
            />
            <RangeInput
                label="Focal Length"
                min={facets.focalLength.min}
                max={facets.focalLength.max}
                value={criteria.focalLength}
                unit="mm"
                onChange={(v) => {
                    criteria.focalLength = v;
                    save();
                }}
            />
        </div>
    {/if}
</div>

{#snippet dateField(label: string, value: string | undefined, onChange: (d: Date) => void, onClear: () => void)}
    <div class="date-field">
        <span class="label">{label}</span>
        <Calendar value={isoToDate(value)} showTime={false} align="start" onchange={onChange}>
            {#snippet children()}
                <div class="date-trigger" class:active={!!value}>
                    <div class="date-meta">
                        <MaterialIcon iconName="calendar_today" size="1rem" />
                        <span>{formatCriteriaDate(value)}</span>
                    </div>
                    {#if value}
                        <span
                            class="date-clear-btn"
                            role="button"
                            tabindex="0"
                            title="Clear"
                            onclick={(e) => {
                                e.stopPropagation();
                                onClear();
                            }}
                            onkeydown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.stopPropagation();
                                    onClear();
                                }
                            }}
                        >
                            <MaterialIcon iconName="close" size="0.9rem" />
                        </span>
                    {/if}
                </div>
            {/snippet}
        </Calendar>
    </div>
{/snippet}

<!-- Date -->
<div class="filter-section">
    <button class="section-header" onclick={() => toggleSection("date", uiState, save)}>
        <span>Date Taken</span>
        <MaterialIcon
            iconName={uiState.expanded.date ? "keyboard_arrow_up" : "keyboard_arrow_down"}
            class="arrow-icon"
        />
    </button>
    {#if uiState.expanded.date}
        <div class="section-content" transition:slide={{ duration: 200 }}>
            <div class="date-inputs">
                {@render dateField(
                    "After",
                    criteria.date.after,
                    (d) => {
                        criteria.date.after = dateToIso(d);
                        save();
                    },
                    () => {
                        criteria.date.after = undefined;
                        save();
                    }
                )}
                {@render dateField(
                    "Before",
                    criteria.date.before,
                    (d) => {
                        criteria.date.before = dateToIso(d);
                        save();
                    },
                    () => {
                        criteria.date.before = undefined;
                        save();
                    }
                )}
            </div>
        </div>
    {/if}
</div>

<style lang="scss">
    .filter-section {
        border-bottom: 1px solid var(--viz-80);

        &:last-child {
            border-bottom: none;
        }
    }

    .section-header {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: transparent;
        border: none;
        padding: 0.2rem;
        cursor: pointer;
        color: var(--viz-text-color);
        font-weight: 600;
        font-size: var(--viz-font-size-std);
        text-align: left;
        transition: color 0.2s;

        &:hover {
            color: var(--viz-20);
            background-color: var(--viz-90);
        }
    }

    .section-content {
        padding: 0.5rem 0;
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-sm);
    }

    .rating-row {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-sm);
        font-size: var(--viz-font-size-std);
    }

    .date-inputs {
        display: flex;
        flex-direction: row;
        width: 100%;
        gap: var(--viz-spacing-sm);
    }

    .date-field {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-xs);
        width: 100%;

        .label {
            font-size: var(--viz-font-size-std);
            color: var(--viz-60);
        }
    }

    :global(.date-trigger) {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--viz-spacing-sm);
        width: 100%;
        background: var(--viz-100);
        box-shadow: 0 -1px 0 var(--viz-60) inset;
        color: var(--viz-40);
        padding: var(--viz-spacing-sm) var(--viz-spacing-sm);
        font-family: var(--viz-display-font);
        font-size: var(--viz-font-size-std);
        text-wrap: nowrap;
        cursor: pointer;
        transition:
            box-shadow 0.15s,
            color 0.15s;

        .date-meta {
            display: flex;
            align-items: center;
            gap: 0.25rem;
        }

        &.active {
            color: var(--viz-text-color);
            box-shadow: 0 -1px 0 var(--viz-primary) inset;
        }

        &:hover {
            box-shadow: 0 -2px 0 var(--viz-primary) inset;
            color: var(--viz-text-color);
        }
    }

    :global(.date-clear-btn) {
        display: flex;
        align-items: center;
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        color: var(--viz-50);

        &:hover {
            color: var(--viz-text-color);
        }
    }

    :global(.arrow-icon) {
        font-size: 1.2rem;
        color: var(--viz-60);
    }
</style>
