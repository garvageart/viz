import { expect, test } from "@playwright/test";
import * as fs from "fs";
import { cleanupSpecificCollections, cleanupTestPhotos, trackCreatedCollections } from "./helpers";

test.describe("Export Pipeline", () => {
    let uploadedUids: string[] = [];
    let createdUids: string[] = [];
    let executedWorkerSteps: string[] = [];

    test.beforeEach(async ({ page }) => {
        uploadedUids = [];
        createdUids = [];
        executedWorkerSteps = [];
        trackCreatedCollections(page, createdUids);

        page.on("console", (msg) => {
            const text = msg.text();
            if (text.includes("[Worker vips.ts] Step")) {
                executedWorkerSteps.push(text);
            }
            console.log("EXPORT PAGE LOG:", text);
        });
        page.on("pageerror", (err) => console.log("EXPORT PAGE ERROR:", err));

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
    });

    test.afterEach(async ({ request }) => {
        if (createdUids.length > 0) {
            await cleanupSpecificCollections(request, createdUids);
        }
        if (uploadedUids.length > 0) {
            await cleanupTestPhotos(request, uploadedUids);
        }
    });

    test("should track single image WASM step-map progress and display processing status in Download Panel", async ({
        page
    }) => {
        test.slow();

        // 1. Go to Photos page
        await page.goto("/photos");
        await expect(page.locator("main, .viz-photo-grid-container").first()).toBeVisible({ timeout: 20000 });

        // 2. Select first photo
        const photoGridItems = page.locator(".asset-photo, .asset-card");
        await expect(photoGridItems.first()).toBeVisible({ timeout: 20000 });
        await photoGridItems.first().click({ button: "right" });

        // 3. Click "Export" in the context menu
        const exportMenuItem = page.locator("#act-export");
        await expect(exportMenuItem).toBeVisible();
        await exportMenuItem.click();

        // 4. Wait for Export Panel to open
        const exportTitle = page.locator("#viz-export-panel, .export-panel").first();
        await expect(exportTitle).toBeVisible({ timeout: 15000 });

        const performExportBtn = page.locator("#perform-export, button.export-btn").first();
        await expect(performExportBtn).toBeVisible({ timeout: 10000 });

        // 5. Trigger export and track download event
        const downloadPromise = page.waitForEvent("download", { timeout: 45000 });
        await performExportBtn.click();

        // 6. Verify Download Panel opens and displays file task
        const downloadPanel = page.locator("#viz-download-panel, .download-panel").first();
        await expect(downloadPanel).toBeVisible({ timeout: 15000 });

        // 7. Verify status transitions (Processing or Done)
        const statusText = downloadPanel.locator(".status-text, .viz-download-progress-text");
        await expect(statusText.first()).toBeVisible({ timeout: 15000 });

        // 8. Confirm file download completes successfully
        const download = await downloadPromise;
        const downloadPath = await download.path();

        try {
            expect(downloadPath).toBeTruthy();
            expect(download.suggestedFilename()).toMatch(/\.(jpg|jpeg|png|webp)$/i);

            const stat = fs.statSync(downloadPath!);
            expect(stat.size).toBeGreaterThan(1000);
            console.log(`Single export verified: ${download.suggestedFilename()}. Size: ${stat.size} bytes`);
        } finally {
            if (downloadPath && fs.existsSync(downloadPath)) {
                fs.unlinkSync(downloadPath);
                console.log("Cleaned up downloaded ZIP file.");
            }
        }

        // 9. Verify WASM step-map progress logs were recorded
        expect(executedWorkerSteps.length).toBeGreaterThan(0);
        console.log(`Verified ${executedWorkerSteps.length} WASM worker step logs.`);
    });

    test("should successfully bulk export an image via Web Worker without crashing", async ({ page }) => {
        test.slow();

        // 1. Go to Photos page
        await page.goto("/photos");
        await expect(page.locator("main, .viz-photo-grid-container").first()).toBeVisible({ timeout: 20000 });

        // Wait for photos in grid
        const photoGridItems = page.locator(".asset-photo, .asset-card");
        await expect(photoGridItems.first()).toBeVisible({ timeout: 20000 });
        const photoCount = await photoGridItems.count();

        if (photoCount >= 2) {
            await photoGridItems.first().click();
            await photoGridItems.nth(1).click({ modifiers: ["Shift"] });
            await photoGridItems.nth(1).click({ button: "right" });
        } else {
            await photoGridItems.first().click({ button: "right" });
        }

        // 4. Click "Export" in the context menu
        const exportMenuItem = page.locator("#act-export");
        await expect(exportMenuItem).toBeVisible();
        await exportMenuItem.click();

        // 5. Wait for Export Panel to open
        const exportTitle = page.locator("#viz-export-panel, .export-panel").first();
        await expect(exportTitle).toBeVisible({ timeout: 15000 });

        const performExportBtn = page.locator("#perform-export, button.export-btn").first();
        await expect(performExportBtn).toBeVisible({ timeout: 10000 });

        // Wait for the download event to be triggered
        const downloadPromise = page.waitForEvent("download", { timeout: 45000 });
        await performExportBtn.click();

        // 6. Verify the download succeeds
        const download = await downloadPromise;
        const downloadPath = await download.path();

        try {
            expect(downloadPath).toBeTruthy();
            expect(download.suggestedFilename()).toMatch(/\.(zip|jpg|jpeg|png|webp)$/i);

            const stat = fs.statSync(downloadPath!);
            expect(stat.size).toBeGreaterThan(1000);
            console.log(`Bulk export verified: ${download.suggestedFilename()}. Size: ${stat.size} bytes`);
        } finally {
            if (downloadPath && fs.existsSync(downloadPath)) {
                fs.unlinkSync(downloadPath);
                console.log("Cleaned up downloaded ZIP file.");
            }
        }
    });
});
