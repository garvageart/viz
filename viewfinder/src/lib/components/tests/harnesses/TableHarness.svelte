<script lang="ts">
    import Table, { type TableColumn } from "$lib/components/ui/Table.svelte";

    export interface HarnessRow {
        uid: string;
        name: string;
        role: string;
    }

    interface Props {
        name?: string;
        data: HarnessRow[];
        useRowsSnippet?: boolean;
        useToolbar?: boolean;
        useFooter?: boolean;
        useExpandable?: boolean;
        useSelectable?: boolean;
        useActions?: boolean;
        resizable?: boolean;
        onselectionchange?: (keys: (string | number)[], rows: HarnessRow[]) => void;
        onexpansionchange?: (keys: (string | number)[]) => void;
        oncolumnresize?: (key: string, width: number) => void;
    }

    let {
        name = "test-table",
        data,
        useRowsSnippet = false,
        useToolbar = false,
        useFooter = false,
        useExpandable = false,
        useSelectable = false,
        useActions = false,
        resizable = false,
        onselectionchange,
        onexpansionchange,
        oncolumnresize
    }: Props = $props();

    const columns: TableColumn<HarnessRow>[] = [
        { key: "name", mono: true },
        { key: "role", cell: roleCell }
    ];
</script>

{#snippet roleCell(row: HarnessRow)}
    [{[row.role]}]
{/snippet}

{#snippet customRows(row: HarnessRow)}
    <tr>
        <td>ROW:{row.name}</td>
    </tr>
{/snippet}

{#snippet toolbarSnippet()}
    <div data-testid="table-toolbar">Toolbar Content</div>
{/snippet}

{#snippet footerSnippet()}
    <div data-testid="table-footer">Footer Content</div>
{/snippet}

{#snippet expandedRowSnippet(row: HarnessRow)}
    <div data-testid="expanded-drawer-{row.uid}">Details for {row.name}</div>
{/snippet}

{#snippet actionsSnippet(row: HarnessRow)}
    <button data-testid="action-btn-{row.uid}">Action {row.name}</button>
{/snippet}

<Table
    {name}
    {data}
    {columns}
    rows={useRowsSnippet ? customRows : undefined}
    toolbar={useToolbar ? toolbarSnippet : undefined}
    footer={useFooter ? footerSnippet : undefined}
    selectable={useSelectable}
    expandable={useExpandable}
    expandedRow={useExpandable ? expandedRowSnippet : undefined}
    rowActions={useActions ? actionsSnippet : undefined}
    {resizable}
    {onselectionchange}
    {onexpansionchange}
    {oncolumnresize}
/>
