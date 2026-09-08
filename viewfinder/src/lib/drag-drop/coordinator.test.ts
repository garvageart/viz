import { beforeEach, describe, expect, it } from "vitest";
import { VizMimeTypes } from "$lib/mime";
import { dragCoordinator } from "./coordinator.svelte";

function createDragEvent(overrides: Partial<DragEvent> = {}): DragEvent {
    const dataTransfer = new DataTransfer();
    dataTransfer.setDragImage = () => {};

    return {
        dataTransfer,
        clientX: 0,
        clientY: 0,
        shiftKey: false,
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        ...overrides
    } as unknown as DragEvent;
}

describe("DragCoordinator", () => {
    beforeEach(() => {
        dragCoordinator.endDrag();
    });

    it("starts with no active session", () => {
        expect(dragCoordinator.isDragging).toBe(false);
        expect(dragCoordinator.session).toBeNull();
    });

    it("starts drag and sets up session correctly", () => {
        dragCoordinator.startDrag(
            [
                {
                    mimeType: VizMimeTypes.IMAGE_UIDS,
                    payload: ["uid-1", "uid-2"],
                    label: "2 photos"
                }
            ],
            createDragEvent({ clientX: 100, clientY: 200, shiftKey: true })
        );

        expect(dragCoordinator.isDragging).toBe(true);
        expect(dragCoordinator.session?.primaryMimeType).toBe(VizMimeTypes.IMAGE_UIDS);
        expect(dragCoordinator.session?.label).toBe("2 photos");
        expect(dragCoordinator.session?.coords).toEqual({ x: 100, y: 200 });
        expect(dragCoordinator.session?.modifiers.shiftKey).toBe(true);
    });

    it("updates target and actionLabel via setHoverTarget and direct assignment", () => {
        dragCoordinator.startDrag([{ mimeType: VizMimeTypes.IMAGE_UIDS, payload: ["uid-1"] }], createDragEvent());

        dragCoordinator.setHoverTarget("tab-1", "copy", "Add to Collection");
        expect(dragCoordinator.session?.targetId).toBe("tab-1");
        expect(dragCoordinator.session?.intent).toBe("copy");
        expect(dragCoordinator.session?.actionLabel).toBe("Add to Collection");

        if (dragCoordinator.session) {
            dragCoordinator.session.actionLabel = "Custom Label";
        }
        expect(dragCoordinator.session?.actionLabel).toBe("Custom Label");
    });

    it("cleans up session on endDrag", () => {
        dragCoordinator.startDrag([{ mimeType: VizMimeTypes.IMAGE_UIDS, payload: ["uid-1"] }], createDragEvent());

        expect(dragCoordinator.isDragging).toBe(true);
        dragCoordinator.endDrag();
        expect(dragCoordinator.isDragging).toBe(false);
        expect(dragCoordinator.session).toBeNull();
    });
});
