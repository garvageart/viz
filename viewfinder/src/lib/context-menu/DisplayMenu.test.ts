import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it } from "vitest";
import DisplayMenuHarness from "$lib/components/tests/harnesses/DisplayMenuHarness.svelte";
import { viewSettings } from "$lib/states/index.svelte";

describe("Display menu checkbox snippets", () => {
    beforeEach(() => {
        viewSettings.setView("custom");
        viewSettings.showDates = false;
    });

    it("renders the Show Dates checkbox in the menu", async () => {
        render(DisplayMenuHarness, {});

        await fireEvent.click(screen.getByRole("button", { name: /Display/i }));

        const checkbox = screen.getByRole("checkbox", { name: "Show Dates" });
        expect(checkbox).toBeInTheDocument();
        expect(checkbox).not.toBeChecked();
    });

    it("toggles showDates and keeps the menu open when the checkbox is clicked", async () => {
        render(DisplayMenuHarness, {});

        await fireEvent.click(screen.getByRole("button", { name: /Display/i }));

        const checkbox = screen.getByRole("checkbox", { name: "Show Dates" });
        await fireEvent.click(checkbox);

        expect(viewSettings.showDates).toBe(true);
        expect(checkbox).toBeChecked();
        expect(screen.getByRole("checkbox", { name: "Show Dates" })).toBeInTheDocument();
    });

    it("toggles showDates when the checkbox label is clicked", async () => {
        render(DisplayMenuHarness, {});

        await fireEvent.click(screen.getByRole("button", { name: /Display/i }));

        await fireEvent.click(screen.getByText("Show Dates"));

        expect(viewSettings.showDates).toBe(true);
    });
});
