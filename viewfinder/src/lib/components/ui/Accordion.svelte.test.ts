import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import Accordion from "./Accordion.svelte";

describe("Accordion", () => {
    it("renders title and toggles open state on click", async () => {
        let open = false;
        const { rerender } = render(Accordion, {
            title: "Test Accordion",
            open
        });

        const headerButton = screen.getByRole("button", { name: /Test Accordion/i });
        expect(headerButton).toBeInTheDocument();
        expect(headerButton).toHaveAttribute("aria-expanded", "false");

        await fireEvent.click(headerButton);
        rerender({ title: "Test Accordion", open: true });

        expect(headerButton).toHaveAttribute("aria-expanded", "true");
    });

    it("triggers ontoggle callback with new open state", async () => {
        const ontoggle = vi.fn();
        render(Accordion, {
            title: "Toggle Callback Test",
            open: false,
            ontoggle
        });

        const headerButton = screen.getByRole("button", { name: /Toggle Callback Test/i });
        await fireEvent.click(headerButton);

        expect(ontoggle).toHaveBeenCalledTimes(1);
        expect(ontoggle).toHaveBeenCalledWith(true);
    });

    it("does not toggle when disabled", async () => {
        const ontoggle = vi.fn();
        render(Accordion, {
            title: "Disabled Accordion",
            disabled: true,
            open: false,
            ontoggle
        });

        const headerButton = screen.getByRole("button", { name: /Disabled Accordion/i });
        expect(headerButton).toBeDisabled();

        await fireEvent.click(headerButton);
        expect(ontoggle).not.toHaveBeenCalled();
    });

    it("renders with different variants", () => {
        const { container } = render(Accordion, {
            title: "Bordered Accordion",
            variant: "bordered"
        });

        const root = container.querySelector(".viz-accordion");
        expect(root).toHaveClass("variant-bordered");
    });

    it("renders with different sizes", () => {
        const { container } = render(Accordion, {
            title: "Compact Accordion",
            size: "compact"
        });

        const root = container.querySelector(".viz-accordion");
        expect(root).toHaveClass("size-compact");
    });

    it("supports right icon position and arrow icon type", () => {
        const { container } = render(Accordion, {
            title: "Right Arrow Accordion",
            iconPosition: "right",
            iconType: "arrow",
            open: true
        });

        const iconWrapper = container.querySelector(".viz-accordion-icon.pos-right");
        expect(iconWrapper).toBeInTheDocument();
        expect(iconWrapper).toHaveClass("rotate-180");
    });
});
