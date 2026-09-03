import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Checkbox from "./Checkbox.svelte";

describe("Checkbox", () => {
    it("renders the label and binds checked state", async () => {
        let checked = false;
        render(Checkbox, { label: "Accept Terms", checked });

        const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
        expect(checkbox).toBeInTheDocument();
        expect(checkbox.checked).toBe(false);

        await fireEvent.click(checkbox);
        expect(checkbox.checked).toBe(true);
    });

    it("renders small, large, and round variants", () => {
        const { container } = render(Checkbox, {
            checked: true,
            size: "small",
            variant: "round"
        });

        const wrapper = container.querySelector(".checkbox-wrapper");
        expect(wrapper).toHaveClass("small");

        const vizCheckbox = container.querySelector(".viz-checkbox");
        expect(vizCheckbox).toHaveClass("round");
    });

    it("renders indeterminate state when checked is false", () => {
        const { container } = render(Checkbox, {
            checked: false,
            indeterminate: true
        });

        const wrapper = container.querySelector(".checkbox-wrapper");
        expect(wrapper).toHaveClass("is-indeterminate");
    });
});
