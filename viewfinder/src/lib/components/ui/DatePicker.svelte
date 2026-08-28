<script lang="ts">
    import { CalendarDateTime, type DateValue } from "@internationalized/date";
    import { DatePicker } from "bits-ui";
    import hotkeys from "hotkeys-js";
    import { type Snippet, getContext, onMount } from "svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import InputSelect from "$lib/components/ui/InputSelect.svelte";
    import MaterialIcon from "$lib/components/ui/MaterialIcon.svelte";
    import TimeInputField from "$lib/components/ui/TimeInputField.svelte";
    import { ContextKeys } from "$lib/context-keys";
    import { localeState } from "$lib/states/locale.svelte";
    import { calendarDateTimeToDate, toCalendarDateTime } from "$lib/utils/dates";

    interface Props {
        value: Date;
        open?: boolean;
        showTime?: boolean;
        align?: "start" | "center" | "end";
        side?: "top" | "bottom" | "left" | "right";
        onchange?: (date: Date) => void;
        onclose?: () => void;
        children?: Snippet;
    }

    let {
        value = $bindable(),
        open = $bindable(false),
        showTime = true,
        align = "center",
        side = "bottom",
        onchange,
        onclose,
        children
    }: Props = $props();

    // When Calendar is rendered inside a modal, read its z-index from context so the
    // popover always appears on top. Falls back to 0 (CSS z-index handles it).
    const getModalZIndex = getContext<(() => number) | undefined>(ContextKeys.ModalZIndex);
    const popoverZIndex = $derived(getModalZIndex ? getModalZIndex() + 1 : 0);

    function getMsWithoutMs(d: Date): number {
        const copy = new Date(d);
        copy.setMilliseconds(0);
        return copy.getTime();
    }

    let selected = $state<CalendarDateTime>(toCalendarDateTime(value));
    let lastMs = getMsWithoutMs(value);
    let isDateSelecting = false;

    // Sync selected state only when the actual time value (in ms) changes from the parent,
    // avoiding resets on parent reference-only updates.
    $effect(() => {
        const currentMs = getMsWithoutMs(value);
        if (currentMs !== lastMs) {
            selected = toCalendarDateTime(value);
            lastMs = currentMs;
        }
    });

    function handleDateSelect(v: DateValue | undefined) {
        if (!v) {
            return;
        }

        isDateSelecting = true;

        if ("hour" in v) {
            selected = v as CalendarDateTime;
        } else {
            selected = new CalendarDateTime(v.year, v.month, v.day, selected.hour, selected.minute, selected.second);
        }
        lastMs = calendarDateTimeToDate(selected).getTime();

        emitDate();

        setTimeout(() => {
            isDateSelecting = false;
        }, 0);
    }

    function handleTimeSelect(v: CalendarDateTime | undefined) {
        if (!v) {
            return;
        }
        selected = v;
        lastMs = calendarDateTimeToDate(selected).getTime();
        emitDate();
    }

    function emitDate() {
        const jsDate = calendarDateTimeToDate(selected);
        jsDate.setMilliseconds(value.getMilliseconds());
        onchange?.(jsDate);
    }

    function closeCalendar() {
        open = false;
        onclose?.();
    }

    onMount(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (!open) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();
            closeCalendar();
        };

        hotkeys("esc, escape", "*", handleEsc);

        return () => {
            hotkeys.unbind("esc, escape", "*", handleEsc);
        };
    });

    function handleOpenChange(o: boolean) {
        if (!o && isDateSelecting && showTime) {
            open = true;
            return;
        }

        if (open && !o) {
            onclose?.();
        }

        open = o;
    }

    // Month and Year dropdown data
    const monthsOptions = Array.from({ length: 12 }, (_, i) => ({
        value: String(i + 1),
        label: new Date(0, i).toLocaleString(undefined, { month: "long" })
    }));

    const yearsOptions = Array.from({ length: 205 }, (_, i) => {
        const yr = 1900 + i;
        return { value: String(yr), label: String(yr) };
    });

    // Bind selected month/year to calendar date
    let selectedMonth = $derived(String(selected.month));
    let selectedYear = $derived(String(selected.year));

    let selectedMonthLabel = $derived(monthsOptions.find((opt) => opt.value === selectedMonth)!.label);
    let selectedYearLabel = $derived(yearsOptions.find((opt) => opt.value === selectedYear)!.label);

    // Returns the number of days in the given month of the given year.
    function daysInMonth(year: number, month: number): number {
        return new Date(year, month, 0).getDate();
    }

    function handleMonthChange(val: string) {
        const month = Number(val);
        // Clamp the day to the max valid day for the new month to avoid invalid dates
        // (e.g. selecting March when day is 30 or 31).
        const maxDay = daysInMonth(selected.year, month);
        const day = Math.min(selected.day, maxDay);

        selected = new CalendarDateTime(selected.year, month, day, selected.hour, selected.minute, selected.second);
        lastMs = calendarDateTimeToDate(selected).getTime();

        emitDate();
    }

    function handleYearChange(val: string) {
        const year = Number(val);
        // Clamp day for leap-year edge cases (e.g. Feb 29 in a non-leap year).
        const maxDay = daysInMonth(year, selected.month);
        const day = Math.min(selected.day, maxDay);

        selected = new CalendarDateTime(year, selected.month, day, selected.hour, selected.minute, selected.second);
        lastMs = calendarDateTimeToDate(selected).getTime();

        emitDate();
    }
