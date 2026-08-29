<script lang="ts" generics="T extends Record<string, any>">
    import { type Snippet } from "svelte";
    import type { MouseEventHandler } from "svelte/elements";
    import Dropdown from "$lib/components/context-menus/Dropdown.svelte";
    import ContextMenu from "$lib/context-menu/ContextMenu.svelte";
    import type { MenuItem } from "$lib/context-menu/types";
    import { tryParseDate } from "$lib/utils/dates";
    import { VizLocalStorage } from "$lib/utils/misc";
    import Button from "./Button.svelte";
    import Checkbox from "./Checkbox.svelte";
    import MaterialIcon from "./MaterialIcon.svelte";

    export interface TableColumnState {
        key: string;
        visible: boolean;
        width?: number | string;
    }

    export interface TableColumn<T, V = unknown> {
        key: string;
        header?: string;
        align?: "left" | "center" | "right";
        width?: string;
        minWidth?: string;
        class?: string;
        sortable?: boolean;
        sortComparator?: (a: T, b: T, order: "asc" | "desc") => number;
        resizable?: boolean;
        visible?: boolean;
        mono?: boolean;
        getValue?: (row: T) => V;
        formatter?: (row: T, value: V, index: number) => string | number;
        cell?: Snippet<[T, { value: V; index: number }]> | Snippet<[T]>;
        headerCell?: Snippet<[{ column: TableColumn<T, V> }]>;
    }

    export interface TableSort {
        key: string;
        order: "asc" | "desc";
    }

    interface Props<T> {
        name?: string;
        data: T[];
        columns?: TableColumn<T>[];
        rows?: Snippet<[T]>;
        header?: Snippet;
        body?: Snippet;
        toolbar?: Snippet;
        footer?: Snippet;
        emptyState?: Snippet;
        emptyMessage?: string;
        sortable?: boolean;
        sort?: TableSort;
        onsort?: (sort: TableSort) => void;
        columnsEditable?: boolean;
        availableKeys?: string[];
        columnSelectorOpen?: boolean;
        onheadercontextmenu?: (e: Parameters<MouseEventHandler<HTMLElement>>[0]) => void;

        // Selection
        selectable?: boolean;
        selectedKeys?: (string | number)[];
        onselectionchange?: (selectedKeys: (string | number)[], selectedRows: T[]) => void;

        // Expansion
        expandable?: boolean;
        expandedKeys?: (string | number)[];
        expandedRow?: Snippet<[T, { index: number }]>;
        onexpansionchange?: (expandedKeys: (string | number)[]) => void;

        // Column Resizing
        resizable?: boolean;
        columnWidths?: Record<string, number>;
        oncolumnresize?: (key: string, width: number) => void;

        // Row Actions & Events
        rowActions?: Snippet<[T, { index: number }]>;
        actionsHeader?: string;
        actionsAlign?: "left" | "center" | "right";
        actionsWidth?: string;
        onrowclick?: (e: Parameters<MouseEventHandler<HTMLTableRowElement>>[0], row: T, index: number) => void;
        onrowdblclick?: (e: Parameters<MouseEventHandler<HTMLTableRowElement>>[0], row: T, index: number) => void;

        // Display Modifiers
        density?: "compact" | "normal" | "spacious";
        stickyHeader?: boolean;
        striped?: boolean;
        hoverable?: boolean;
        bordered?: boolean;
        columnLines?: boolean;
        class?: string;
    }

    let {
        name,
        data,
        columns = [],
        rows,
        header,
        body,
        toolbar,
        footer,
        emptyState,
        emptyMessage = "Nothing to show",
        sortable = true,
        sort = $bindable({ key: "", order: "asc" }),
        onsort,
        columnsEditable = false,
        availableKeys,
        columnSelectorOpen = $bindable(false),
        onheadercontextmenu,
        selectable = false,
        selectedKeys = $bindable([]),
        onselectionchange,
        expandable = false,
        expandedKeys = $bindable([]),
        expandedRow,
        onexpansionchange,
        resizable = false,
        columnWidths = $bindable({}),
        oncolumnresize,
        rowActions,
        actionsHeader = "Actions",
        actionsAlign = "right",
        actionsWidth,
        onrowclick,
        onrowdblclick,
        density = "normal",
        stickyHeader = false,
        striped = false,
        hoverable = true,
        bordered = true,
        columnLines = false,
        class: customClass = ""
    }: Props<T> = $props();

    const TABLE_PREFS_KEY = "table-preferences";

    function loadStoredColumnState(tableName?: string) {
        if (!tableName) {
            return { widths: {} as Record<string, number>, hidden: [] as string[], order: [] as string[] };
        }

        const allPrefs = new VizLocalStorage<Record<string, TableColumnState[]>>(TABLE_PREFS_KEY).get();
        if (!allPrefs || typeof allPrefs !== "object") {
            return { widths: {} as Record<string, number>, hidden: [] as string[], order: [] as string[] };
        }

        const stored = allPrefs[tableName];
        if (!Array.isArray(stored)) {
            return { widths: {} as Record<string, number>, hidden: [] as string[], order: [] as string[] };
        }

        const widths: Record<string, number> = {};
        const hidden: string[] = [];
        const order: string[] = [];

        for (const col of stored) {
            order.push(col.key);
            if (col.width !== undefined) {
                const parsed = typeof col.width === "number" ? col.width : parseInt(String(col.width), 10);
                if (!isNaN(parsed)) {
                    widths[col.key] = parsed;
                }
            }

            if (col.visible === false) {
                hidden.push(col.key);
            }
        }

        return { widths, hidden, order };
    }

    let storedState = $derived(loadStoredColumnState(name));
    let manualHiddenKeys = $state<string[] | null>(null);
    let customColumnOrder = $state<string[] | null>(null);

    let hiddenColumnKeys = $derived(manualHiddenKeys ?? storedState.hidden);
    let orderedColumnKeys = $derived(customColumnOrder ?? (storedState.order.length > 0 ? storedState.order : null));

    let inferredKeys: string[] = $derived.by(() => {
        const sample = data[0];
        if (!sample) {
            return [];
        }
        return Object.keys(sample).filter((key) => {
            const value = sample[key];
            return (
                value === null ||
                value === undefined ||
                typeof value === "string" ||
                typeof value === "number" ||
                typeof value === "boolean"
            );
        });
    });

    let allSelectableColumns = $derived.by(() => {
        let baseCols: TableColumn<T>[];
        if (columns.length > 0) {
            baseCols = [...columns];
        } else {
            const keys = availableKeys ?? inferredKeys;
            baseCols = keys.map((key) => {
                return { key, header: key };
            });
        }

        if (!orderedColumnKeys || orderedColumnKeys.length === 0) {
            return baseCols;
        }

        const keyMap = new Map(baseCols.map((c) => [c.key, c]));
        const result: TableColumn<T>[] = [];

        for (const key of orderedColumnKeys) {
            const found = keyMap.get(key);
            if (found) {
                result.push(found);
                keyMap.delete(key);
            }
        }

        for (const remaining of keyMap.values()) {
            result.push(remaining);
        }

        return result;
    });

    let effectiveColumns: TableColumn<T>[] = $derived.by(() => {
        return allSelectableColumns.filter((col) => {
            return !hiddenColumnKeys.includes(col.key) && col.visible !== false;
        });
    });

    function toggleColumnVisibility(key: string) {
        const isHidden = hiddenColumnKeys.includes(key);
        let nextHidden: string[];
        if (isHidden) {
            nextHidden = hiddenColumnKeys.filter((k) => {
                return k !== key;
            });
        } else {
            nextHidden = [...hiddenColumnKeys, key];
        }

        manualHiddenKeys = nextHidden;
        saveTableState();
    }

    function moveColumnOrder(index: number, direction: number) {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= allSelectableColumns.length) {
            return;
        }

        const keys = allSelectableColumns.map((c) => {
            return c.key;
        });
        const temp = keys[index];
        keys[index] = keys[targetIndex];
        keys[targetIndex] = temp;

        customColumnOrder = keys;
        saveTableState();
    }

    function resetColumns() {
        manualHiddenKeys = [];
        customColumnOrder = null;
        columnWidths = {};

        if (name) {
            const storage = new VizLocalStorage<Record<string, TableColumnState[]>>(TABLE_PREFS_KEY);
            const allPrefs = storage.get() ?? {};
            delete allPrefs[name];
            storage.set(allPrefs);
        }
    }

    function saveTableState() {
        if (!name) {
            return;
        }

        const storage = new VizLocalStorage<Record<string, TableColumnState[]>>(TABLE_PREFS_KEY);
        const allPrefs = storage.get() ?? {};

        const currentHidden = manualHiddenKeys ?? storedState.hidden;
        const stateToSave: TableColumnState[] = allSelectableColumns.map((col) => {
            const isVisible = !currentHidden.includes(col.key) && col.visible !== false;
            const width = columnWidths[col.key] ?? col.width;
            return {
                key: col.key,
                visible: isVisible,
                ...(width !== undefined ? { width } : {})
            };
        });

        allPrefs[name] = stateToSave;
        storage.set(allPrefs);
    }

    let columnMenuItems = $derived.by((): MenuItem<TableColumn<T>>[] => {
        const items: MenuItem<TableColumn<T>>[] = [
            {
                id: "header",
                content: headerContentSnippet
            },
            {
                id: "sep-1",
                separator: true
            }
        ];

        for (const col of allSelectableColumns) {
            items.push({
                id: col.key,
                label: col.header ?? col.key,
                content: columnItemSnippet,
                data: col
            });
        }

        return items;
    });

    let headerContextMenuOpen = $state(false);
    let headerContextMenuAnchor = $state<{ x: number; y: number } | null>(null);

    function handleHeaderContextMenu(e: Parameters<MouseEventHandler<HTMLElement>>[0]) {
        if (onheadercontextmenu) {
            onheadercontextmenu(e);
            return;
        }

        if (columnsEditable) {
            e.preventDefault();
            e.stopPropagation();
            headerContextMenuAnchor = { x: e.clientX, y: e.clientY };
            headerContextMenuOpen = true;
        }
    }

    let displayData = $derived.by(() => {
        if (!sort.key) {
            return data;
        }

        const col = effectiveColumns.find((c) => {
            return c.key === sort.key;
        });
        const isDesc = sort.order === "desc";

        return [...data].sort((a, b) => {
            if (col?.sortComparator) {
                return col.sortComparator(a, b, sort.order);
            }

            const valA = col ? getCellValue(a, col) : (a as Record<string, unknown>)[sort.key];
            const valB = col ? getCellValue(b, col) : (b as Record<string, unknown>)[sort.key];

            if (valA === valB) {
                return 0;
            }
            if (valA === null || valA === undefined) {
                return 1;
            }
            if (valB === null || valB === undefined) {
                return -1;
            }

            if (typeof valA === "number" && typeof valB === "number") {
                return isDesc ? valB - valA : valA - valB;
            }

            const dateA = tryParseDate(valA);
            const dateB = tryParseDate(valB);
            if (dateA && dateB) {
                return isDesc ? dateB.toMillis() - dateA.toMillis() : dateA.toMillis() - dateB.toMillis();
            }

            const strA = String(valA).toLowerCase();
            const strB = String(valB).toLowerCase();
            return isDesc ? strB.localeCompare(strA) : strA.localeCompare(strB);
        });
    });

    let selectedSet = $derived(new Set(selectedKeys));
    let expandedSet = $derived(new Set(expandedKeys));

    let isAllSelected = $derived(
        displayData.length > 0 &&
            displayData.every((row, i) => {
                return selectedSet.has(getRowKey(row, i));
            })
    );

    let isSomeSelected = $derived(
        displayData.some((row, i) => {
            return selectedSet.has(getRowKey(row, i));
        })
    );

    let isPartiallySelected = $derived(isSomeSelected && !isAllSelected);

    let totalColSpan = $derived(
        effectiveColumns.length +
            (selectable ? 1 : 0) +
            (expandable ? 1 : 0) +
            (rowActions ? 1 : 0) +
            (!toolbar && columnsEditable && !rowActions ? 1 : 0)
    );

    function getRowKey(row: T, index: number): string | number {
        return row.uid ?? row.id ?? index;
    }

    function getCellValue(row: T, col: TableColumn<T, any>): unknown {
        if (col.getValue) {
            return col.getValue(row);
        }

        return (row as Record<string, unknown>)[col.key];
    }

    function canSort(col: TableColumn<T>): boolean {
        return col.sortable ?? sortable;
    }

    function canResize(col: TableColumn<T>): boolean {
        return col.resizable ?? resizable;
    }

    let resizingKey: string | null = $state(null);
    let resizeStartX = 0;
    let resizeStartWidth = 0;

    function handleResizePointerDown(e: PointerEvent, col: TableColumn<T>) {
        e.preventDefault();
        e.stopPropagation();
        const th = (e.currentTarget as HTMLElement).closest("th");
        if (!th) {
            return;
        }

        const target = e.currentTarget as HTMLElement;
        target.setPointerCapture(e.pointerId);

        resizingKey = col.key;
        resizeStartX = e.clientX;
        resizeStartWidth = th.getBoundingClientRect().width;
    }

    function handleResizePointerMove(e: PointerEvent, col: TableColumn<T>) {
        if (resizingKey !== col.key) {
            return;
        }
        e.preventDefault();
        const delta = e.clientX - resizeStartX;
        const min = col.minWidth ? parseInt(col.minWidth, 10) || 40 : 40;
        const nextWidth = Math.max(min, Math.round(resizeStartWidth + delta));
        columnWidths = { ...columnWidths, [col.key]: nextWidth };
        if (oncolumnresize) {
            oncolumnresize(col.key, nextWidth);
        }
    }

    function handleResizePointerUp(e: PointerEvent, col: TableColumn<T>) {
        if (resizingKey !== col.key) {
            return;
        }

        resizingKey = null;
        const target = e.currentTarget as HTMLElement;
        if (target.hasPointerCapture(e.pointerId)) {
            target.releasePointerCapture(e.pointerId);
        }
        saveTableState();
    }

    function handleResizeDblClick(e: MouseEvent, col: TableColumn<T>) {
        e.preventDefault();
        e.stopPropagation();
        const next = { ...columnWidths };
        delete next[col.key];
        columnWidths = next;
        saveTableState();
    }

    function getColWidth(col: TableColumn<T>): string | undefined {
        if (columnWidths[col.key] !== undefined) {
            return `${columnWidths[col.key]}px`;
        }
        if (storedState.widths[col.key] !== undefined) {
            return `${storedState.widths[col.key]}px`;
        }
        return col.width;
    }

    function getColMinWidth(col: TableColumn<T>): string | undefined {
        if (columnWidths[col.key] !== undefined) {
            return `${columnWidths[col.key]}px`;
        }
        if (storedState.widths[col.key] !== undefined) {
            return `${storedState.widths[col.key]}px`;
        }
        return col.minWidth;
    }

    function handleSort(key: string) {
        sort = sort.key === key ? { key, order: sort.order === "asc" ? "desc" : "asc" } : { key, order: "asc" };
        onsort?.(sort);
    }

    function toggleSelectAll() {
        const willSelectAll = !isAllSelected;
        let nextSelected: (string | number)[];
        let nextRows: T[];

        if (willSelectAll) {
            nextSelected = displayData.map((row, i) => {
                return getRowKey(row, i);
            });
            nextRows = [...displayData];
        } else {
            nextSelected = [];
            nextRows = [];
        }

        selectedKeys = nextSelected;
        if (onselectionchange) {
            onselectionchange(nextSelected, nextRows);
        }
    }

    function toggleSelectRow(row: T, index: number) {
        const key = getRowKey(row, index);
        let nextSelected: (string | number)[];
        if (selectedSet.has(key)) {
            nextSelected = selectedKeys.filter((k) => {
                return k !== key;
            });
        } else {
            nextSelected = [...selectedKeys, key];
        }

        const nextSet = new Set(nextSelected);
        const nextRows = displayData.filter((item, i) => {
            return nextSet.has(getRowKey(item, i));
        });

        selectedKeys = nextSelected;
        if (onselectionchange) {
            onselectionchange(nextSelected, nextRows);
        }
    }

    function toggleExpandRow(row: T, index: number) {
        const key = getRowKey(row, index);
        let nextExpanded: (string | number)[];
        if (expandedSet.has(key)) {
            nextExpanded = expandedKeys.filter((k) => {
                return k !== key;
            });
        } else {
            nextExpanded = [...expandedKeys, key];
        }

        expandedKeys = nextExpanded;
        if (onexpansionchange) {
            onexpansionchange(nextExpanded);
        }
    }
