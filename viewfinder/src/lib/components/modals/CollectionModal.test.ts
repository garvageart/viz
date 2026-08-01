import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import CollectionModal from "./CollectionModal.svelte";

describe("CollectionModal", () => {
    it("renders a single submit button and a non-submit toggle", () => {
        render(CollectionModal, {
            props: { heading: "Edit Collection", buttonText: "Save", modalAction: vi.fn() }
        });

        const toggle = screen.getByRole("switch");
        expect(toggle).toHaveAttribute("type", "button");

        const submitButtons = screen.getAllByText("Save").filter((el) => el.tagName === "INPUT");
        expect(submitButtons).toHaveLength(1);
        expect(submitButtons[0]).toHaveAttribute("type", "submit");
    });

    it("submits the form and invokes modalAction on submit", async () => {
        const modalAction = vi.fn();
        const { container } = render(CollectionModal, {
            props: { heading: "Edit Collection", buttonText: "Save", modalAction }
        });

        const form = container.querySelector<HTMLFormElement>("#collection-form");
        expect(form).not.toBeNull();
        await fireEvent.submit(form as HTMLFormElement);

        expect(modalAction).toHaveBeenCalledTimes(1);
        expect(modalAction).toHaveBeenCalledWith({ name: "", description: "", private: false });
    });
});
