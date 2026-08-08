import { type Page, expect, test } from "@playwright/test";

test.describe("ImageLightbox Interactions", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/photos");
        await page.waitForLoadState("networkidle");
        await expect(page.locator(".viz-view-container")).toBeVisible({ timeout: 20000 });
    });

    /**
     * Opens the lightbox by double-clicking the first photo in the grid.
     * Guards: skips if no photos exist.
     */
    async function openLightbox(page: Page) {
        const photos = page.locator(".asset-photo");
        const count = await photos.count();
        if (count === 0) {
            return null;
        }

        await photos.first().dblclick();
        const lightbox = page.locator("#viz-lightbox-overlay");
        await expect(lightbox).toBeVisible();
        await expect(lightbox.locator(".lightbox-image.main")).toBeVisible();

        return lightbox;
    }

    test("clicking on image should NOT close the lightbox", async ({ page }) => {
        const lightbox = await openLightbox(page);
        test.skip(!lightbox, "No photos available to test");

        // Click on the image itself
        const image = lightbox!.locator(".lightbox-image.main");
        await expect(image).toBeVisible();
        await image.click();

        // Lightbox should remain open
        await expect(lightbox!).toBeVisible();

        // Escape to close (cleanup)
        await page.keyboard.press("Escape");
        await expect(lightbox!).not.toBeVisible();
    });

    test("clicking on backdrop overlay should close the lightbox", async ({ page }) => {
        const lightbox = await openLightbox(page);
        test.skip(!lightbox, "No photos available to test");

        // Click on the backdrop area (top-left corner of overlay, outside content)
        // The overlay fills the viewport, content is centered within it.
        await page.mouse.click(10, 10);

        await expect(lightbox!).not.toBeVisible();
    });

    test("crop mode: overlay scales with image display dimensions", async ({ page }) => {
        const lightbox = await openLightbox(page);
        test.skip(!lightbox, "No photos available to test");

        // Enter crop mode via the Crop button
        const cropBtn = lightbox!.locator(".image-icon-buttons button").nth(2);
        await expect(cropBtn).toBeVisible();
        await cropBtn.click();

        // Verify crop overlay appeared
        const cropOverlay = lightbox!.locator(".crop-overlay-container");
        await expect(cropOverlay).toBeVisible({ timeout: 5000 });

        // Verify the overlay's bounding box matches the image display dimensions
        const overlayBox = await cropOverlay.evaluate((el: HTMLElement) => {
            const rect = el.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
        });
        const viewport = page.viewportSize()!;

        // Overlay should be strictly smaller than the viewport
        expect(overlayBox.width).toBeLessThan(viewport.width);
        expect(overlayBox.height).toBeLessThan(viewport.height);

        // Overlay dimensions should match the image element's rendered dimensions
        const imageBox = await lightbox!.locator(".lightbox-image.main").evaluate((el: HTMLElement) => {
            const rect = el.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
        });
        expect(overlayBox.width).toBeCloseTo(imageBox.width, 0);
        expect(overlayBox.height).toBeCloseTo(imageBox.height, 0);

        // Verify crop tools panel is visible
        const cropTools = lightbox!.locator(".crop-tools-menu");
        await expect(cropTools).toBeVisible();

        // Exit crop mode via Cancel button
        const cancelBtn = cropTools.locator(".crop-actions button.viz-button-danger, .crop-actions button").nth(1);
        await expect(cancelBtn).toBeVisible();
        await cancelBtn.click();

        await expect(cropOverlay).not.toBeVisible();
    });

    test("crop mode: clicking on image should NOT exit crop mode", async ({ page }) => {
        const lightbox = await openLightbox(page);
        test.skip(!lightbox, "No photos available to test");

        // Enter crop mode
        const cropBtn = lightbox!.locator(".image-icon-buttons button").nth(2);
        await expect(cropBtn).toBeVisible();
        await cropBtn.click();

        const cropOverlay = lightbox!.locator(".crop-overlay-container");
        await expect(cropOverlay).toBeVisible({ timeout: 5000 });

        // Click on the image itself (force:true because the .crop-box overlay covers it)
        const image = lightbox!.locator(".lightbox-image.main");
        await image.click({ force: true });

        // Verify crop mode is still active
        await expect(cropOverlay).toBeVisible();

        // Click on the image again to be sure
        await image.click({ force: true });
        await expect(cropOverlay).toBeVisible();

        // Exit crop mode via Escape to clean up
        await page.keyboard.press("Escape");
        await expect(cropOverlay).not.toBeVisible();
    });

    test("crop mode: clicking on image-wrapper background exits crop mode", async ({ page }) => {
        const lightbox = await openLightbox(page);
        test.skip(!lightbox, "No photos available to test");

        // Enter crop mode
        const cropBtn = lightbox!.locator(".image-icon-buttons button").nth(2);
        await expect(cropBtn).toBeVisible();
        await cropBtn.click();

        const cropOverlay = lightbox!.locator(".crop-overlay-container");
        await expect(cropOverlay).toBeVisible({ timeout: 5000 });

        // Find the image-wrapper's bounding box
        const wrapper = lightbox!.locator(".image-wrapper");
        const wrapperBox = await wrapper.evaluate((el: HTMLElement) => {
            const rect = el.getBoundingClientRect();
            return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
        });

        // Click near the edge of the wrapper
        await page.mouse.click(wrapperBox.left + 5, wrapperBox.top + 5);

        // Verify crop mode exited
        await expect(cropOverlay).not.toBeVisible({ timeout: 5000 });

        // Verify metadata panel is back
        const metadataPanel = page.locator(".metadata-editor");
        await expect(metadataPanel).toBeVisible();
    });

    test("Escape exits crop mode first, then closes lightbox", async ({ page }) => {
        const lightbox = await openLightbox(page);
        test.skip(!lightbox, "No photos available to test");

        // Enter crop mode
        const cropBtn = lightbox!.locator(".image-icon-buttons button").nth(2);
        await expect(cropBtn).toBeVisible();
        await cropBtn.click();

        const cropOverlay = lightbox!.locator(".crop-overlay-container");
        await expect(cropOverlay).toBeVisible({ timeout: 5000 });

        // First Escape: should exit crop mode, not close lightbox
        await page.keyboard.press("Escape");
        await expect(cropOverlay).not.toBeVisible({ timeout: 5000 });
        await expect(lightbox!).toBeVisible();

        // Second Escape: should close the lightbox
        await page.keyboard.press("Escape");
        await expect(lightbox!).not.toBeVisible({ timeout: 5000 });
    });

    test("thumbhash placeholder should match image display dimensions", async ({ page }) => {
        const lightbox = await openLightbox(page);
        test.skip(!lightbox, "No photos available to test");

        // Wait for image to fully load
        const placeholder = lightbox!.locator(".lightbox-image.placeholder");
        await expect(placeholder).not.toBeVisible({ timeout: 15000 });

        // Capture the main image's rendered dimensions
        const mainImage = lightbox!.locator(".lightbox-image.main");
        const imageBox = await mainImage.evaluate((el: HTMLElement) => {
            const rect = el.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
        });
        expect(imageBox.width).toBeGreaterThan(0);
        expect(imageBox.height).toBeGreaterThan(0);

        // Use dev-only button to show the placeholder over the loaded image
        const toggleBtn = lightbox!.locator(".image-icon-buttons button").first();
        await expect(toggleBtn).toBeVisible();
        await toggleBtn.click();

        // Placeholder should now be visible
        await expect(placeholder).toBeVisible();

        // Get placeholder's bounding rect
        const placeholderBox = await placeholder.evaluate((el: HTMLElement) => {
            const rect = el.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
        });

        // Placeholder dimensions should match the main image
        expect(Math.abs(placeholderBox.width - imageBox.width)).toBeLessThan(1);
        expect(Math.abs(placeholderBox.height - imageBox.height)).toBeLessThan(1);
    });

    test("crop mode: pressing Enter should apply the crop", async ({ page }) => {
        const lightbox = await openLightbox(page);
        test.skip(!lightbox, "No photos available to test");

        // Enter crop mode
        const cropBtn = lightbox!.locator(".image-icon-buttons button").nth(2);
        await expect(cropBtn).toBeVisible();
        await cropBtn.click();

        const cropOverlay = lightbox!.locator(".crop-overlay-container");
        await expect(cropOverlay).toBeVisible({ timeout: 5000 });

        // Press Enter — should apply the crop and exit crop mode
        await page.keyboard.press("Enter");

        // Crop overlay should be gone
        await expect(cropOverlay).not.toBeVisible({ timeout: 5000 });

        // Lightbox should still be open
        await expect(lightbox!).toBeVisible();

        // A success toast should have appeared
        await expect(page.locator(".viz-toast-success")).toBeVisible({ timeout: 5000 });
    });
});
