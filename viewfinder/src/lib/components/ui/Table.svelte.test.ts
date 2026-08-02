import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import TableColumnSelectorModal from "$lib/components/modals/TableColumnSelectorModal.svelte";
import { modalsManager } from "$lib/components/modals/manager/ModalManager.svelte";
import TableHarness from "$lib/components/tests/harnesses/TableHarness.svelte";
import { tableColumnSettings } from "$lib/states/index.svelte";
import Table, { type TableSort } from "./Table.svelte";

vi.mock("$lib/components/modals/manager/ModalManager.svelte.ts", () => ({
    modalsManager: {
        open: vi.fn(),
        close: vi.fn(),
        dismiss: vi.fn(),
        pop: vi.fn(),
        getModals: vi.fn(() => [])
    }
}));

interface Row {
    uid: string;
    name: string;
    role: string;
}

const rows: Row[] = [
    { uid: "u1", name: "Les", role: "admin" },
    { uid: "u2", name: "Jorie", role: "user" }
];

describe("Table", () => {
    it("infers columns from the first row", () => {
        render(Table, { data: rows });

        expect(screen.getByRole("columnheader", { name: "Uid" })).toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: "Role" })).toBeInTheDocument();

        expect(screen.getByText("Les")).toBeInTheDocument();
        expect(screen.getByText("Jorie")).toBeInTheDocument();
        expect(screen.getByText("admin")).toBeInTheDocument();
    });

    it("renders explicit columns with custom headers", () => {
        render(Table, {
            data: rows,
            columns: [{ key: "name", header: "Display Name" }, { key: "role" }]
        });

        expect(screen.getByRole("columnheader", { name: "Display Name" })).toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: "Role" })).toBeInTheDocument();
        expect(screen.queryByRole("columnheader", { name: "Uid" })).not.toBeInTheDocument();
    });

    it("renders a custom cell snippet for a column", () => {
        render(TableHarness, { data: rows });

        expect(screen.getByText("[admin]")).toBeInTheDocument();
        expect(screen.getByText("[user]")).toBeInTheDocument();
    });

    it("renders a fully custom row snippet", () => {
        render(TableHarness, { data: rows, useRowsSnippet: true });

        expect(screen.getByText("ROW:Les")).toBeInTheDocument();
        expect(screen.getByText("ROW:Jorie")).toBeInTheDocument();
    });

    it("shows the empty message when there is no data", () => {
        render(Table, { data: [], emptyMessage: "Nothing here" });

        expect(screen.getByText("Nothing here")).toBeInTheDocument();
    });

    it("renders nested values by dot path", () => {
        const nested = [{ uid: "u1", profile: { display_name: "Al" } }];

        render(Table, {
            data: nested,
            columns: [{ key: "profile.display_name" }]
        });

        expect(screen.getByText("Al")).toBeInTheDocument();
    });

    it("calls onsort and toggles order when a sortable header is clicked", async () => {
        const onsort = vi.fn();
        const sort: TableSort = { key: "", order: "asc" };

        render(Table, { data: rows, sortable: true, sort, onsort });

        await fireEvent.click(screen.getByRole("button", { name: /Name/i }));
        expect(onsort).toHaveBeenLastCalledWith({ key: "name", order: "asc" });

        await fireEvent.click(screen.getByRole("button", { name: /Name/i }));
        expect(onsort).toHaveBeenLastCalledWith({ key: "name", order: "desc" });
    });

    it("does not make headers sortable when sortable is false", () => {
        render(Table, { data: rows });

        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("opens the column selector when triggered externally", () => {
        render(Table, {
            data: rows,
            columnsEditable: true,
            availableKeys: ["name", "role"],
            columnSelectorOpen: true
        });

        expect(modalsManager.open).toHaveBeenCalledTimes(1);
        expect(modalsManager.open).toHaveBeenCalledWith(
            TableColumnSelectorModal,
            { availableKeys: ["name", "role"] },
            { heading: "Table Columns" }
        );
    });

    it("derives columns from tableColumnSettings when editable", () => {
        tableColumnSettings.set(["name"]);

        render(Table, {
            data: rows,
            columnsEditable: true,
            availableKeys: ["name", "role", "uid"]
        });

        expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
        expect(screen.queryByRole("columnheader", { name: "Role" })).not.toBeInTheDocument();
        expect(screen.queryByRole("columnheader", { name: "Uid" })).not.toBeInTheDocument();
    });
});
