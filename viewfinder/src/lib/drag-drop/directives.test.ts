import { StandardMimeTypes, VizMimeTypes } from "#lib/mime.js";
import type { ImageAsset } from "@viz/api";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dragCoordinator } from "./coordinator.svelte";
import { DragData } from "./data";
import { createImageDragItems, draggable, dropZone } from "./directives.svelte";

function createDragEvent(type: string, init: DragEventInit = {}): DragEvent {
    const dataTransfer = init.dataTransfer ?? new DataTransfer();
    dataTransfer.setDragImage = () => {};

    const event = new DragEvent(type, { bubbles: true, cancelable: true, ...init });
    Object.assign(event, { dataTransfer, ...init });

    return event;
}

describe("dropZone directive", () => {
    let container: HTMLElement;
    let child: HTMLElement;

    beforeEach(() => {
        dragCoordinator.endDrag();
        container = document.createElement("div");
        child = document.createElement("span");
        container.appendChild(child);
        document.body.appendChild(container);

        return () => {
            container.remove();
        };
    });

    it("activates on dragenter when entering from outside", () => {
        const onDragEnter = vi.fn();
        const instance = dropZone(container, {
            types: [VizMimeTypes.IMAGE_UIDS],
            onDragEnter
        });

        const event = createDragEvent("dragenter", { relatedTarget: null });
        event.dataTransfer?.setData(VizMimeTypes.IMAGE_UIDS, JSON.stringify(["uid-1"]));
        container.dispatchEvent(event);

        expect(container.classList.contains("drop-active")).toBe(true);
        expect(onDragEnter).toHaveBeenCalledTimes(1);

        instance.destroy();
    });

    it("ignores dragleave when pointer moves to a child element", () => {
        const onDragLeave = vi.fn();
        const instance = dropZone(container, {
            types: [VizMimeTypes.IMAGE_UIDS],
            onDragLeave
        });

        container.classList.add("drop-active");

        // Pointer moves from container to child element
        const event = createDragEvent("dragleave", { relatedTarget: child });
        container.dispatchEvent(event);

        expect(container.classList.contains("drop-active")).toBe(true);
        expect(onDragLeave).not.toHaveBeenCalled();

        instance.destroy();
    });

    it("deactivates on dragleave when pointer moves completely outside", () => {
        const onDragLeave = vi.fn();
        const outsideElement = document.createElement("div");
        document.body.appendChild(outsideElement);

        const instance = dropZone(container, {
            id: "test-zone",
            types: [VizMimeTypes.IMAGE_UIDS],
            onDragLeave
        });

        container.classList.add("drop-active");
        dragCoordinator.startDrag(
            [{ mimeType: VizMimeTypes.IMAGE_UIDS, payload: ["uid-1"] }],
            createDragEvent("dragstart")
        );
        dragCoordinator.setHoverTarget("test-zone", "copy", "Add to Collection");

        // Pointer moves from container to outsideElement
        const event = createDragEvent("dragleave", { relatedTarget: outsideElement });
        container.dispatchEvent(event);

        expect(container.classList.contains("drop-active")).toBe(false);
        expect(dragCoordinator.session?.actionLabel).toBeNull();
        expect(onDragLeave).toHaveBeenCalledTimes(1);

        outsideElement.remove();
        instance.destroy();
    });

    it("updates coordinator hover target on dragover", () => {
        const instance = dropZone(container, {
            id: "collection-123",
            types: [VizMimeTypes.IMAGE_UIDS],
            onDragOver: () => ({
                intent: "copy",
                label: "Add to Photos"
            })
        });

        dragCoordinator.startDrag(
            [{ mimeType: VizMimeTypes.IMAGE_UIDS, payload: ["uid-1"] }],
            createDragEvent("dragstart")
        );

        const event = createDragEvent("dragover");
        event.dataTransfer?.setData(VizMimeTypes.IMAGE_UIDS, JSON.stringify(["uid-1"]));
        container.dispatchEvent(event);

        expect(dragCoordinator.session?.targetId).toBe("collection-123");
        expect(dragCoordinator.session?.intent).toBe("copy");
        expect(dragCoordinator.session?.actionLabel).toBe("Add to Photos");

        instance.destroy();
    });

    it("removes drop-active and resets hover target on drop", async () => {
        const onDrop = vi.fn();
        const instance = dropZone(container, {
            id: "drop-test",
            types: [VizMimeTypes.IMAGE_UIDS],
            onDrop
        });

        container.classList.add("drop-active");
        dragCoordinator.startDrag(
            [{ mimeType: VizMimeTypes.IMAGE_UIDS, payload: ["uid-1"] }],
            createDragEvent("dragstart")
        );
        dragCoordinator.setHoverTarget("drop-test", "copy", "Add to Collection");

        const dropEvent = createDragEvent("drop");
        dropEvent.dataTransfer?.setData(VizMimeTypes.IMAGE_UIDS, JSON.stringify({ payload: ["uid-1"] }));
        container.dispatchEvent(dropEvent);

        expect(container.classList.contains("drop-active")).toBe(false);
        expect(dragCoordinator.session?.actionLabel).toBeNull();

        instance.destroy();
    });
});

