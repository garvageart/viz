<script lang="ts">
    import Table, { type TableColumn } from "$lib/components/ui/Table.svelte";

    export interface HarnessRow {
        uid: string;
        name: string;
        role: string;
    }

    interface Props {
        data: HarnessRow[];
        useRowsSnippet?: boolean;
    }

    let { data, useRowsSnippet = false }: Props = $props();

    const columns: TableColumn<HarnessRow>[] = [{ key: "name" }, { key: "role", cell: roleCell }];
</script>

{#snippet roleCell(row: HarnessRow)}
    [{[row.role]}]
{/snippet}

{#snippet customRows(row: HarnessRow)}
    <tr>
        <td>ROW:{row.name}</td>
    </tr>
{/snippet}

<Table {data} {columns} rows={useRowsSnippet ? customRows : undefined} />
