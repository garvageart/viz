import { render } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import ModalLightboxHarness from "$lib/components/tests/harnesses/ModalLightboxHarness.svelte";

function dispatchKey(target: EventTarget, key: string, init: KeyboardEventInit = {}) {
    target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init }));
}

describe("ModalLightbox keyboard handling", () => {
    it("moves focus to the modal container on mount", () => {
        render(ModalLightboxHarness, {});

        const modal = document.querySelector(".viz-modal");
        expect(modal).not.toBeNull();
        expect(document.activeElement).toBe(modal);
    });

    it("submits the modal form when Enter is pressed on a non-interactive target", () => {
        const onFormSubmit = vi.fn();
        render(ModalLightboxHarness, { onFormSubmit });

        const text = document.getElementById("non-interactive");
        expect(text).not.toBeNull();
        dispatchKey(text as HTMLElement, "Enter");

        expect(onFormSubmit).toHaveBeenCalledTimes(1);
    });

    it("submits the modal form when Enter is pressed with the container focused", () => {
        const onFormSubmit = vi.fn();
        render(ModalLightboxHarness, { onFormSubmit });

        const modal = document.querySelector(".viz-modal");
        dispatchKey(modal as HTMLElement, "Enter");

        expect(onFormSubmit).toHaveBeenCalledTimes(1);
    });

    it("does not submit the form when Enter is pressed on a button", () => {
        const onFormSubmit = vi.fn();
        render(ModalLightboxHarness, { onFormSubmit });

        const button = document.getElementById("first-btn");
        dispatchKey(button as HTMLElement, "Enter");

        expect(onFormSubmit).not.toHaveBeenCalled();
    });

    it("does not submit the form when Enter is pressed on a textarea", () => {
        const onFormSubmit = vi.fn();
        render(ModalLightboxHarness, { onFormSubmit });

        const textarea = document.getElementById("notes-textarea");
        dispatchKey(textarea as HTMLElement, "Enter");

        expect(onFormSubmit).not.toHaveBeenCalled();
    });

    it("wraps Tab focus forward from the container to the first focusable", () => {
        render(ModalLightboxHarness, {});

        const modal = document.querySelector(".viz-modal") as HTMLElement;
        const closeBtn = document.querySelector(".viz-modal .modal-header button") as HTMLElement;

        modal.focus();
        dispatchKey(modal, "Tab");

        expect(document.activeElement).toBe(closeBtn);
    });

    it("cycles Tab forward to wrap from the last focusable", () => {
        render(ModalLightboxHarness, {});

        const modal = document.querySelector(".viz-modal") as HTMLElement;
        const closeBtn = document.querySelector(".viz-modal .modal-header button") as HTMLElement;
        const textarea = document.getElementById("notes-textarea") as HTMLElement;

        textarea.focus();
        dispatchKey(modal, "Tab");

        expect(document.activeElement).toBe(closeBtn);
    });

    it("cycles Shift+Tab backward to wrap from the first focusable", () => {
        render(ModalLightboxHarness, {});

        const modal = document.querySelector(".viz-modal") as HTMLElement;
        const closeBtn = document.querySelector(".viz-modal .modal-header button") as HTMLElement;
        const textarea = document.getElementById("notes-textarea") as HTMLElement;

        closeBtn.focus();
        dispatchKey(modal, "Tab", { shiftKey: true });

        expect(document.activeElement).toBe(textarea);
    });
});
