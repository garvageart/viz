import { type Page, expect, test } from "@playwright/test";
import { thumbHashToRGBA } from "thumbhash";

test.describe("ImageLightbox Interactions", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/photos");
        await page.waitForLoadState("domcontentloaded");
        await expect(
            page.locator(".viz-workspace, main#main, .viz-photo-grid-container, .viz-view-container").first()
        ).toBeVisible({ timeout: 20000 });
    });

    /**
     * Opens the lightbox by double-clicking the first photo in the grid.
     * Guards: skips if no photos exist.
     */
    async function openLightbox(page: Page) {
        const photoFirst = page.locator(".asset-photo, .asset-card").first();
        const isVisible = await photoFirst
            .waitFor({ state: "visible", timeout: 15000 })
            .then(() => true)
            .catch(() => false);

        if (!isVisible) {
            return null;
        }

        await photoFirst.dblclick();
        const lightbox = page.locator("#viz-lightbox-overlay");
        await expect(lightbox).toBeVisible({ timeout: 10000 });
        await expect(lightbox.locator(".lightbox-image.main")).toBeVisible({ timeout: 10000 });

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

        // Click on the empty background area of the image wrapper
        const wrapper = lightbox!.locator(".image-wrapper");
        await wrapper.click({ position: { x: 5, y: 5 } });

        await expect(lightbox!).not.toBeVisible();
    });

    test("crop mode: overlay scales with image display dimensions", async ({ page }) => {
        const lightbox = await openLightbox(page);
        test.skip(!lightbox, "No photos available to test");

        // Enter crop mode via the Crop button
        const cropBtn = lightbox!.locator("#act-crop");
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

        // Overlay should be smaller than or equal to the viewport
        expect(overlayBox.width).toBeLessThanOrEqual(viewport.width);
        expect(overlayBox.height).toBeLessThanOrEqual(viewport.height);

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
        const cropBtn = lightbox!.locator("#act-crop");
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
        const cropBtn = lightbox!.locator("#act-crop");
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
        const cropBtn = lightbox!.locator("#act-crop");
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

    test("thumbhash placeholder should match image display dimensions and decode correctly via thumbhash library", async ({
        page
    }) => {
        const lightbox = await openLightbox(page);
        test.skip(!lightbox, "No photos available to test");

        const placeholder = lightbox!.locator(".lightbox-image.placeholder");
        const hasPlaceholder = (await placeholder.count()) > 0;
        test.skip(!hasPlaceholder, "No thumbhash placeholder rendered for this image");

        // 1. Verify src attribute is a valid PNG Data URL generated by thumbHashToDataURL
        const placeholderSrc = await placeholder.getAttribute("src");
        expect(placeholderSrc).toMatch(/^data:image\/png;base64,/);

        // 2. Extract raw Base64 thumbhash string and decode using thumbHashToRGBA from thumbhash library
        const thumbhashBase64 = await placeholder.evaluate((el: HTMLElement) => {
            return el.getAttribute("data-thumbhash");
        });
        expect(thumbhashBase64).toBeTruthy();

        const rawBytes = Uint8Array.from(Buffer.from(thumbhashBase64!, "base64"));
        const decoded = thumbHashToRGBA(rawBytes);
        expect(decoded.w).toBeGreaterThan(0);
        expect(decoded.h).toBeGreaterThan(0);
        expect(decoded.rgba.length).toBe(decoded.w * decoded.h * 4);

        // 3. Verify placeholder display dimensions match main image
        const mainImage = lightbox!.locator(".lightbox-image.main");
        await expect(mainImage).toBeVisible({ timeout: 15000 });

        const imageBox = await mainImage.evaluate((el: HTMLElement) => {
            const rect = el.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
        });

        const placeholderBox = await placeholder.evaluate((el: HTMLElement) => {
            const rect = el.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
        });

        expect(Math.abs(placeholderBox.width - imageBox.width)).toBeLessThan(5);
        expect(Math.abs(placeholderBox.height - imageBox.height)).toBeLessThan(5);
    });

    test("crop mode: pressing Enter should apply the crop", async ({ page }) => {
        const lightbox = await openLightbox(page);
        test.skip(!lightbox, "No photos available to test");

        // Enter crop mode
        const cropBtn = lightbox!.locator("#act-crop");
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