describe("draggable directive", () => {
    let element: HTMLElement;

    beforeEach(() => {
        dragCoordinator.endDrag();
        element = document.createElement("div");
        document.body.appendChild(element);

        return () => {
            element.remove();
        };
    });

    it("adds is-dragged class and starts session on dragstart", () => {
        const instance = draggable(element, {
            items: [
                {
                    mimeType: VizMimeTypes.IMAGE_UIDS,
                    payload: ["uid-1"],
                    label: "Photo 1"
                }
            ]
        });

        const event = createDragEvent("dragstart");
        element.dispatchEvent(event);

        expect(element.classList.contains("is-dragged")).toBe(true);
        expect(dragCoordinator.isDragging).toBe(true);
        expect(dragCoordinator.session?.label).toBe("Photo 1");

        instance.destroy();
    });

    it("removes is-dragged class and ends session on dragend", () => {
        const instance = draggable(element, {
            items: [
                {
                    mimeType: VizMimeTypes.IMAGE_UIDS,
                    payload: ["uid-1"]
                }
            ]
        });

        element.dispatchEvent(createDragEvent("dragstart"));
        expect(element.classList.contains("is-dragged")).toBe(true);

        element.dispatchEvent(createDragEvent("dragend"));
        expect(element.classList.contains("is-dragged")).toBe(false);
        expect(dragCoordinator.isDragging).toBe(false);

        instance.destroy();
    });
});

describe("createImageDragItems and standard formats", () => {
    const mockAsset: ImageAsset = {
        uid: "img-123",
        name: "sunset.jpg",
        image_paths: {
            original: "/api/images/img-123/original",
            preview: "/api/images/img-123/preview",
            thumbnail: "/api/images/img-123/thumbnail"
        },
        image_metadata: {
            file_type: "image/jpeg",
            file_name: "sunset.jpg"
        }
    } as unknown as ImageAsset;

    it("attaches internal and standard MIME formats for dragged assets", () => {
        const items = createImageDragItems(mockAsset);
        const mimeTypes = items.map((item) => {
            return item.mimeType;
        });

        expect(mimeTypes).toContain(VizMimeTypes.IMAGE_UIDS);
        expect(mimeTypes).toContain(VizMimeTypes.IMAGE_URLS);
        expect(mimeTypes).toContain(StandardMimeTypes.URI_LIST);
        expect(mimeTypes).toContain(StandardMimeTypes.TEXT_PLAIN);
        expect(mimeTypes).toContain(StandardMimeTypes.DOWNLOAD_URL);

        const uriItem = items.find((item) => {
            return item.mimeType === StandardMimeTypes.URI_LIST;
        });
        expect(typeof uriItem?.payload).toBe("string");
        expect((uriItem?.payload as string).length).toBeGreaterThan(0);
        expect((uriItem?.payload as string).includes("/api/images/img-123/original")).toBe(true);

        const downloadItem = items.find((item) => {
            return item.mimeType === StandardMimeTypes.DOWNLOAD_URL;
        });
        expect((downloadItem?.payload as string).startsWith("image/jpeg:sunset.jpg:")).toBe(true);
    });

    it("serializes standard formats as plain strings instead of JSON", () => {
        const dataTransfer = new DataTransfer();
        const textData = new DragData(StandardMimeTypes.TEXT_PLAIN, "https://example.com/photo.jpg");
        textData.setData(dataTransfer);

        expect(dataTransfer.getData(StandardMimeTypes.TEXT_PLAIN)).toBe("https://example.com/photo.jpg");

        const recovered = DragData.getData<string>(dataTransfer, StandardMimeTypes.TEXT_PLAIN);
        expect(recovered?.payload).toBe("https://example.com/photo.jpg");

        DragData.clear();
    });
});
