<script lang="ts" generics="T extends Record<string, any>">
    import { DateTime } from "luxon";
    import { type Snippet } from "svelte";
    import TableColumnSelectorModal from "$lib/components/modals/TableColumnSelectorModal.svelte";
    import { modalsManager } from "$lib/components/modals/manager/ModalManager.svelte";
    import { tableColumnSettings } from "$lib/states/index.svelte";
    import { tryParseDate } from "$lib/utils/dates";
    import { snakeToTitle } from "$lib/utils/strings";
    import MaterialIcon from "./MaterialIcon.svelte";

    export interface TableColumn<T> {
        key: string;
        header?: string;
        align?: "left" | "center" | "right";
        width?: string;
        class?: string;
        sortable?: boolean;
        cell?: Snippet<[T]>;
    }

    export interface TableSort {
        key: string;
        order: "asc" | "desc";
    }

    interface Props<T> {
        data: T[];
        columns?: TableColumn<T>[];
        rows?: Snippet<[T]>;
        emptyMessage?: string;
        sortable?: boolean;
        sort?: TableSort;
        onsort?: (sort: TableSort) => void;
        columnsEditable?: boolean;
        availableKeys?: string[];
        columnSelectorOpen?: boolean;
    }

    let {
        data,
        columns = [],
        rows,
        emptyMessage = "No data",
        sortable = false,
        sort = $bindable({ key: "", order: "asc" }),
        onsort,
        columnsEditable = false,
        availableKeys,
        columnSelectorOpen = $bindable(false)
    }: Props<T> = $props();

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

    let editorAvailableKeys = $derived(availableKeys ?? inferredKeys);

    let effectiveColumns: TableColumn<T>[] = $derived.by(() => {
        if (columns.length > 0) {
            return columns;
        }
        if (columnsEditable) {
            return tableColumnSettings.value.filter((key) => inferredKeys.includes(key)).map((key) => ({ key }));
        }
        return inferredKeys.map((key) => ({ key }));
    });

    function getNestedValue(obj: Record<string, any> | undefined, path: string): any {
        let current: any = obj;
        for (const part of path.split(".")) {
            if (current == null) {
                return undefined;
            }
            current = current[part];
        }
        return current;
    }

    function formatValue(value: any): string {
        if (value === null || value === undefined) {
            return "";
        }
        const date = tryParseDate(value);
        if (date) {
            return date.setZone("local").toLocaleString(DateTime.DATETIME_FULL);
        }
        if (typeof value === "object") {
            try {
                return JSON.stringify(value);
            } catch {
                return String(value);
            }
        }
        return String(value);
    }

    function canSort(col: TableColumn<T>): boolean {
        return col.sortable ?? sortable;
    }

    function handleSort(key: string) {
        sort = sort.key === key ? { key, order: sort.order === "asc" ? "desc" : "asc" } : { key, order: "asc" };
        onsort?.(sort);
    }

    function openColumnSelector() {
        modalsManager.open(
            TableColumnSelectorModal,
            { availableKeys: editorAvailableKeys },
            { heading: "Table Columns" }
        );
    }

    $effect(() => {
        if (columnSelectorOpen) {
            columnSelectorOpen = false;
            openColumnSelector();
        }
    });

    function getRowKey(row: T, index: number): string | number {
        return row.uid ?? row.id ?? index;
    }
</script>

<div class="viz-table-container">
    <table class="viz-table">
        <thead>
            <tr>
                {#each effectiveColumns as col (col.key)}
                    <th
                        class="align-{col.align ?? 'left'}"
                        class:sortable={canSort(col)}
                        style={col.width ? `width: ${col.width}` : undefined}
                        aria-sort={sort.key === col.key ? (sort.order === "asc" ? "ascending" : "descending") : "none"}
                    >
                        {#if canSort(col)}
                            <button class="header-sort-btn" onclick={() => handleSort(col.key)}>
                                <span>{col.header ?? snakeToTitle(col.key)}</span>
                                <span class="sort-icon" class:active={sort.key === col.key}>
                                    <MaterialIcon
                                        iconName={sort.key === col.key && sort.order === "asc"
                                            ? "arrow_upward"
                                            : "arrow_downward"}
                                        size="1rem"
                                    />
                                </span>
                            </button>
                        {:else}
                            {col.header ?? snakeToTitle(col.key)}
                        {/if}
                    </th>
                {/each}
            </tr>
        </thead>
        <tbody>
            {#each data as row, index (getRowKey(row, index))}
                {#if rows}
                    {@render rows(row)}
                {:else}
                    <tr>
                        {#each effectiveColumns as col (col.key)}
                            <td
                                class="align-{col.align ?? 'left'} {col.class ?? ''}"
                                style={col.width ? `width: ${col.width}` : undefined}
                            >
                                {#if col.cell}
                                    {@render col.cell(row)}
                                {:else}
                                    {formatValue(getNestedValue(row, col.key))}
                                {/if}
                            </td>
                        {/each}
                    </tr>
                {/if}
            {/each}
        </tbody>
    </table>
    {#if data.length === 0}
        <div class="empty-state">{emptyMessage}</div>
    {/if}
</div>

<style lang="scss">
    .viz-table-container {
        width: 100%;
        overflow-x: auto;
        background-color: var(--viz-surface-panel);
        border: var(--viz-border-thin);
        border-radius: var(--viz-border-radius-md);
    }

    .viz-table {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--viz-font-size-lg);
        color: var(--viz-text-primary);

        thead {
            th {
                text-align: left;
                padding: var(--viz-spacing-md) var(--viz-spacing-sm);
                color: var(--viz-text-secondary);
                font-weight: 600;
                font-size: var(--viz-font-size-std);
                text-transform: uppercase;
                letter-spacing: 0.05em;
                border-bottom: var(--viz-border-thin);
                white-space: nowrap;

                &.align-center {
                    text-align: center;
                }

                &.align-right {
                    text-align: right;
                }

                .header-sort-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: var(--viz-spacing-xs);
                    padding: var(--viz-spacing-xxs);
                    background: transparent;
                    border: none;
                    border-radius: var(--viz-border-radius-pill);
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
                        transition: opacity 0.15s ease;

                        &.active {
                            opacity: 1;
                            color: var(--viz-primary);
                        }
                    }

                    &:hover .sort-icon {
                        opacity: 0.5;

                        &.active {
                            opacity: 1;
                        }
                    }
                }
            }
        }

        tbody {
            tr {
                transition: background-color 0.15s ease;

                &:hover {
                    background-color: var(--viz-surface-hover);
                }
            }

            td {
                padding: var(--viz-spacing-md) var(--viz-spacing-sm);
                border-bottom: var(--viz-border-thin);
                vertical-align: middle;

                &.align-center {
                    text-align: center;
                }

                &.align-right {
                    text-align: right;
                }
            }

            tr:last-child td {
                border-bottom: none;
            }
        }
    }

    .empty-state {
        padding: var(--viz-spacing-xxl);
        text-align: center;
        color: var(--viz-text-secondary);
    }
</style>
