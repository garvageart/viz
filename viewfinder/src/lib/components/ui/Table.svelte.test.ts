import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import TableHarness from "$lib/components/tests/harnesses/TableHarness.svelte";
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

        const headers = document.querySelectorAll("thead th");
        expect(headers[0]).toHaveTextContent("uid");
        expect(headers[1]).toHaveTextContent("name");
        expect(headers[2]).toHaveTextContent("role");

        expect(screen.getByText("Les")).toBeInTheDocument();
        expect(screen.getByText("Jorie")).toBeInTheDocument();
        expect(screen.getByText("admin")).toBeInTheDocument();
    });

    it("renders explicit columns with custom headers", () => {
        render(Table, {
            data: rows,
            columns: [{ key: "name", header: "Display Name" }, { key: "role" }]
        });

        const headers = document.querySelectorAll("thead th");
        expect(headers[0]).toHaveTextContent("Display Name");
        expect(headers[1]).toHaveTextContent("role");
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
        const sort: TableSort = { key: "name", order: "asc" };

        render(Table, {
            data: rows,
            columns: [
                { key: "name", sortable: true },
                { key: "role", sortable: true }
            ],
            sort,
            onsort
        });

        const sortBtns = document.querySelectorAll<HTMLButtonElement>("th.sortable .header-sort-btn");
        expect(sortBtns.length).toBeGreaterThan(0);

        if (sortBtns[0]) {
            await fireEvent.click(sortBtns[0]);
        }
        expect(onsort).toHaveBeenLastCalledWith({ key: "name", order: "desc" });

        if (sortBtns[0]) {
            await fireEvent.click(sortBtns[0]);
        }
        expect(onsort).toHaveBeenLastCalledWith({ key: "name", order: "asc" });
    });

    it("does not make headers sortable when sortable is false", () => {
        render(Table, { data: rows });

        expect(document.querySelector(".header-sort-btn")).not.toBeInTheDocument();
    });

    it("renders column selector dropdown when columnsEditable is true", () => {
        render(Table, {
            data: rows,
            columnsEditable: true,
            columns: [
                { key: "name", header: "Name" },
                { key: "role", header: "Role" }
            ]
        });

        const selectorBtn = document.querySelector(".col-selector-btn");
        expect(selectorBtn).toBeInTheDocument();
    });

    it("renders toolbar and footer snippets when provided", () => {
        render(TableHarness, {
            data: rows,
            useToolbar: true,
            useFooter: true
        });

        expect(screen.getByTestId("table-toolbar")).toBeInTheDocument();
        expect(screen.getByText("Toolbar Content")).toBeInTheDocument();
        expect(screen.getByTestId("table-footer")).toBeInTheDocument();
        expect(screen.getByText("Footer Content")).toBeInTheDocument();
    });

    it("renders mono font class on columns configured with mono", () => {
        render(TableHarness, { data: rows });

        const nameCell = screen.getByText("Les").closest("td");
        expect(nameCell).toHaveClass("font-mono");
    });

    it("renders row actions snippet for each data row", () => {
        render(TableHarness, { data: rows, useActions: true });

        expect(document.querySelector("th.col-actions")).toBeInTheDocument();
        expect(screen.getByTestId("action-btn-u1")).toBeInTheDocument();
        expect(screen.getByTestId("action-btn-u2")).toBeInTheDocument();
    });

    it("handles row selection and select all", async () => {
        const onselectionchange = vi.fn();

        render(TableHarness, {
            data: rows,
            useSelectable: true,
            onselectionchange
        });

        const selectAllInput = document.querySelector<HTMLInputElement>("th.col-select input[type='checkbox']");
        const rowInputs = document.querySelectorAll<HTMLInputElement>("td.col-select input[type='checkbox']");

        expect(selectAllInput).toBeInTheDocument();
        expect(rowInputs).toHaveLength(2);

        // Select first row
        if (rowInputs[0]) {
            await fireEvent.click(rowInputs[0]);
        }
        expect(onselectionchange).toHaveBeenCalledWith(["u1"], [rows[0]]);

        // Select all
        if (selectAllInput) {
            await fireEvent.click(selectAllInput);
        }
        expect(onselectionchange).toHaveBeenCalledWith(["u1", "u2"], rows);
    });

    it("handles expandable rows and renders expanded drawer content", async () => {
        const onexpansionchange = vi.fn();

        render(TableHarness, {
            data: rows,
            useExpandable: true,
            onexpansionchange
        });

        const expandButtons = document.querySelectorAll<HTMLElement>("td.col-expand .expand-toggle-btn");
        expect(expandButtons).toHaveLength(2);

        // Expand first row
        if (expandButtons[0]) {
            await fireEvent.click(expandButtons[0]);
        }
        expect(onexpansionchange).toHaveBeenCalledWith(["u1"]);
        expect(screen.getByTestId("expanded-drawer-u1")).toBeInTheDocument();
        expect(screen.getByText("Details for Les")).toBeInTheDocument();
    });

    it("renders column resize handles and supports dragging to resize", async () => {
        const oncolumnresize = vi.fn();

        render(TableHarness, {
            data: rows,
            resizable: true,
            oncolumnresize
        });

        const resizeHandles = document.querySelectorAll<HTMLElement>(".col-resize-handle");
        expect(resizeHandles).toHaveLength(2);

        const handle = resizeHandles[0];

        // Mock pointer capture methods on element if missing in test DOM
        handle.setPointerCapture = vi.fn();
        handle.releasePointerCapture = vi.fn();

        // Pointer down
        await fireEvent.pointerDown(handle, { clientX: 100, pointerId: 1 });

        // Pointer move
        await fireEvent.pointerMove(handle, { clientX: 180, pointerId: 1 });
        expect(oncolumnresize).toHaveBeenCalled();

        // Pointer up
        await fireEvent.pointerUp(handle, { pointerId: 1 });

        // Double click reset
        await fireEvent.dblClick(handle);
    });

    it("automatically sorts rows by property when a sortable column is clicked", async () => {
        const testRows = [
            { uid: "u1", name: "Charlie", score: 20 },
            { uid: "u2", name: "Alice", score: 50 },
            { uid: "u3", name: "Bob", score: 10 }
        ];

        render(Table, {
            data: testRows,
            columns: [
                { key: "name", sortable: true },
                { key: "score", sortable: true }
            ]
        });

        const sortBtns = document.querySelectorAll<HTMLButtonElement>("th.sortable .header-sort-btn");
        expect(sortBtns).toHaveLength(2);

        // Click on Name header to sort ascending
        if (sortBtns[0]) {
            await fireEvent.click(sortBtns[0]);
        }
        let cells = screen.getAllByRole("cell");
        expect(cells[0]).toHaveTextContent("Alice");
        expect(cells[2]).toHaveTextContent("Bob");
        expect(cells[4]).toHaveTextContent("Charlie");

        // Click on Name header again to sort descending
        if (sortBtns[0]) {
            await fireEvent.click(sortBtns[0]);
        }
        cells = screen.getAllByRole("cell");
        expect(cells[0]).toHaveTextContent("Charlie");
        expect(cells[2]).toHaveTextContent("Bob");
        expect(cells[4]).toHaveTextContent("Alice");

        // Click on Score header to sort ascending by number
        if (sortBtns[1]) {
            await fireEvent.click(sortBtns[1]);
        }
        cells = screen.getAllByRole("cell");
        expect(cells[0]).toHaveTextContent("Bob");
        expect(cells[1]).toHaveTextContent("10");
        expect(cells[2]).toHaveTextContent("Charlie");
        expect(cells[3]).toHaveTextContent("20");
        expect(cells[4]).toHaveTextContent("Alice");
        expect(cells[5]).toHaveTextContent("50");
    });

    it("saves and restores visual state (width and visible) from localStorage using table name", async () => {
        const tableName = "test-custom-table";
        const customRows = [{ uid: "1", name: "Alpha", role: "Dev", team: "Core" }];

        // Pre-populate localStorage under table-preferences where 'team' is hidden and 'name' has width 250
        localStorage.setItem(
            "viz:table-preferences",
            JSON.stringify({
                [tableName]: [
                    { key: "name", visible: true, width: 250 },
                    { key: "role", visible: true },
                    { key: "team", visible: false }
                ]
            })
        );

        render(Table, {
            name: tableName,
            data: customRows,
            columns: [
                { key: "name", header: "Name" },
                { key: "role", header: "Role" },
                { key: "team", header: "Team" }
            ],
            resizable: true
        });

        // Visible columns should be Name and Role, Team should be hidden
        expect(screen.getByText("Name")).toBeInTheDocument();
        expect(screen.getByText("Role")).toBeInTheDocument();
        expect(screen.queryByText("Team")).not.toBeInTheDocument();

        // Resizing a column updates localStorage
        const handles = document.querySelectorAll<HTMLElement>(".col-resize-handle");
        expect(handles.length).toBeGreaterThan(0);

        if (handles[0]) {
            handles[0].setPointerCapture = vi.fn();
            handles[0].releasePointerCapture = vi.fn();

            await fireEvent.pointerDown(handles[0], { clientX: 100, pointerId: 1 });
            await fireEvent.pointerMove(handles[0], { clientX: 200, pointerId: 1 });
            await fireEvent.pointerUp(handles[0], { pointerId: 1 });
        }

        const allPrefs = JSON.parse(localStorage.getItem("viz:table-preferences") || "{}");
        const savedState = allPrefs[tableName] || [];
        expect(savedState).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ key: "name", visible: true }),
                expect.objectContaining({ key: "role", visible: true }),
                expect.objectContaining({ key: "team", visible: false })
            ])
        );
    });
});
