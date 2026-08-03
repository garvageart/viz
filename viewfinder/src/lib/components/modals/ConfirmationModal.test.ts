import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import ConfirmationModal from "./ConfirmationModal.svelte";
import { modalsManager } from "./manager/ModalManager.svelte";

vi.mock("$lib/components/modals/manager/ModalManager.svelte.ts", () => ({
    modalsManager: {
        open: vi.fn(),
        close: vi.fn(),
        dismiss: vi.fn(),
        pop: vi.fn(),
        getModals: vi.fn(() => [])
    }
}));

const COLOUR_VARIANTS = ["secondary", "danger", "warning", "success", "info", "ghost"] as const;

describe("ConfirmationModal", () => {
    it("renders cancel as a non-submit button and confirm as a submit button", () => {
        render(ConfirmationModal, {
            id: "delete-collection-modal",
            title: "Delete Collection?",
            message: "Are you sure you want to delete this collection?"
        });

        const cancel = screen.getByRole("button", { name: "Cancel" });
        const confirm = screen.getByRole("button", { name: "Confirm" });

        expect(cancel).toHaveAttribute("type", "button");
        expect(confirm).toHaveAttribute("type", "submit");
    });

    it("renders custom confirm and cancel text", () => {
        render(ConfirmationModal, {
            id: "delete-collection-modal",
            title: "Delete Collection?",
            message: "Are you sure you want to delete this collection?",
            confirmText: "Delete",
            cancelText: "Keep"
        });

        expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Keep" })).toBeInTheDocument();
    });

    it("submitting the form invokes onConfirm and closes the modal", async () => {
        const onConfirm = vi.fn();
        const { container } = render(ConfirmationModal, {
            id: "delete-collection-modal",
            title: "Delete Collection?",
            message: "Are you sure you want to delete this collection?",
            onConfirm
        });

        const form = container.querySelector<HTMLFormElement>("#confirmation-form");
        expect(form).not.toBeNull();
        await fireEvent.submit(form as HTMLFormElement);

        expect(onConfirm).toHaveBeenCalledTimes(1);
        expect(modalsManager.close).toHaveBeenCalledWith("delete-collection-modal", true);
    });

    it("closes the modal on submit even when onConfirm is not provided", async () => {
        const { container } = render(ConfirmationModal, {
            id: "delete-collection-modal",
            title: "Delete Collection?",
            message: "Are you sure you want to delete this collection?"
        });

        const form = container.querySelector<HTMLFormElement>("#confirmation-form");
        await fireEvent.submit(form as HTMLFormElement);

        expect(modalsManager.close).toHaveBeenCalledWith("delete-collection-modal", true);
    });

    it("clicking cancel invokes onCancel and dismisses the modal", async () => {
        const onCancel = vi.fn();
        render(ConfirmationModal, {
            id: "delete-collection-modal",
            title: "Delete Collection?",
            message: "Are you sure you want to delete this collection?",
            onCancel
        });

        await fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(modalsManager.dismiss).toHaveBeenCalledWith("delete-collection-modal", "cancel");
    });

    it("applies the primary variant and background by default", () => {
        render(ConfirmationModal, {
            id: "delete-collection-modal",
            title: "Delete Collection?",
            message: "Are you sure you want to delete this collection?"
        });

        const confirm = screen.getByRole("button", { name: "Confirm" });
        expect(confirm).toHaveClass("primary");
        expect(confirm.style.backgroundColor).toBe("var(--viz-primary)");
    });

    it.each(COLOUR_VARIANTS)("applies the %s variant class and no primary background", (variant) => {
        render(ConfirmationModal, {
            id: "delete-collection-modal",
            title: "Delete Collection?",
            message: "Are you sure you want to delete this collection?",
            buttonVariant: variant
        });

        const confirm = screen.getByRole("button", { name: "Confirm" });
        expect(confirm).toHaveClass(variant);
        expect(confirm.style.backgroundColor).toBe("");
    });
});
