import { fireEvent, render } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import InputNumber from "./InputNumber.svelte";

describe("InputNumber", () => {
    it("renders with initial value and binds correctly", () => {
        const { container } = render(InputNumber, { value: 42 });

        const input = container.querySelector<HTMLInputElement>(".input-number-field");
        expect(input).toBeInTheDocument();
        expect(input?.value).toBe("42");
        expect(input).toHaveAttribute("aria-valuenow", "42");
    });

    it("renders placeholder when value is undefined", () => {
        const { container } = render(InputNumber, { placeholder: "Min" });

        const input = container.querySelector<HTMLInputElement>(".input-number-field");
        expect(input?.value).toBe("");
        expect(input).toHaveAttribute("placeholder", "Min");
    });

    it("renders label and description when provided", () => {
        const { container } = render(InputNumber, {
            label: "ISO Sensitivity",
            description: "Sensor sensitivity range"
        });

        const label = container.querySelector(".input-label");
        const description = container.querySelector(".input-description");

        expect(label).toBeInTheDocument();
        expect(description).toBeInTheDocument();
    });

    it("increments and decrements value with stepper buttons", async () => {
        const onchange = vi.fn();
        const oninput = vi.fn();

        const { container } = render(InputNumber, {
            value: 10,
            step: 2,
            onchange,
            oninput
        });

        const incBtn = container.querySelector<HTMLButtonElement>(".stepper-btn.increment-btn");
        const decBtn = container.querySelector<HTMLButtonElement>(".stepper-btn.decrement-btn");
        const input = container.querySelector<HTMLInputElement>(".input-number-field");

        if (incBtn) {
            await fireEvent.pointerDown(incBtn);
            await fireEvent.pointerUp(incBtn);
        }

        expect(input?.value).toBe("12");
        expect(oninput).toHaveBeenCalledWith(12);
        expect(onchange).toHaveBeenCalledWith(12);

        if (decBtn) {
            await fireEvent.pointerDown(decBtn);
            await fireEvent.pointerUp(decBtn);
        }

        expect(input?.value).toBe("10");
        expect(oninput).toHaveBeenCalledWith(10);
        expect(onchange).toHaveBeenCalledWith(10);
    });

    it("clamps value within min and max bounds", async () => {
        const { container, unmount } = render(InputNumber, {
            value: 99,
            min: 0,
            max: 100,
            step: 5
        });

        const incBtn = container.querySelector<HTMLButtonElement>(".stepper-btn.increment-btn");
        const input = container.querySelector<HTMLInputElement>(".input-number-field");

        if (incBtn) {
            await fireEvent.pointerDown(incBtn);
            await fireEvent.pointerUp(incBtn);
        }

        expect(input?.value).toBe("100");
        expect(incBtn).toBeDisabled();
        unmount();

        const { container: c2, unmount: unmount2 } = render(InputNumber, {
            value: 2,
            min: 0,
            max: 100,
            step: 5
        });

        const decBtn2 = c2.querySelector<HTMLButtonElement>(".stepper-btn.decrement-btn");
        const input2 = c2.querySelector<HTMLInputElement>(".input-number-field");

        if (decBtn2) {
            await fireEvent.pointerDown(decBtn2);
            await fireEvent.pointerUp(decBtn2);
        }

        expect(input2?.value).toBe("0");
        unmount2();
    });

    it("increments from blank state and decrements back to blank", async () => {
        const onchange = vi.fn();
        const { container } = render(InputNumber, {
            min: 100,
            max: 12800,
            step: 100,
            onchange
        });

        const incBtn = container.querySelector<HTMLButtonElement>(".stepper-btn.increment-btn");
        const decBtn = container.querySelector<HTMLButtonElement>(".stepper-btn.decrement-btn");
        const input = container.querySelector<HTMLInputElement>(".input-number-field");

        expect(input?.value).toBe("");

        if (incBtn) {
            await fireEvent.pointerDown(incBtn);
            await fireEvent.pointerUp(incBtn);
        }

        expect(input?.value).toBe("100");
        expect(onchange).toHaveBeenCalledWith(100);

        if (decBtn) {
            await fireEvent.pointerDown(decBtn);
            await fireEvent.pointerUp(decBtn);
        }

        expect(input?.value).toBe("");
        expect(onchange).toHaveBeenCalledWith(undefined);
    });

    it("handles keyboard navigation (ArrowUp, ArrowDown, PageUp, PageDown, Home, End)", async () => {
        const { container } = render(InputNumber, {
            value: 50,
            min: 10,
            max: 100,
            step: 1
        });

        const input = container.querySelector<HTMLInputElement>(".input-number-field");
        if (!input) {
            return;
        }

        await fireEvent.keyDown(input, { key: "ArrowUp" });
        expect(input.value).toBe("51");

        await fireEvent.keyDown(input, { key: "ArrowDown" });
        expect(input.value).toBe("50");

        await fireEvent.keyDown(input, { key: "PageUp" });
        expect(input.value).toBe("60");

        await fireEvent.keyDown(input, { key: "PageDown" });
        expect(input.value).toBe("50");

        await fireEvent.keyDown(input, { key: "Home" });
        expect(input.value).toBe("10");

        await fireEvent.keyDown(input, { key: "End" });
        expect(input.value).toBe("100");
    });

    it("handles manual text input and blur clamping", async () => {
        const onchange = vi.fn();
        const oninput = vi.fn();

        const { container } = render(InputNumber, {
            value: 10,
            min: 5,
            max: 50,
            onchange,
            oninput
        });

        const input = container.querySelector<HTMLInputElement>(".input-number-field");
        if (!input) {
            return;
        }

        await fireEvent.input(input, { target: { value: "35" } });
        expect(oninput).toHaveBeenCalledWith(35);

        await fireEvent.blur(input);
        expect(input.value).toBe("35");
        expect(onchange).toHaveBeenCalledWith(35);

        await fireEvent.input(input, { target: { value: "100" } });
        await fireEvent.blur(input);
        expect(input.value).toBe("50");
        expect(onchange).toHaveBeenCalledWith(50);
    });

    it("clears value when text input is emptied on blur", async () => {
        const onchange = vi.fn();
        const oninput = vi.fn();

        const { container } = render(InputNumber, {
            value: 10,
            placeholder: "Empty",
            onchange,
            oninput
        });

        const input = container.querySelector<HTMLInputElement>(".input-number-field");
        if (!input) {
            return;
        }

        await fireEvent.input(input, { target: { value: "" } });
        await fireEvent.blur(input);

        expect(input.value).toBe("");
        expect(onchange).toHaveBeenCalledWith(undefined);
    });

    it("respects disabled and readonly states", async () => {
        const { container } = render(InputNumber, {
            value: 20,
            disabled: true
        });

        const input = container.querySelector<HTMLInputElement>(".input-number-field");
        const incBtn = container.querySelector<HTMLButtonElement>(".stepper-btn.increment-btn");
        const decBtn = container.querySelector<HTMLButtonElement>(".stepper-btn.decrement-btn");

        expect(input).toBeDisabled();
        expect(incBtn).toBeDisabled();
        expect(decBtn).toBeDisabled();

        if (incBtn) {
            await fireEvent.pointerDown(incBtn);
        }
        expect(input?.value).toBe("20");

        if (input) {
            await fireEvent.keyDown(input, { key: "ArrowUp" });
        }
        expect(input?.value).toBe("20");
    });

    it("applies compact styling variant", () => {
        const { container } = render(InputNumber, {
            value: 5,
            compact: true
        });

        const wrapper = container.querySelector(".viz-input-number-wrapper");
        expect(wrapper).toHaveClass("compact");
    });
});
