import { expect, test } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { VizMimeTypes } from "$lib/mime";
import { cleanupSpecificCollections, dispatchDrag, performDragAndDrop, trackCreatedCollections } from "./helpers";

test.describe("Drag & Drop File Upload Flow", () => {
    let createdUids: string[] = [];

    test.beforeEach(async ({ page }) => {
        createdUids = [];
        trackCreatedCollections(page, createdUids);
    });

    test.afterEach(async ({ request }) => {
        if (createdUids.length > 0) {
            await cleanupSpecificCollections(request, createdUids);
        }
    });

    test("should trigger drop overlay and perform mock file upload", async ({ page }) => {
        test.slow();
        await page.goto("/photos");
        await page.waitForLoadState("networkidle");
        await expect(page.locator(".viz-workspace, main").first()).toBeVisible({ timeout: 20000 });

        // Log all browser console logs for E2E debugging
        page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));

        // Get the test image path
        const imagePath = path.join(process.cwd(), "../resources/test/samples/DSCF0355.jpg");
        expect(fs.existsSync(imagePath)).toBe(true);

        const fileBuffer = fs.readFileSync(imagePath);
        const fileName = path.basename(imagePath);

        // Perform drop using the helper function
        await performDragAndDrop(page, fileBuffer, fileName);

        // Assert the Upload Manager successfully starts and pushes progress toasts
        await expect(page.locator(".viz-toast-success").first()).toBeVisible({
            timeout: 25000
        });
    });

    test("should bypass confirmation modal and upload directly to collection on collection page", async ({ page }) => {
        test.slow();
        page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));

        // 1. Go to collections page
        await page.goto("/collections");
        await page.waitForLoadState("domcontentloaded");
        await expect(
            page.locator(".viz-workspace, main#main, .viz-collections-container, .route-scroll, .tab-group-content").first()
        ).toBeVisible({ timeout: 20000 });
        await page.waitForTimeout(1000);

        // 2. Create a collection to drop onto
        const createBtn = page
            .locator(
                "#create-collection, #create_collection-button, button.create-collection-btn, .header-actions button"
            )
            .first();
        await expect(createBtn).toBeVisible();
        await createBtn.click();

        const modal = page.locator(".viz-modal").first();
        await expect(modal).toBeVisible();

        const collectionName = `E2E-Direct-Upload-${Date.now()}`;
        await page.fill("#collection-name", collectionName);
        await page.fill("#collection-description", "Description");

        await page.click("#collection-submit");
        await expect(modal).not.toBeVisible();

        // 3. Verify we are on the newly created collection detail page
        await expect(page.locator("#coll-name-display, .collection-header, .route-scroll, .tab-group-content").first()).toBeVisible({
            timeout: 15000
        });

        // 4. Perform Drag & Drop
        const imagePath = path.join(process.cwd(), "../resources/test/samples/DSCF0355.jpg");
        expect(fs.existsSync(imagePath)).toBe(true);

        const fileBuffer = fs.readFileSync(imagePath);
        const fileName = path.basename(imagePath);

        // Perform drop using the helper function
        await performDragAndDrop(page, fileBuffer, fileName);

        // 5. Assert that Confirmation Modal DOES NOT show up
        const confirmationModal = page.locator(".confirm-upload-modal, #viz-confirm-upload-modal").first();
        await expect(confirmationModal).not.toBeVisible({ timeout: 5000 });

        // 6. Verify that the upload starts and successful toast appears
        await expect(page.locator(".viz-toast-success").first()).toBeVisible({
            timeout: 25000
        });

        // 7. Verify upload panel minimize/restore if upload panel is active
        const uploadPanel = page.locator("#viz-upload-panel");
        if (await uploadPanel.isVisible()) {
            const minimizeBtn = uploadPanel
                .locator(".upload-panel-header button, button.minimize-btn, button.icon-button")
                .first();
            if (await minimizeBtn.isVisible()) {
                await minimizeBtn.click();
                const minimizedButton = page.locator("#viz-upload-panel-minimized-button");
                await expect(minimizedButton).toBeVisible();
                await minimizedButton.click();
                await expect(uploadPanel).toBeVisible();
            }
        }

        // 8. Try uploading the SAME image again using the helper to test duplicate key filtering
        await performDragAndDrop(page, fileBuffer, fileName);

        // Verify duplicate upload success toast shows up without throwing Svelte errors (grid rendering remains intact)
        await expect(page.locator(".viz-toast-success").first()).toBeVisible({
            timeout: 25000
        });

        // Verify toast dismiss button works correctly (UploadPanel reactivity loop fix)
        const toastCloseBtn = page.locator(".viz-toast-close").first();
        await expect(toastCloseBtn).toBeVisible();
        await toastCloseBtn.click();
        await page.waitForTimeout(500);
    });

    test("should ignore non-file drags (such as tab dragging) and not show upload overlay or error/info toast", async ({
        page
    }) => {
        // Go directly to the Photos page
        await page.goto("/photos");
        await page.waitForLoadState("domcontentloaded");
        await expect(page.locator(".viz-workspace, main").first()).toBeVisible({ timeout: 20000 });

        // Simulate dragging and dropping a non-file, internal type (like VizMimeTypes.TAB_VIEW)
        const container = page.locator(".route-scroll, .tab-group-content").first();
        await dispatchDrag(container, "dragenter", VizMimeTypes.TAB_VIEW, "test-tab-data");
        await dispatchDrag(container, "dragover", VizMimeTypes.TAB_VIEW, "test-tab-data");
        await dispatchDrag(container, "drop", VizMimeTypes.TAB_VIEW, "test-tab-data");

        // Verify that the drop overlay is NOT visible/present
        await expect(page.locator(".drop-overlay")).not.toBeVisible({ timeout: 3000 });

        // Verify that no info toast is shown
        const infoToast = page.locator(".viz-toast-info");
        await expect(infoToast).not.toBeVisible({ timeout: 3000 });
    });

    test("should ignore internal image drag and not show upload overlay", async ({ page }) => {
        await page.goto("/photos");
        await page.waitForLoadState("domcontentloaded");
        await expect(page.locator(".viz-workspace, main").first()).toBeVisible({ timeout: 20000 });

        // Simulate dragging internal VizMimeTypes.IMAGE_UIDS
        const container = page.locator(".route-scroll, .tab-group-content").first();
        await dispatchDrag(container, "dragenter", VizMimeTypes.IMAGE_UIDS, ["test-uid-1"]);
        await dispatchDrag(container, "dragover", VizMimeTypes.IMAGE_UIDS, ["test-uid-1"]);

        // Verify that the file upload drop overlay is NOT displayed
        await expect(page.locator(".drop-overlay")).not.toBeVisible({ timeout: 3000 });
    });
});
