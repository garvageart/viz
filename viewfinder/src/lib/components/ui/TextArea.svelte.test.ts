import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import TextArea from "./TextArea.svelte";

function getTextarea() {
    return screen.getByRole("textbox") as HTMLTextAreaElement;
}

describe("TextArea", () => {
    it("renders the label and binds the value", async () => {
        render(TextArea, { label: "Description", value: "hello i am adding text in here" });

        const textarea = getTextarea();
        expect(textarea).toBeInTheDocument();
        expect(textarea).toHaveValue("hello i am adding text in here");

        await fireEvent.input(textarea, { target: { value: "updated" } });
        expect(textarea).toHaveValue("updated");
    });

    it("defaults to no manual resizing", () => {
        render(TextArea, {});

        expect(getTextarea().style.getPropertyValue("--textarea-resize")).toBe("none");
    });

    it("honours a custom resize option", () => {
        render(TextArea, { resize: "none" });

        expect(getTextarea().style.getPropertyValue("--textarea-resize")).toBe("none");
    });

    it("applies the min and max height bounds", () => {
        render(TextArea, { minHeight: "8rem", maxHeight: "16rem" });

        expect(getTextarea().style.getPropertyValue("--textarea-min-height")).toBe("8rem");
        expect(getTextarea().style.getPropertyValue("--textarea-max-height")).toBe("16rem");
    });

    it("clamps to max height when set above", async () => {
        render(TextArea, { autoGrow: true, minHeight: "8rem", maxHeight: "16rem", value: "" });

        const textarea = getTextarea();
        Object.defineProperty(textarea, "scrollHeight", { value: 400, configurable: true });

        const originalGetComputedStyle = window.getComputedStyle;
        vi.spyOn(window, "getComputedStyle").mockImplementation((el) => {
            if (el === textarea) {
                return {
                    maxHeight: "256px",
                    borderTopWidth: "0px",
                    borderBottomWidth: "0px"
                } as unknown as CSSStyleDeclaration;
            }
            return originalGetComputedStyle.call(window, el);
        });

        await fireEvent.input(textarea, { target: { value: "many lines\n".repeat(40) } });

        expect(textarea.style.overflow).toBe("auto");
    });

    it("hides the resize dragger when autoGrow is enabled", () => {
        render(TextArea, { autoGrow: true });

        expect(getTextarea().style.getPropertyValue("--textarea-resize")).toBe("none");
    });

    it("grows with content when autoGrow is enabled", async () => {
        render(TextArea, { autoGrow: true, value: "" });

        const textarea = getTextarea();
        Object.defineProperty(textarea, "scrollHeight", { value: 120, configurable: true });

        await fireEvent.input(textarea, { target: { value: "line 1\nline 2\nline 3" } });

        expect(textarea.style.height).toBe("120px");
    });

    it("renders the description when provided", () => {
        render(TextArea, { description: "Some helper text" });

        expect(screen.getByText("Some helper text")).toBeInTheDocument();
    });
});