</script>

<DatePicker.Root
    weekdayFormat="short"
    fixedWeeks={true}
    value={selected}
    onValueChange={handleDateSelect}
    bind:open
    onOpenChange={handleOpenChange}
    initialFocus={true}
    locale={localeState}
>
    {#if children}
        <DatePicker.Input class="cal-hidden-input">
            {#snippet children({ segments })}
                {#each segments as { part, value: segmentValue }, i (part + i)}
                    <DatePicker.Segment {part}>
                        {segmentValue}
                    </DatePicker.Segment>
                {/each}
            {/snippet}
        </DatePicker.Input>
        <DatePicker.Trigger class="calendar-trigger-slot">
            {@render children()}
        </DatePicker.Trigger>
    {:else}
        <DatePicker.Trigger class="calendar-trigger">
            <MaterialIcon iconName="edit_calendar" />
        </DatePicker.Trigger>
    {/if}
    <DatePicker.Portal>
        <DatePicker.Content
            sideOffset={6}
            class="calendar-popover"
            trapFocus={false}
            onFocusOutside={(e) => {
                e.preventDefault();
            }}
            onkeydown={(e) => {
                if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    closeCalendar();
                    return;
                }

                e.stopPropagation();
            }}
            style={popoverZIndex ? `z-index: ${popoverZIndex}` : undefined}
            {align}
            {side}
        >
            <div class="popover-top-bar">
                <div class="popover-header">
                    <MaterialIcon iconName="edit_calendar" />
                    <span class="popover-title">{showTime ? "Select Date & Time" : "Select Date"}</span>
                </div>
                <Button
                    iconName="close"
                    type="button"
                    class="popover-close-btn"
                    onclick={closeCalendar}
                    aria-label="Close"
                />
            </div>
            <DatePicker.Calendar>
                {#snippet children({ months, weekdays })}
                    <DatePicker.Header class="calendar-header">
                        <DatePicker.PrevButton class="calendar-nav-btn">
                            <MaterialIcon iconName="chevron_left" />
                        </DatePicker.PrevButton>
                        <div class="calendar-header-selects">
                            <InputSelect
                                class="calendar-select-trigger month"
                                contentAlign="end"
                                options={monthsOptions}
                                value={selectedMonth}
                                title={selectedMonthLabel}
                                onchange={handleMonthChange}
                            />
                            <InputSelect
                                class="calendar-select-trigger year"
                                contentAlign="end"
                                options={yearsOptions}
                                value={selectedYear}
                                title={selectedYearLabel}
                                onchange={handleYearChange}
                            />
                        </div>
                        <DatePicker.NextButton class="calendar-nav-btn">
                            <MaterialIcon iconName="chevron_right" />
                        </DatePicker.NextButton>
                    </DatePicker.Header>
                    <div class="calendar-grid-wrapper">
                        {#each months as month (month.value)}
                            <DatePicker.Grid class="calendar-grid">
                                <DatePicker.GridHead>
                                    <DatePicker.GridRow class="calendar-grid-row">
                                        {#each weekdays as day (day)}
                                            <DatePicker.HeadCell class="calendar-head-cell">
                                                {day.slice(0, 2)}
                                            </DatePicker.HeadCell>
                                        {/each}
                                    </DatePicker.GridRow>
                                </DatePicker.GridHead>
                                <DatePicker.GridBody>
                                    {#each month.weeks as weekDates (weekDates)}
                                        <DatePicker.GridRow class="calendar-grid-row">
                                            {#each weekDates as date (date)}
                                                <DatePicker.Cell {date} month={month.value} class="calendar-cell">
                                                    <DatePicker.Day class="calendar-day">
                                                        <span class="calendar-day-val">{date.day}</span>
                                                    </DatePicker.Day>
                                                </DatePicker.Cell>
                                            {/each}
                                        </DatePicker.GridRow>
                                    {/each}
                                </DatePicker.GridBody>
                            </DatePicker.Grid>
                        {/each}
                    </div>
                {/snippet}
            </DatePicker.Calendar>
            {#if showTime}
                <div class="time-picker-section">
                    <TimeInputField value={selected} onValueChange={handleTimeSelect} />
                </div>
            {/if}
        </DatePicker.Content>
    </DatePicker.Portal>
</DatePicker.Root>

<style lang="scss">
    .popover-top-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--viz-spacing-xs) var(--viz-spacing-sm);
        border-bottom: 1px solid var(--viz-surface-hover);
        margin-bottom: var(--viz-spacing-xs);
    }

    .popover-header {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-sm);
        color: var(--viz-text-secondary);
    }

    .popover-title {
        font-weight: 600;
    }

    :global(.popover-close-btn) {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        cursor: pointer;
        color: var(--viz-text-muted);
        padding: 0.2rem;
        border-radius: var(--viz-border-radius-sm);
        transition: all 120ms ease;

        &:hover {
            background: var(--viz-surface-hover);
            color: var(--viz-text-secondary);
        }
    }

    :global(.calendar-popover) {
        display: flex;
        flex-direction: column;
        padding: var(--viz-spacing-xs);
        /* Define a base cell size that can be overridden by the container */
        --calendar-cell-size: 1.6rem;
        border-radius: var(--viz-border-radius-md);
        background: var(--viz-surface-popover);
        border: 1px solid var(--viz-border-subtle);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        z-index: 10000;
    }

    :global([data-calendar-root]) {
        display: flex;
        flex-direction: column;
        gap: var(--viz-spacing-sm);
    }

    :global(.calendar-header) {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--viz-spacing-xs);
    }

    :global(.calendar-nav-btn) {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--viz-border-radius-sm);
        background: transparent;
        border: 1px solid transparent;
        color: var(--viz-text-secondary);
        cursor: pointer;
        transition: all 120ms ease;
    }

    :global(.calendar-nav-btn:hover) {
        background: var(--viz-surface-hover);
        border-color: var(--viz-border-subtle);
    }

    :global(.calendar-header-selects) {
        display: flex;
        align-items: center;
        gap: var(--viz-spacing-xs);
        flex: 1;
        justify-content: center;
        min-width: 0;

        :global(.input-container) {
            width: auto !important;
            flex: initial !important;
            gap: 0 !important;
        }

        :global(.input-wrapper) {
            width: auto !important;
        }
    }

    :global(.calendar-select-trigger) {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        min-height: 1.75rem !important;
        height: 1.75rem !important;
        padding: 0 var(--viz-spacing-xs) !important;
        font-size: var(--viz-font-size-std) !important;
        font-weight: 600 !important;
        color: var(--viz-text-primary) !important;
        background-color: var(--viz-surface-panel) !important;
        border: 1px solid var(--viz-surface-hover) !important;
        border-radius: var(--viz-border-radius-sm) !important;
        box-shadow: 0 -1px 0 var(--viz-primary) inset !important;

        &:hover {
            background-color: var(--viz-surface-hover) !important;
        }

        &:focus {
            border-color: var(--viz-primary) !important;
            box-shadow: 0 0 0 1px var(--viz-primary) !important;
        }
    }

    :global(.calendar-select-trigger.month) {
        width: 6.2rem !important;
    }

    :global(.calendar-select-trigger.year) {
        width: 4.5rem !important;
    }

    :global(.calendar-grid) {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0.5px;
    }

    :global(.calendar-grid-row) {
        display: flex;
        justify-content: space-between;
        width: 100%;
    }

    :global(.calendar-head-cell) {
        width: var(--calendar-cell-size);
        height: var(--calendar-cell-size);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.7rem;
        font-weight: 600;
        color: var(--viz-text-secondary);
        text-transform: uppercase;
        aspect-ratio: 1;
    }

    :global(.calendar-cell) {
        padding: 1px !important;
    }

    :global(.calendar-day) {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--calendar-cell-size);
        height: var(--calendar-cell-size);
        border-radius: var(--viz-border-radius-sm);
        border: 1.5px solid transparent;
        background: transparent;
        color: var(--viz-text-secondary);
        font-size: var(--viz-font-size-std);
        aspect-ratio: 1;
        font-weight: 400;
        cursor: pointer;
        transition: all 120ms ease;
    }

    :global(.calendar-day:hover) {
        background: color-mix(in srgb, var(--viz-primary) 12%, transparent);
        border-color: var(--viz-primary);
    }

    :global(.calendar-cell[data-selected]) :global(.calendar-day) {
        color: var(--viz-text-primary);
        font-weight: 600;
    }

    :global(.calendar-cell[data-today]) :global(.calendar-day) {
        color: var(--viz-text-primary);
        gap: var(--viz-spacing-xxs);
        border: 1.5px solid var(--viz-primary);
    }

    :global(.calendar-day:focus-visible) {
        outline: 2px solid var(--viz-primary);
        outline-offset: 1px;
    }

    :global(.calendar-cell[data-outside-month]) :global(.calendar-day) {
        color: var(--viz-border-subtle);
    }

    :global(.calendar-day-dot) {
        display: none;
        position: absolute;
        top: 2px;
        width: 3px;
        height: 3px;
        border-radius: var(--viz-border-radius-pill);
        background: var(--viz-primary);
        transition: all 120ms ease;
    }

    :global(.calendar-trigger-slot) {
        display: inline-flex;
        align-items: center;
        cursor: pointer;
        background: transparent;
        border: none;
        padding: 0;
        color: inherit;
        width: 100%;
        text-align: left;
        border-radius: var(--viz-border-radius-sm);

        &:focus-visible {
            outline: 2px solid var(--viz-primary);
            outline-offset: 2px;
        }
    }

    :global(.calendar-trigger) {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        cursor: pointer;
        color: var(--viz-text-muted);
        padding: 0.2rem;
        border-radius: var(--viz-border-radius-sm);
        transition: all 120ms ease;

        &:focus-visible {
            outline: 2px solid var(--viz-primary);
            outline-offset: 1px;
        }
    }

    :global(.calendar-trigger:hover) {
        background: var(--viz-surface-hover);
        color: var(--viz-text-secondary);
    }

    :global(.cal-hidden-input) {
        position: absolute;
        width: 0;
        height: 0;
        opacity: 0;
        pointer-events: none;
    }

    @media (max-width: 40rem) {
        :global(.calendar-popover) {
            --calendar-cell-size: 2.4rem;
            width: 95vw;
            max-width: none;
            padding: var(--viz-spacing-sm);
        }

        :global(.calendar-day) {
            font-size: var(--viz-font-size-lg);
        }

        :global(.calendar-head-cell) {
            font-size: var(--viz-font-size-sm);
        }

        :global(.calendar-select-trigger) {
            min-height: 2.25rem !important;
            height: 2.25rem !important;
            font-size: var(--viz-font-size-lg) !important;
        }

        :global(.calendar-select-trigger.month) {
            width: 7.5rem !important;
        }

        :global(.calendar-select-trigger.year) {
            width: 5.5rem !important;
        }

        :global(.time-input) {
            font-size: var(--viz-font-size-xl);
            padding: var(--viz-spacing-sm);
        }

        :global(.time-segment) {
            padding: var(--viz-spacing-xs) var(--viz-spacing-sm);
        }
    }
</style>
