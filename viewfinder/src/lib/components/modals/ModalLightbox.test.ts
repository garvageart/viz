import ModalLightboxHarness from "#lib/components/tests/harnesses/ModalLightboxHarness.svelte";
import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";

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
