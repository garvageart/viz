import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import EditableText from "./EditableText.svelte";

describe("EditableText", () => {
    it("renders text in display mode by default", () => {
        render(EditableText, { value: "My Photo Name" });

        expect(screen.getByText("My Photo Name")).toBeInTheDocument();
        expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });

    it("renders placeholder when value is empty", () => {
        render(EditableText, { value: "", placeholder: "Add copyright" });

        expect(screen.getByText("Add copyright")).toBeInTheDocument();
    });

    it("switches to edit mode on click", async () => {
        render(EditableText, { value: "Initial Text" });

        const displayEl = screen.getByRole("button");
        await fireEvent.click(displayEl);

        const input = screen.getByRole("textbox") as HTMLInputElement;
        expect(input).toBeInTheDocument();
        expect(input.value).toBe("Initial Text");
    });

    it("saves and exits edit mode on blur", async () => {
        const onsave = vi.fn();
        render(EditableText, { value: "Old Name", onsave });

        const displayEl = screen.getByRole("button");
        await fireEvent.click(displayEl);

        const input = screen.getByRole("textbox") as HTMLInputElement;
        await fireEvent.input(input, { target: { value: "New Name" } });
        await fireEvent.blur(input);

        expect(onsave).toHaveBeenCalledWith("New Name");
        expect(screen.getByText("New Name")).toBeInTheDocument();
        expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });

    it("does not call onsave if trimmed value did not change", async () => {
        const onsave = vi.fn();
        render(EditableText, { value: "Same Name", onsave });

        await fireEvent.click(screen.getByRole("button"));
        const input = screen.getByRole("textbox") as HTMLInputElement;
        await fireEvent.input(input, { target: { value: "  Same Name  " } });
        await fireEvent.blur(input);

        expect(onsave).not.toHaveBeenCalled();
    });

    it("cancels and restores previous value on Escape keydown", async () => {
        const onsave = vi.fn();
        const oncancel = vi.fn();
        render(EditableText, { value: "Original", onsave, oncancel });

        await fireEvent.click(screen.getByRole("button"));
        const input = screen.getByRole("textbox") as HTMLInputElement;
        await fireEvent.input(input, { target: { value: "Changed Value" } });
        await fireEvent.keyDown(input, { key: "Escape" });

        expect(onsave).not.toHaveBeenCalled();
        expect(oncancel).toHaveBeenCalled();
        expect(screen.getByText("Original")).toBeInTheDocument();
        expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });

    it("does not allow editing when editable is false", async () => {
        render(EditableText, { value: "Readonly Text", editable: false });

        expect(screen.queryByRole("button")).not.toBeInTheDocument();
        const displayEl = screen.getByText("Readonly Text");
        await fireEvent.click(displayEl);

        expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });

    it("does not allow editing when disabled", async () => {
        render(EditableText, { value: "Locked Name", disabled: true });

        expect(screen.queryByRole("button")).not.toBeInTheDocument();
        const displayEl = screen.getByText("Locked Name");
        await fireEvent.click(displayEl);

        expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
});
