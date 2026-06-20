import { type APIRequestContext, type Page } from "@playwright/test";

/**
 * Cleans up any test-created collections from the database.
 * Destroys all collections starting with the "E2E-" prefix.
 */
export async function cleanupTestCollections(request: APIRequestContext) {
    try {
        const response = await request.get("/api/collections?limit=100");
        if (!response.ok()) {
            console.error(`Failed to list collections for cleanup: ${response.status()} ${response.statusText()}`);
            return;
        }
        const body = await response.json();
        const collections = body.items || [];
        for (const collection of collections) {
            if (collection.name.startsWith("E2E-")) {
                console.log(`Cleaning up leftover E2E collection: ${collection.name} (${collection.uid})`);
                const deleteRes = await request.delete(`/api/collections/${collection.uid}`);
                if (!deleteRes.ok()) {
                    console.error(`Failed to delete collection ${collection.uid}: ${deleteRes.status()}`);
                }
            }
        }
    } catch (err) {
        console.error("Error during collection cleanup:", err);
    }
}

/**
 * Reusable helper to simulate file drag-and-drop upload inside the browser page context.
 */
export async function performDragAndDrop(page: Page, fileBuffer: Buffer, fileName: string) {
    await page.evaluate(
        ([base64Str, name]) => {
            const binStr = atob(base64Str);
            const arr = new Uint8Array(binStr.length);
            for (let i = 0; i < binStr.length; i++) {
                arr[i] = binStr.charCodeAt(i);
            }

            const file = new File([arr], name, { type: "image/jpeg" });
            const dt = new DataTransfer();
            dt.items.add(file);

            // Override webkitGetAsEntry on the DataTransferItem instance directly to avoid native browser engine sandbox validation errors
            const item = dt.items[0];
            if (item) {
                Object.defineProperty(item, "webkitGetAsEntry", {
                    value: () => null,
                    writable: true,
                    configurable: true
                });
                Object.defineProperty(item, "kind", {
                    value: "file",
                    writable: true,
                    configurable: true
                });
            }

            // Target Svelte-managed DOM node to ensure event delegation captures bubble path
            const target = document.querySelector(".viz-view-container") || document.body;

            // Create and dispatch events synchronously on target with explicitly defined dataTransfer properties
            const dragEnterEvt = new DragEvent("dragenter", { bubbles: true, cancelable: true });
            Object.defineProperty(dragEnterEvt, "dataTransfer", { value: dt, configurable: true });
            target.dispatchEvent(dragEnterEvt);

            const dragOverEvt = new DragEvent("dragover", { bubbles: true, cancelable: true });
            Object.defineProperty(dragOverEvt, "dataTransfer", { value: dt, configurable: true });
            target.dispatchEvent(dragOverEvt);

            const dropEvt = new DragEvent("drop", { bubbles: true, cancelable: true });
            Object.defineProperty(dropEvt, "dataTransfer", { value: dt, configurable: true });
            target.dispatchEvent(dropEvt);
        },
        [fileBuffer.toString("base64"), fileName]
    );
}
