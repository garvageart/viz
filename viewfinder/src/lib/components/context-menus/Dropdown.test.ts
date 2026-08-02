import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import ModalZContextHarness from "$lib/components/tests/harnesses/ModalZContextHarness.svelte";
import Dropdown from "./Dropdown.svelte";

function pointerClick(target: Element) {
    fireEvent.pointerDown(target);
    fireEvent.pointerUp(target);
    return fireEvent.click(target);
}

describe("Dropdown", () => {
    it("opens the menu when the trigger button is clicked", async () => {
        render(Dropdown, {
            props: {
                title: "Sort",
                iconName: "sort",
                items: [
                    { id: "sort-name", label: "Name" },
                    { id: "sort-taken_at", label: "Taken At" }
                ]
            }
        });

        const button = screen.getByRole("button", { name: "Sort" });
        await pointerClick(button);

        expect(screen.getByText("Name")).toBeInTheDocument();
        expect(screen.getByText("Taken At")).toBeInTheDocument();
    });

    it("portals the menu above the modal overlay when opened inside a modal", async () => {
        render(ModalZContextHarness, { props: { zIndex: 100001 } });

        const button = screen.getByRole("button", { name: "Sort" });
        await pointerClick(button);

        const menu = document.querySelector(".context-menu") as HTMLElement;
        expect(menu).toBeInTheDocument();
        expect(menu.style.zIndex).toBe("100002");
    });

    it("selects an item and closes the menu", async () => {
        const onSelect = vi.fn();
        render(Dropdown, {
            props: {
                title: "Sort",
                iconName: "sort",
                items: [
                    { id: "sort-name", label: "Name" },
                    { id: "sort-taken_at", label: "Taken At" }
                ],
                onSelect
            }
        });

        const button = screen.getByRole("button", { name: "Sort" });
        await pointerClick(button);
        await fireEvent.click(screen.getByText("Name"));

        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(screen.queryByText("Taken At")).not.toBeInTheDocument();
    });
});
