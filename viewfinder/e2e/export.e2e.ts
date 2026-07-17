import { expect, test } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { cleanupTestCollections, cleanupTestPhotos, performDragAndDrop } from "./helpers";

test.describe("Export Pipeline", () => {
    let uploadedUids: string[] = [];

    test.beforeEach(async ({ request, page }) => {
        uploadedUids = [];

        // Transparently capture the UIDs of any images uploaded during this test run
        page.on("response", async (response) => {
            if (response.url().includes("/api/images") && response.request().method() === "POST") {
                try {
                    const json = await response.json();
                    // The raw network response is just the ImageUploadResponse directly (no 'data' wrapper)
                    if (json?.uid) {
                        uploadedUids.push(json.uid);
                    }
                } catch (e) {}
            }
        });

        await cleanupTestCollections(request);
    });

    test.afterEach(async ({ request }) => {
        await cleanupTestCollections(request);
        if (uploadedUids.length > 0) {
            await cleanupTestPhotos(request, uploadedUids);
        }
    });

    test("should successfully bulk export an image via Web Worker without crashing", async ({ page }) => {
        test.slow();

        // 1. Go to Photos page
        await page.goto("/photos");
        await page.waitForLoadState("networkidle");
        await expect(page.locator(".viz-view-container")).toBeVisible({ timeout: 20000 });

        // Log all browser console logs for E2E debugging
        page.on("console", (msg) => {
            if (msg.type() === "error") {
                console.error("PAGE ERROR:", msg.text());
            } else {
                console.log("PAGE LOG:", msg.text());
            }
        });

        // 2. Upload first test image
        const imagePath1 = path.join(process.cwd(), "../resources/test/images/DSCF0355.jpg");
        const fileBuffer1 = fs.readFileSync(imagePath1);
        const fileName1 = path.basename(imagePath1);
        await performDragAndDrop(page, fileBuffer1, fileName1);

        // Wait for the modal and click "Upload Individually"
        const uploadIndivBtn = page.locator("button").filter({ hasText: "Upload Individually" });
        await expect(uploadIndivBtn).toBeVisible({ timeout: 10000 });
        await uploadIndivBtn.click();

        // Wait for upload success for the first image
        await expect(
            page.locator(".viz-toast-success").filter({ hasText: "Successfully uploaded" }).first()
        ).toBeVisible({
            timeout: 25000
        });

        // Dismiss the toast so we can reliably detect the next one
        const toastCloseBtn = page.locator(".viz-toast-close").first();
        await expect(toastCloseBtn).toBeVisible();
        await toastCloseBtn.click();

        // Upload second image
        const imagePath2 = path.join(process.cwd(), "../resources/test/samples/Canon_40D.jpg");
        const fileBuffer2 = fs.readFileSync(imagePath2);
        const fileName2 = path.basename(imagePath2);
        await performDragAndDrop(page, fileBuffer2, fileName2);

        // Click "Upload Individually" again for the second photo
        await expect(uploadIndivBtn).toBeVisible({ timeout: 10000 });
        await uploadIndivBtn.click();

        // Wait for upload success for the second image
        await expect(
            page.locator(".viz-toast-success").filter({ hasText: "Successfully uploaded" }).first()
        ).toBeVisible({
            timeout: 25000
        });

        // Wait for the grid to update
        await page.waitForTimeout(1000);

        // 3. Select the first two photos in the grid
        const photoGridItems = page.locator(".asset-photo");
        await expect(photoGridItems.nth(1)).toBeVisible({ timeout: 10000 });

        // Shift-click to select both
        // Click the first one
        await photoGridItems.first().click();
        // Shift-click the second one
        await photoGridItems.nth(1).click({ modifiers: ["Shift"] });

        // Right-click to open context menu on the selection
        await photoGridItems.nth(1).click({ button: "right" });

        // 4. Click "Export" in the context menu
        const exportMenuItem = page.getByText("Export", { exact: true });
        await expect(exportMenuItem).toBeVisible();
        await exportMenuItem.click();

        // 5. Wait for Export Panel to open
        const exportTitle = page.getByText("Export Options");
        await expect(exportTitle).toBeVisible({ timeout: 5000 });

        // Wait for the download event to be triggered
        const downloadPromise = page.waitForEvent("download", { timeout: 30000 });

        // 6. Click the final export button
        const startExportBtn = page.getByRole("button", { name: "Export 2 Items", exact: true });
        await startExportBtn.click();

        // 7. Verify the download succeeds
        const download = await downloadPromise;
        const downloadPath = await download.path();

        try {
            expect(downloadPath).toBeTruthy();
            expect(download.suggestedFilename()).toMatch(/\.zip$/i);

            const stat = fs.statSync(downloadPath!);
            // A valid zip with two JPEGs inside should be at least a few kilobytes.
            expect(stat.size).toBeGreaterThan(5000);
            console.log(`Successfully exported ZIP file. Size: ${stat.size} bytes`);
        } finally {
            if (downloadPath && fs.existsSync(downloadPath)) {
                fs.unlinkSync(downloadPath);
                console.log("Cleaned up downloaded ZIP file.");
            }
        }
    });
});
