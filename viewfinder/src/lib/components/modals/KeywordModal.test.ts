import { fireEvent, render, screen } from "@testing-library/svelte";
import type { Keyword } from "@viz/api";
import { describe, expect, it, vi } from "vitest";
import KeywordModal from "./KeywordModal.svelte";

vi.mock("#lib/components/modals/manager/ModalManager.svelte.ts", () => ({
    modalsManager: {
        open: vi.fn(),
        close: vi.fn(),
        dismiss: vi.fn(),
        pop: vi.fn(),
        getModals: vi.fn(() => [])
    }
}));

vi.mock("@viz/api", () => ({
    listKeywords: vi.fn(async () => ({
        status: 200,
        data: { keywords: [] }
    })),
    createKeyword: vi.fn(async (payload) => ({
        status: 201,
        data: { uid: "kw-new", name: payload.name, created_at: "", updated_at: "" }
    }))
}));

const mockKeywords: Keyword[] = [
    { uid: "kw-1", name: "nature", created_at: "", updated_at: "" },
    { uid: "kw-2", name: "portrait", created_at: "", updated_at: "" }
];

describe("KeywordModal", () => {
    it("renders create mode and submits valid keyword data", async () => {
        const modalAction = vi.fn();
        const { container } = render(KeywordModal, {
            mode: "create",
            heading: "Create Keyword",
            buttonText: "Create Keyword",
            keywords: mockKeywords,
            modalAction
        });

        const nameInput = container.querySelector<HTMLInputElement>("#keyword-name");
        expect(nameInput).not.toBeNull();

        await fireEvent.input(nameInput as HTMLInputElement, { target: { value: "landscape" } });

        const form = container.querySelector<HTMLFormElement>("#keyword-form");
        expect(form).not.toBeNull();
        await fireEvent.submit(form as HTMLFormElement);

        expect(modalAction).toHaveBeenCalledWith({
            name: "landscape",
            colour: undefined,
            parent: undefined
        });
    });

    it("renders edit mode with existing keyword data pre-filled", async () => {
        const modalAction = vi.fn();
        const keywordToEdit: Keyword = {
            uid: "kw-1",
            name: "nature",
            colour: "#33aa55",
            created_at: "",
            updated_at: ""
        };

        const { container } = render(KeywordModal, {
            mode: "edit",
            heading: "Edit Keyword",
            buttonText: "Save Changes",
            data: keywordToEdit,
            keywords: mockKeywords,
            modalAction
        });

        const nameInput = container.querySelector<HTMLInputElement>("#keyword-name");
        expect(nameInput?.value).toBe("nature");

        const colourInput = container.querySelector<HTMLInputElement>("#keyword-colour-picker");
        expect(colourInput?.value).toBe("#33aa55");

        const form = container.querySelector<HTMLFormElement>("#keyword-form");
        await fireEvent.submit(form as HTMLFormElement);

        expect(modalAction).toHaveBeenCalledWith({
            name: "nature",
            colour: "#33aa55",
            parent: undefined
        });
    });

    it("renders add mode and supports adding and removing keywords with badges", async () => {
        const onAdd = vi.fn();
        const { container } = render(KeywordModal, {
            mode: "add",
            heading: "Add Keywords",
            buttonText: "Save Keywords",
            keywords: mockKeywords,
            selectedKeywords: [{ name: "nature" }],
            onAdd
        });

        expect(screen.getByText("nature")).toBeInTheDocument();

        // Search and select portrait from suggestions
        const input = container.querySelector<HTMLInputElement>("#keyword-search-input");
        expect(input).not.toBeNull();

        await fireEvent.input(input as HTMLInputElement, { target: { value: "port" } });
        const suggestion = screen.getByText("portrait");
        await fireEvent.pointerDown(suggestion);
        await fireEvent.pointerUp(suggestion);

        expect(screen.getByText("portrait")).toBeInTheDocument();

        // Remove the nature badge
        const removeButtons = container.querySelectorAll<HTMLButtonElement>(".keyword-remove-btn");
        expect(removeButtons.length).toBe(2);
        await fireEvent.click(removeButtons[0]);

        expect(container.querySelector(".keywords-list")?.textContent).not.toContain("nature");

        // Submit form
        const form = container.querySelector<HTMLFormElement>("#keyword-form");
        await fireEvent.submit(form as HTMLFormElement);

        expect(onAdd).toHaveBeenCalledWith([{ name: "portrait", colour: undefined, parent: undefined }]);
    });

    it("supports adding comma-separated keywords via input in add mode", async () => {
        const onAdd = vi.fn();
        const { container } = render(KeywordModal, {
            mode: "add",
            heading: "Add Keywords",
            buttonText: "Save Keywords",
            keywords: mockKeywords,
            selectedKeywords: [],
            onAdd
        });

        const searchInput = container.querySelector<HTMLInputElement>("#keyword-search-input");
        expect(searchInput).not.toBeNull();

        await fireEvent.input(searchInput as HTMLInputElement, { target: { value: "sunset, ocean" } });
        await fireEvent.keyDown(searchInput as HTMLInputElement, { key: "Enter" });
        await new Promise((r) => setTimeout(r, 20));

        expect(screen.getByText("sunset")).toBeInTheDocument();
        expect(screen.getByText("ocean")).toBeInTheDocument();

        const form = container.querySelector<HTMLFormElement>("#keyword-form");
        await fireEvent.submit(form as HTMLFormElement);

        expect(onAdd).toHaveBeenCalledWith([{ name: "sunset" }, { name: "ocean" }]);
    });

    it("adds matching keyword when Enter is pressed on search input without closing modal", async () => {
        const onAdd = vi.fn();
        const { container } = render(KeywordModal, {
            mode: "add",
            heading: "Add Keywords",
            buttonText: "Save Keywords",
            keywords: mockKeywords,
            selectedKeywords: [],
            onAdd
        });

        const searchInput = container.querySelector<HTMLInputElement>("#keyword-search-input");
        expect(searchInput).not.toBeNull();

        // Type "port" (matches "portrait" in mockKeywords)
        await fireEvent.input(searchInput as HTMLInputElement, { target: { value: "port" } });
        await fireEvent.keyDown(searchInput as HTMLInputElement, { key: "Enter" });

        // Portrait badge should now exist
        expect(screen.getByText("portrait")).toBeInTheDocument();
        // Modal should not have been submitted or closed
        expect(onAdd).not.toHaveBeenCalled();
    });

    it("renders create button next to combobox for new keyword and creates it on click", async () => {
        const onAdd = vi.fn();
        const { container } = render(KeywordModal, {
            mode: "add",
            heading: "Add Keywords",
            buttonText: "Save Keywords",
            keywords: mockKeywords,
            selectedKeywords: [],
            onAdd
        });

        const searchInput = container.querySelector<HTMLInputElement>("#keyword-search-input");
        expect(searchInput).not.toBeNull();

        // When input is empty, create button should not exist
        expect(container.querySelector(".create-keyword-btn")).toBeNull();

        // When typing an existing keyword, create button should not exist
        await fireEvent.input(searchInput as HTMLInputElement, { target: { value: "nature" } });
        expect(container.querySelector(".create-keyword-btn")).toBeNull();

        // When typing a new keyword, create button should appear
        await fireEvent.input(searchInput as HTMLInputElement, { target: { value: "Concert" } });
        const createBtn = container.querySelector<HTMLButtonElement>(".create-keyword-btn");
        expect(createBtn).not.toBeNull();

        // Click create button
        await fireEvent.click(createBtn as HTMLButtonElement);

        // Keyword should now be added as a badge
        expect(screen.getByText("Concert")).toBeInTheDocument();
        // Input should be cleared
        expect(searchInput?.value).toBe("");
        // Create button should disappear
        expect(container.querySelector(".create-keyword-btn")).toBeNull();

        // Submit form
        const form = container.querySelector<HTMLFormElement>("#keyword-form");
        await fireEvent.submit(form as HTMLFormElement);

        expect(onAdd).toHaveBeenCalledWith([{ name: "Concert", colour: undefined, parent: undefined }]);
    });

    it("disables save button in add mode when no changes exist and enables when changes occur", async () => {
        const onAdd = vi.fn();
        const { container } = render(KeywordModal, {
            mode: "add",
            heading: "Add Keywords",
            buttonText: "Save Keywords",
            keywords: mockKeywords,
            selectedKeywords: [{ name: "nature" }],
            onAdd
        });

        const submitBtn = container.querySelector<HTMLButtonElement>("button[type='submit']");
        expect(submitBtn).not.toBeNull();

        // Initially no changes, button should be disabled
        expect(submitBtn?.disabled).toBe(true);

        // Remove the existing keyword -> changes exist, button should be enabled
        const removeBtn = container.querySelector<HTMLButtonElement>(".keyword-remove-btn");
        expect(removeBtn).not.toBeNull();
        await fireEvent.click(removeBtn as HTMLButtonElement);

        expect(submitBtn?.disabled).toBe(false);

        // Add back the same keyword -> back to original state, button should be disabled again
        const searchInput = container.querySelector<HTMLInputElement>("#keyword-search-input");
        await fireEvent.input(searchInput as HTMLInputElement, { target: { value: "nature" } });
        await fireEvent.keyDown(searchInput as HTMLInputElement, { key: "Enter" });
        await new Promise((r) => setTimeout(r, 20));

        expect(submitBtn?.disabled).toBe(true);
    });

    it("closes combobox dropdown on Escape without closing modal", async () => {
        const onAdd = vi.fn();
        const { container } = render(KeywordModal, {
            mode: "add",
            heading: "Add Keywords",
            buttonText: "Save Keywords",
            keywords: mockKeywords,
            selectedKeywords: [],
            onAdd
        });

        const searchInput = container.querySelector<HTMLInputElement>("#keyword-search-input");
        expect(searchInput).not.toBeNull();

        // Focus input to open combobox
        await fireEvent.focus(searchInput as HTMLInputElement);

        // Press Escape on search input
        const escEvent = new KeyboardEvent("keydown", { key: "Escape", cancelable: true, bubbles: true });
        searchInput?.dispatchEvent(escEvent);

        // Event should be defaultPrevented and stopped from bubbling
        expect(escEvent.defaultPrevented).toBe(true);
        // Modal should not have been submitted or closed
        expect(onAdd).not.toHaveBeenCalled();
    });
});
