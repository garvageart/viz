import { expect, test } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { cleanupTestCollections, performDragAndDrop } from "./helpers";

test.describe("Drag & Drop File Upload Flow", () => {
    test.beforeEach(async ({ request }) => {
        await cleanupTestCollections(request);
    });

    test.afterEach(async ({ request }) => {
        await cleanupTestCollections(request);
    });

    test("should trigger drop overlay and perform mock file upload", async ({ page }) => {
        test.slow();
        // Go directly to the Photos page
        await page.goto("/photos");
        await page.waitForLoadState("networkidle");

        // Confirm Photos page is fully loaded and visible
        await expect(page.locator(".viz-view-container")).toBeVisible({ timeout: 20000 });

        // Log all browser console logs for E2E debugging
        page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));

        // Get the test image path
        const imagePath = path.join(process.cwd(), "../resources/test/images/DSCF0355.jpg");
        expect(fs.existsSync(imagePath)).toBe(true);

        const fileBuffer = fs.readFileSync(imagePath);
        const fileName = path.basename(imagePath);

        // Perform drop using the helper function
        await performDragAndDrop(page, fileBuffer, fileName);

        // Confirm drop overlay triggered and Confirmation modal opened
        const modalText = page.getByText("How would you like to upload them?");
        await expect(modalText).toBeVisible({ timeout: 20000 });

        // Click "Upload Individually" to submit the upload candidate
        const uploadIndivBtn = page.locator("button").filter({ hasText: "Upload Individually" });
        await expect(uploadIndivBtn).toBeVisible();
        await uploadIndivBtn.click();

        // Assert the Upload Manager successfully starts and pushes progress toasts
        await expect(page.locator(".viz-toast-success").filter({ hasText: "Successfully uploaded" })).toBeVisible({
            timeout: 25000
        });
    });

    test("should bypass confirmation modal and upload directly to collection on collection page", async ({ page }) => {
        test.slow();
        page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));

        // 1. Go to collections page
        await page.goto("/collections");
        await page.waitForLoadState("networkidle");
        await expect(page.locator(".viz-view-container")).toBeVisible({ timeout: 20000 });

        // 2. Open Create Collection Modal and create a test collection
        const createBtn = page.getByRole("button", { name: "Create Collection" }).first();
        await expect(createBtn).toBeVisible({ timeout: 10000 });
        await createBtn.click();
        await expect(page.locator("#viz-collection-modal")).toBeVisible();

        const collectionName = `E2E-Direct-Upload-${Date.now()}`;
        await page.locator("#collection-name").fill(collectionName);
        await page.locator("#collection-description").fill("Description");
        await page.locator("#collection-submit").click();
        await expect(page.locator("#viz-collection-modal")).not.toBeVisible({ timeout: 10000 });

        // Go back to the main collections view to reload/render the new collection card
        await page.goto("/collections");
        await page.waitForLoadState("networkidle");

        // 3. Find and double-click the newly created collection card to navigate to its details page
        const collCard = page.locator(".coll-card").filter({ hasText: collectionName });
        await expect(collCard.first()).toBeVisible({ timeout: 15000 });
        await collCard.first().dblclick();

        // Wait for collection page to load and confirm we are on the collection detail page
        await page.waitForLoadState("networkidle");
        await expect(page.locator("#coll-name-display")).toBeVisible({ timeout: 20000 });
        await expect(page.locator("#coll-name-display")).toContainText(collectionName);

        // 4. Perform Drag & Drop
        const imagePath = path.join(process.cwd(), "../resources/test/images/DSCF0355.jpg");
        expect(fs.existsSync(imagePath)).toBe(true);

        const fileBuffer = fs.readFileSync(imagePath);
        const fileName = path.basename(imagePath);

        // Perform drop using the helper function
        await performDragAndDrop(page, fileBuffer, fileName);

        // 5. Assert that Confirmation Modal DOES NOT show up
        const modalText = page.getByText("How would you like to upload them?");
        await expect(modalText).not.toBeVisible({ timeout: 5000 });

        // 6. Verify that the upload starts and successful toast appears
        await expect(page.locator(".viz-toast-success").filter({ hasText: "Successfully uploaded" })).toBeVisible({
            timeout: 25000
        });

        // 7. Verify upload panel minimize/restore works correctly and doesn't freeze Svelte
        const uploadPanel = page.locator("#viz-upload-panel");
        await expect(uploadPanel).toBeVisible();

        // Find minimize button in header (arrow_downward_alt icon via button[title="Minimize Upload Panel"]) and click it
        const minimizeBtn = uploadPanel.locator('button[title="Minimize Upload Panel"]');
        await expect(minimizeBtn).toBeVisible();
        await minimizeBtn.click();

        // Verify it is minimized and minimized button shows
        const minimizedButton = page.locator("#viz-upload-panel-minimized-button");
        await expect(minimizedButton).toBeVisible();

        // Restore it
        await minimizedButton.click();
        await expect(uploadPanel).toBeVisible();

        // 8. Try uploading the SAME image again using the helper to test duplicate key filtering
        await performDragAndDrop(page, fileBuffer, fileName);

        // Verify duplicate upload success toast shows up without throwing Svelte errors (grid rendering remains intact)
        await expect(page.locator(".viz-toast-success").filter({ hasText: "Successfully uploaded" })).toBeVisible({
            timeout: 25000
        });

        // Verify toast dismiss button works correctly (UploadPanel reactivity loop fix)
        const toastCloseBtn = page.locator(".viz-toast-close").first();
        await expect(toastCloseBtn).toBeVisible();
        await toastCloseBtn.click();
        await expect(toastCloseBtn).not.toBeVisible();
    });

    test("should ignore non-file drags (such as tab dragging) and not show upload overlay or error/info toast", async ({
        page
    }) => {
        // Go directly to the Photos page
        await page.goto("/photos");
        await page.waitForLoadState("networkidle");

        // Confirm Photos page is fully loaded and visible
        await expect(page.locator(".viz-view-container")).toBeVisible({ timeout: 20000 });

        // Simulate dragging and dropping a non-file, internal type (like VizMimeTypes.TAB_VIEW)
        await page.evaluate(() => {
            const dt = new DataTransfer();
            dt.setData("application/x-viz.tab.view", "test-tab-data");

            const target = document.querySelector(".viz-view-container") || document.body;

            // Dispatch dragenter
            const dragEnterEvt = new DragEvent("dragenter", { bubbles: true, cancelable: true });
            Object.defineProperty(dragEnterEvt, "dataTransfer", { value: dt, configurable: true });
            target.dispatchEvent(dragEnterEvt);

            // Dispatch dragover
            const dragOverEvt = new DragEvent("dragover", { bubbles: true, cancelable: true });
            Object.defineProperty(dragOverEvt, "dataTransfer", { value: dt, configurable: true });
            target.dispatchEvent(dragOverEvt);

            // Dispatch drop
            const dropEvt = new DragEvent("drop", { bubbles: true, cancelable: true });
            Object.defineProperty(dropEvt, "dataTransfer", { value: dt, configurable: true });
            target.dispatchEvent(dropEvt);
        });

        // Verify that the drop overlay is NOT visible/present
        await expect(page.locator(".drop-overlay")).not.toBeVisible({ timeout: 3000 });

        // Verify that no "No files to upload" toast is shown
        const infoToast = page.locator(".viz-toast-info").filter({ hasText: "No files to upload" });
        await expect(infoToast).not.toBeVisible({ timeout: 3000 });
    });
});
