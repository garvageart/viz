<script lang="ts">
    import { type Snippet } from "svelte";
    import { slide } from "svelte/transition";
    import Calendar from "$lib/components/ui/DatePicker.svelte";
    import type { ImageFacets, ImageFilters } from "$lib/states/filter.svelte";
    import { formatShutterSpeed } from "$lib/utils/images";
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

    async function scrollSectionIntoView(sectionEl?: HTMLElement | null) {
        if (sectionEl) {
            sectionEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
    }

    async function toggleSection(section: keyof typeof uiState.expanded, sectionEl?: HTMLElement | null) {
        uiState.expanded[section] = !uiState.expanded[section];
        save();

        if (!uiState.expanded[section] && sectionEl) {
            await scrollSectionIntoView(sectionEl);
        }
    }

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

{#snippet filterSection(key: keyof typeof uiState.expanded, title: string, content: Snippet)}
    {@const isExpanded = uiState.expanded[key]}
    <div class="filter-section">
        <button class="section-header" onclick={(e) => toggleSection(key, e.currentTarget.closest(".filter-section"))}>
            <span>{title}</span>
            <MaterialIcon iconName={isExpanded ? "keyboard_arrow_up" : "keyboard_arrow_down"} class="arrow-icon" />
        </button>
        {#if isExpanded}
            <div class="section-content" transition:slide={{ duration: 200 }}>
                {@render content()}
            </div>
        {/if}
    </div>
{/snippet}

<!-- Rating -->
{#snippet ratingContent()}
    <div class="rating-row">
        <span class="greater-than-symbol">≥</span>
        <StarRating
            value={criteria.rating}
            onChange={(r) => {
                criteria.rating = r;
                save();
            }}
        />
    </div>
{/snippet}
{@render filterSection("rating", "Rating", ratingContent)}

<!-- Labels -->
{#snippet labelsContent()}
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
{/snippet}
{@render filterSection("labels", "Labels", labelsContent)}

<!-- Tags -->
{#snippet tagsContent()}
    <ChecklistFacet
        title=""
        items={facets.tags}
        selected={criteria.tags}
        ontoggle={(_, el) => scrollSectionIntoView(el?.closest(".filter-section"))}
        onChange={(sel) => {
            criteria.tags = sel;
            save();
        }}
    />
{/snippet}
{@render filterSection("tags", "Keywords", tagsContent)}

<!-- Camera -->
{#snippet cameraContent()}
    <ChecklistFacet
        title="Cameras"
        items={facets.cameras}
        selected={criteria.camera}
        ontoggle={(_, el) => scrollSectionIntoView(el?.closest(".filter-section"))}
        onChange={(sel) => {
            criteria.camera = sel;
            save();
        }}
    />
{/snippet}
{@render filterSection("camera", "Camera", cameraContent)}

<!-- Lens -->
{#snippet lensContent()}
    <ChecklistFacet
        title="Lenses"
        items={facets.lenses}
        selected={criteria.lens}
        ontoggle={(_, el) => scrollSectionIntoView(el?.closest(".filter-section"))}
        onChange={(sel) => {
            criteria.lens = sel;
            save();
        }}
    />
{/snippet}
{@render filterSection("lens", "Lens", lensContent)}

<!-- Technical -->
{#snippet techContent()}
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
        unit="f"
        onChange={(v) => {
            criteria.fStop = v;
            save();
        }}
    />
    <RangeInput
        label="Shutter Speed"
        min={facets.shutterSpeed.min}
        max={facets.shutterSpeed.max}
        value={criteria.shutterSpeed}
        step={0.001}
        formatValue={formatShutterSpeed}
        invertDisplay={true}
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
{/snippet}
{@render filterSection("tech", "EXIF", techContent)}

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
{#snippet dateContent()}
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
{/snippet}
{@render filterSection("date", "Date Taken", dateContent)}

<style lang="scss">
    .filter-section {
        border-bottom: var(--viz-border-thin);

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
        padding: var(--viz-spacing-xxs);
        cursor: pointer;
        color: var(--viz-text-primary);
        font-weight: 600;
        font-size: var(--viz-font-size-std);
        text-align: left;
        transition: color 0.2s;

        &:hover {
            color: var(--viz-text-secondary);
            background-color: var(--viz-surface-panel);
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

        .greater-than-symbol {
            font-size: var(--viz-font-size-lg);
            font-weight: bold;
        }
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
        }
    }

    :global(.date-trigger) {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--viz-spacing-sm);
        width: 100%;
        background: var(--viz-surface-panel);
        box-shadow: 0 -1px 0 var(--viz-border-subtle) inset;
        color: var(--viz-text-secondary);
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
            color: var(--viz-text-primary);
            box-shadow: 0 -1px 0 var(--viz-primary) inset;
        }

        &:hover {
            box-shadow: 0 -2px 0 var(--viz-primary) inset;
            color: var(--viz-text-primary);
        }
    }

    :global(.date-clear-btn) {
        display: flex;
        align-items: center;
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        color: var(--viz-text-secondary);

        &:hover {
            color: var(--viz-text-primary);
        }
    }

    :global(.arrow-icon) {
        font-size: 1.2rem;
        color: var(--viz-primary);
    }
</style>