</script>

{#snippet headerContentSnippet()}
    <div class="ctx-columns-header">
        <span class="ctx-columns-title">Columns</span>
        <Button
            variant="ghost"
            size="mini"
            iconSize="1rem"
            iconName="restart_alt"
            class="ctx-reset-btn"
            onclick={() => {
                resetColumns();
            }}
        >
            <span>Reset</span>
        </Button>
    </div>
{/snippet}

{#snippet columnItemSnippet(item: MenuItem<TableColumn<T>>)}
    {@const col = item.data!}
    {@const colIndex = allSelectableColumns.findIndex((c) => {
        return c.key === col.key;
    })}
    <div class="ctx-column-row">
        <div class="reorder-arrows">
            <Button
                variant="ghost"
                iconName="keyboard_arrow_up"
                class="arrow-btn"
                disabled={colIndex <= 0}
                onclick={(e) => {
                    e.stopPropagation();
                    if (colIndex > 0) {
                        moveColumnOrder(colIndex, -1);
                    }
                }}
                aria-label="Move column up"
            />
            <Button
                variant="ghost"
                size="mini"
                iconName="keyboard_arrow_down"
                class="arrow-btn"
                disabled={colIndex === -1 || colIndex >= allSelectableColumns.length - 1}
                onclick={(e) => {
                    e.stopPropagation();
                    if (colIndex !== -1 && colIndex < allSelectableColumns.length - 1) {
                        moveColumnOrder(colIndex, 1);
                    }
                }}
                aria-label="Move column down"
            />
        </div>
        <Checkbox
            checked={!hiddenColumnKeys.includes(col.key)}
            onchange={() => {
                toggleColumnVisibility(col.key);
            }}
            label={col.header ?? col.key}
        />
    </div>
{/snippet}

{#if columnsEditable}
    <ContextMenu bind:showMenu={headerContextMenuOpen} anchor={headerContextMenuAnchor} items={columnMenuItems} />
{/if}

<div
    class="viz-table-wrapper {customClass}"
    class:density-compact={density === "compact"}
    class:density-spacious={density === "spacious"}
    class:density-normal={density === "normal"}
    class:has-border={bordered}
>
    {#if toolbar}
        <div class="viz-table-toolbar">
            <div class="viz-table-toolbar-content">
                {@render toolbar()}
            </div>

            {#if columnsEditable}
                <Dropdown
                    variant="ghost"
                    iconName="view_column"
                    class="col-selector-btn"
                    items={columnMenuItems}
                    bind:showMenu={columnSelectorOpen}
                    align="right"
                />
            {/if}
        </div>
    {/if}

    <div class="viz-table-container">
        <table
            class="viz-table"
            class:sticky-header={stickyHeader}
            class:striped
            class:hoverable
            class:has-column-lines={columnLines}
        >
            <thead oncontextmenu={handleHeaderContextMenu}>
                <tr>
                    {#if selectable}
                        <th class="col-control col-select">
                            <Checkbox
                                checked={isAllSelected}
                                indeterminate={isPartiallySelected}
                                onchange={toggleSelectAll}
                                aria-label="Select all rows"
                            />
                        </th>
                    {/if}

                    {#if expandable}
                        <th class="col-control col-expand" aria-label="Row expansion"></th>
                    {/if}

                    {#if header}
                        {@render header()}
                    {:else}
                        {#each effectiveColumns as col (col.key)}
                            <th
                                class="align-{col.align ?? 'left'} {col.class ?? ''}"
                                class:sortable={canSort(col)}
                                class:is-resizable={canResize(col)}
                                style:width={getColWidth(col)}
                                style:min-width={getColMinWidth(col)}
                                aria-sort={sort.key === col.key
                                    ? sort.order === "asc"
                                        ? "ascending"
                                        : "descending"
                                    : "none"}
                            >
                                {#if col.headerCell}
                                    {@render col.headerCell({ column: col })}
                                {:else if canSort(col)}
                                    <button class="header-sort-btn" onclick={() => handleSort(col.key)}>
                                        <span>{col.header ?? col.key}</span>
                                        <span class="sort-icon" class:active={sort.key === col.key}>
                                            <MaterialIcon
                                                iconName={sort.key === col.key
                                                    ? sort.order === "asc"
                                                        ? "arrow_upward"
                                                        : "arrow_downward"
                                                    : "swap_vert"}
                                                size="0.95rem"
                                            />
                                        </span>
                                    </button>
                                {:else}
                                    <span class="header-label">{col.header ?? col.key}</span>
                                {/if}

                                {#if canResize(col)}
                                    <div
                                        class="col-resize-handle"
                                        class:is-resizing={resizingKey === col.key}
                                        onpointerdown={(e) => handleResizePointerDown(e, col)}
                                        onpointermove={(e) => handleResizePointerMove(e, col)}
                                        onpointerup={(e) => handleResizePointerUp(e, col)}
                                        onpointercancel={(e) => handleResizePointerUp(e, col)}
                                        ondblclick={(e) => handleResizeDblClick(e, col)}
                                        role="separator"
                                        aria-orientation="vertical"
                                        aria-label="Resize column"
                                        tabindex="-1"
                                    ></div>
                                {/if}
                            </th>
                        {/each}
                    {/if}

                    {#if rowActions}
                        <th class="col-actions align-{actionsAlign}" style:width={actionsWidth}>
                            {#if !toolbar && columnsEditable}
                                <div class="actions-header-wrap">
                                    <span class="header-label">{actionsHeader}</span>
                                    <Dropdown
                                        variant="ghost"
                                        iconName="view_column"
                                        class="col-selector-btn"
                                        items={columnMenuItems}
                                        bind:showMenu={columnSelectorOpen}
                                        align="right"
                                    />
                                </div>
                            {:else}
                                <span class="header-label">{actionsHeader}</span>
                            {/if}
                        </th>
                    {:else if !toolbar && columnsEditable}
                        <th class="col-control col-settings">
                            <Dropdown
                                variant="ghost"
                                iconName="view_column"
                                class="col-selector-btn"
                                items={columnMenuItems}
                                bind:showMenu={columnSelectorOpen}
                                align="right"
                            />
                        </th>
                    {/if}
                </tr>
            </thead>
            <tbody>
                {#if body}
                    {@render body()}
                {:else}
                    {#each displayData as row, index (getRowKey(row, index))}
                        {@const rowKey = getRowKey(row, index)}
                        {@const rowSelected = selectedSet.has(rowKey)}
                        {@const rowExpanded = expandedSet.has(rowKey)}
                        {#if rows}
                            {@render rows(row)}
                        {:else}
                            <tr
                                class:row-selected={rowSelected}
                                class:row-expanded={rowExpanded}
                                onclick={(e) => {
                                    if (
                                        selectable &&
                                        !(e.target as HTMLElement).closest(
                                            "button, input, a, .col-control, .col-actions, [data-prevent-row-select]"
                                        )
                                    ) {
                                        toggleSelectRow(row, index);
                                    }
                                    if (onrowclick) {
                                        onrowclick(e, row, index);
                                    }
                                }}
                                ondblclick={(e) => {
                                    if (onrowdblclick) {
                                        onrowdblclick(e, row, index);
                                    }
                                }}
                            >
                                {#if selectable}
                                    <td class="col-control col-select">
                                        <Checkbox
                                            checked={rowSelected}
                                            onchange={() => toggleSelectRow(row, index)}
                                            aria-label="Select row"
                                        />
                                    </td>
                                {/if}

                                {#if expandable}
                                    <td class="col-control col-expand">
                                        <button
                                            type="button"
                                            class="expand-toggle-btn"
                                            class:is-expanded={rowExpanded}
                                            onclick={() => toggleExpandRow(row, index)}
                                            aria-label={rowExpanded ? "Collapse row" : "Expand row"}
                                        >
                                            <MaterialIcon iconName="chevron_right" size="1.1rem" />
                                        </button>
                                    </td>
                                {/if}

                                {#each effectiveColumns as col (col.key)}
                                    {@const cellValue = getCellValue(row, col)}
                                    <td
                                        class="align-{col.align ?? 'left'} {col.class ?? ''}"
                                        class:font-mono={col.mono}
                                        style:width={getColWidth(col)}
                                        style:min-width={getColMinWidth(col)}
                                    >
                                        {#if col.cell}
                                            {@render col.cell(row, { value: cellValue, index })}
                                        {:else if col.formatter}
                                            {col.formatter(row, cellValue, index)}
                                        {:else}
                                            {cellValue ?? ""}
                                        {/if}
                                    </td>
                                {/each}

                                {#if rowActions}
                                    <td class="col-actions align-{actionsAlign}">
                                        {@render rowActions(row, { index })}
                                    </td>
                                {:else if !toolbar && columnsEditable}
                                    <td class="col-control col-settings"></td>
                                {/if}
                            </tr>
                        {/if}

                        {#if expandable && rowExpanded && expandedRow}
                            <tr class="expanded-row-container">
                                <td colspan={totalColSpan} class="expanded-cell">
                                    <div class="expanded-content">
                                        {@render expandedRow(row, { index })}
                                    </div>
                                </td>
                            </tr>
                        {/if}
                    {/each}
                {/if}
            </tbody>
        </table>

        {#if displayData.length === 0}
            <div class="empty-state-wrapper">
                {#if emptyState}
                    {@render emptyState()}
                {:else}
                    <div class="empty-state">{emptyMessage}</div>
                {/if}
            </div>
        {/if}
    </div>

    {#if footer}
        <div class="viz-table-footer">
            {@render footer()}
        </div>
    {/if}
</div>

<style lang="scss">
    .viz-table-wrapper {
        display: flex;
        flex-direction: column;
        width: 100%;
        max-width: 100%;
        background-color: var(--viz-surface-panel);
        border-radius: var(--viz-border-radius-md);
        overflow: hidden;
        box-sizing: border-box;

        &.has-border {
            border: var(--viz-border-thin);
        }
    }

    .viz-table-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--viz-spacing-sm);
        padding: var(--viz-spacing-sm) var(--viz-spacing-md);
        border-bottom: var(--viz-border-thin);
        background-color: var(--viz-surface-panel);
        box-sizing: border-box;

        .viz-table-toolbar-content {
            display: flex;
            align-items: center;
            gap: var(--viz-spacing-sm);
            flex: 1;
            min-width: 0;
        }

        :global(.col-selector-btn) {
            flex-shrink: 0;
        }
    }

    :global {
        .ctx-columns-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            user-select: none;

            .ctx-columns-title {
                font-size: var(--viz-font-size-std);
                font-weight: 600;
                color: var(--viz-text-primary);
            }

            .ctx-reset-btn {
                font-weight: 600;
                color: var(--viz-text-secondary);

                &:hover {
                    color: var(--viz-text-primary);
                }
            }
        }

        .ctx-column-row {
            display: flex;
            align-items: center;
            gap: var(--viz-spacing-sm);
            width: 100%;
            user-select: none;

            .reorder-arrows {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: var(--viz-spacing-sm);
                flex-shrink: 0;

                .arrow-btn {
                    padding: 0;
                    min-height: unset;
                    height: 0.7rem;
                    opacity: 0.6;
                    border: none;

                    &:hover:not(:disabled) {
                        opacity: 1;
                        color: var(--viz-text-primary);
                    }

                    &:disabled {
                        opacity: 0.2;
                        cursor: default;
                    }
                }
            }

            .checkbox-wrapper {
                flex: 1;
                width: 100%;

                label {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                }

                .label-text {
                    color: var(--viz-text-primary);
                    user-select: none;
                    flex: 1;
                }
            }
        }
    }

    .viz-table-container {
        width: 100%;
        max-width: 100%;
        overflow-x: auto;
        overflow-y: visible;
        position: relative;
        box-sizing: border-box;
    }

    .viz-table {
        width: 100%;
        border-collapse: collapse;
        color: var(--viz-text-primary);
        font-family: var(--viz-display-font);
        text-align: left;

        /* Density variants */
        font-size: var(--viz-font-size-std);

        thead {
            th {
                position: relative;
                padding: var(--viz-spacing-sm) var(--viz-spacing-md);
                font-weight: 600;
                border-bottom: var(--viz-border-thin);
                white-space: nowrap;
                user-select: none;

                &.align-center {
                    text-align: center;
                }

                &.align-right {
                    text-align: right;
                }

                .header-label {
                    display: inline-block;
                }

                .header-sort-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: var(--viz-spacing-xs);
                    padding: 0;
                    background: transparent;
                    border: none;
                    color: inherit;
                    cursor: pointer;
                    font: inherit;
                    letter-spacing: inherit;
                    text-transform: inherit;

                    &:hover {
                        color: var(--viz-text-primary);
                    }

                    .sort-icon {
                        display: inline-flex;
                        opacity: 0;
                        color: var(--viz-text-secondary);

                        &.active {
                            opacity: 1;
                            color: var(--viz-primary);
                        }
                    }

                    &:hover .sort-icon {
                        opacity: 0.65;

                        &.active {
                            opacity: 1;
                        }
                    }
                }
            }
        }

        &.sticky-header thead th {
            position: sticky;
            top: 0;
            z-index: 2;
            background-color: var(--viz-surface-panel);
        }

        tbody {
            tr {
                transition: background-color 0.12s ease;

                &.row-selected {
                    background-color: color-mix(in oklch, var(--viz-primary) 12%, transparent);
                }

                &.row-expanded {
                    background-color: var(--viz-surface-hover);
                }
            }

            td {
                padding: var(--viz-spacing-sm) var(--viz-spacing-md);
                border-bottom: var(--viz-border-thin);
                vertical-align: middle;

                &.align-center {
                    text-align: center;
                }

                &.align-right {
                    text-align: right;
                }

                &.font-mono {
                    font-family: var(--viz-mono-font);
                }
            }

            tr:last-child td {
                border-bottom: none;
            }
        }

        &.striped tbody tr:nth-child(even):not(.row-selected):not(.row-expanded) {
            background-color: color-mix(in oklch, var(--viz-surface-base) 40%, transparent);
        }

        &.hoverable tbody tr:not(.expanded-row-container):hover {
            background-color: var(--viz-surface-hover);
        }

        &.has-column-lines {
            thead th:not(:last-child) {
                border-right: var(--viz-border-thin);
            }

            tbody td:not(:last-child) {
                border-right: var(--viz-border-thin);
            }
        }
    }

    /* Density modifications */
    .density-compact .viz-table {
        // font-size: var(--viz-font-size-sm);

        thead th {
            padding: var(--viz-spacing-xs) var(--viz-spacing-sm);
            // font-size: var(--viz-font-size-xs);
        }

        tbody td {
            padding: var(--viz-spacing-xs) var(--viz-spacing-sm);
        }
    }

    .density-spacious .viz-table {
        font-size: var(--viz-font-size-lg);

        thead th {
            padding: var(--viz-spacing-md) var(--viz-spacing-lg);
            font-size: var(--viz-font-size-std);
        }

        tbody td {
            padding: var(--viz-spacing-md) var(--viz-spacing-lg);
        }
    }

    /* Selection and Expansion Controls */
    .col-control {
        width: 2.25rem;
        padding-left: var(--viz-spacing-sm) !important;
        padding-right: var(--viz-spacing-xs) !important;
        text-align: center !important;

        &.col-settings {
            width: 2.75rem;
            min-width: 2.75rem;
            text-align: right !important;
            padding-right: var(--viz-spacing-sm) !important;
        }
    }

    .actions-header-wrap {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--viz-spacing-xs);
    }

    .expand-toggle-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        width: 1.5rem;
        height: 1.5rem;
        background: transparent;
        border: none;
        border-radius: var(--viz-border-radius-sm);
        color: var(--viz-text-secondary);
        cursor: pointer;
        transition:
            transform 0.18s ease,
            color 0.12s ease;

        &:hover {
            color: var(--viz-text-primary);
            background-color: var(--viz-surface-hover);
        }

        &.is-expanded {
            transform: rotate(90deg);
            color: var(--viz-primary);
        }
    }

    .col-actions {
        white-space: nowrap;
    }

    .col-resize-handle {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        width: 8px;
        cursor: col-resize;
        user-select: none;
        touch-action: none;
        z-index: 3;
        display: flex;
        align-items: center;
        justify-content: center;

        &::after {
            content: "";
            width: 2px;
            height: 55%;
            background-color: var(--viz-border-subtle);
            border-radius: 1px;
            opacity: 0;
            transition:
                opacity 0.15s ease,
                background-color 0.15s ease;
        }

        &:hover::after,
        &.is-resizing::after {
            opacity: 1;
            background-color: var(--viz-primary);
        }
    }

    /* Expanded row drawer styling */
    .expanded-row-container {
        background-color: var(--viz-surface-card);

        .expanded-cell {
            padding: 0 !important;
            border-bottom: var(--viz-border-thin);
        }

        .expanded-content {
            padding: var(--viz-spacing-md) var(--viz-spacing-lg);
            border-left: 3px solid var(--viz-primary);
            background-color: color-mix(in oklch, var(--viz-surface-panel) 60%, transparent);
        }
    }

    .empty-state-wrapper {
        width: 100%;
    }

    .empty-state {
        padding: var(--viz-spacing-xxl);
        text-align: center;
        color: var(--viz-text-secondary);
        position: relative;

        &::after {
            content: "";
            display: block;
            width: 1.5rem;
            height: 2px;
            margin: var(--viz-spacing-sm) auto 0;
            background-color: var(--viz-accent);
            opacity: 0.5;
        }
    }

    .viz-table-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--viz-spacing-xs) var(--viz-spacing-md);
        border-top: var(--viz-border-thin);
        color: var(--viz-text-secondary);
        background-color: var(--viz-surface-panel);
    }
</style>
