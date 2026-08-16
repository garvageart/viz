import { type APIRequestContext, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";
import { defaults, deleteImagesBulk } from "$lib/api";

/**
 * Configures the generated API client's base URL to match the Playwright test server.
 * Called once from auth.setup.ts before all tests run.
 */
export function configureApiClient() {
    const port = process.env.PLAYWRIGHT_PREVIEW ? 7778 : 7777;
    const baseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL || `http://localhost:${port}`;
    defaults.baseUrl = `${baseUrl}/api`;
}

/**
 * Reads the cached user admin status from e2e/.auth/user_info.json saved during auth setup.
 */
export function isUserAdmin(): boolean {
    const userInfoPath = path.join(process.cwd(), "e2e/.auth/user_info.json");
    if (fs.existsSync(userInfoPath)) {
        try {
            const info = JSON.parse(fs.readFileSync(userInfoPath, "utf-8"));
            return !!info.isAdmin;
        } catch {
            return false;
        }
    }
    return false;
}

/**
 * Intercepts POST /api/images responses on a page and records uploaded image UIDs for teardown cleanup.
 */
export function trackUploadedImages(page: Page) {
    page.on("response", async (response) => {
        if (response.url().includes("/api/images") && response.request().method() === "POST") {
            try {
                const json = (await response.json()) as { uid?: string };
                if (json && typeof json.uid === "string" && json.uid.length > 0) {
                    recordTestImageUid(json.uid);
                }
            } catch {
                // Ignore non-JSON
            }
        }
    });
}

/**
 * Intercepts POST /api/collections responses on a page and pushes created collection UIDs into target array.
 */
export function trackCreatedCollections(page: Page, targetArray: string[]) {
    page.on("response", async (response) => {
        if (response.url().includes("/api/collections") && response.request().method() === "POST") {
            try {
                const json = (await response.json()) as { uid?: string };
                if (json && typeof json.uid === "string" && json.uid.length > 0) {
                    if (!targetArray.includes(json.uid)) {
                        targetArray.push(json.uid);
                    }
                }
            } catch {
                // Ignore non-JSON
            }
        }
    });
}

function recordTestImageUid(uid: string) {
    const authDir = path.join(process.cwd(), "e2e/.auth");
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
    }
    const filePath = path.join(authDir, "test_images.json");
    let uids: string[] = [];
    if (fs.existsSync(filePath)) {
        try {
            uids = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        } catch {
            uids = [];
        }
    }
    if (!uids.includes(uid)) {
        uids.push(uid);
        fs.writeFileSync(filePath, JSON.stringify(uids));
    }
}

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
 * Cleans up specific test-created collections by their UIDs.
 */
export async function cleanupSpecificCollections(request: APIRequestContext, uids: string[]) {
    if (!uids || uids.length === 0) {
        return;
    }

    for (const uid of uids) {
        try {
            await request.delete(`/api/collections/${uid}`);
        } catch (err) {
            console.error(`Error deleting collection ${uid}:`, err);
        }
    }
}

/**
 * Reusable helper to simulate file drag-and-drop upload inside the browser page context.
 */
export async function performDragAndDrop(page: Page, fileBuffer: Buffer, fileName: string) {
    trackUploadedImages(page);
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

/**
 * Cleans up specific E2E photos by their exact UIDs.
 */
export async function cleanupTestPhotos(request: APIRequestContext, uids: string[]) {
    if (!uids || uids.length === 0) {
        return;
    }

    try {
        configureApiClient();

        // Extract session cookies from Playwright to authenticate native fetch calls
        const state = await request.storageState();
        const cookieHeader = state.cookies.map((c) => `${c.name}=${c.value}`).join("; ");

        const authOpts = {
            headers: { Cookie: cookieHeader }
        };

        console.log(`Cleaning up leftover E2E photos via SDK: ${uids.join(", ")}`);
        const deleteRes = await deleteImagesBulk({ uids, force: true }, authOpts);

        if (deleteRes.status !== 200 && deleteRes.status !== 207) {
            console.error(`Failed to delete photos: ${deleteRes.status}`);
        }
    } catch (err) {
        console.error("Error during photo cleanup:", err);
    }
}
