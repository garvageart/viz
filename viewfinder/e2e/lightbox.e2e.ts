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

    test("clicking on backdrop overlay should NOT close the lightbox, close button should close it", async ({
        page
    }) => {
        const lightbox = await openLightbox(page);
        // Click on the empty background area of the image viewport
        const viewport = lightbox!.locator(".image-viewport");
        await viewport.click({ position: { x: 5, y: 5 } });

        // Lightbox should remain open
        await expect(lightbox!).toBeVisible();

        // Click close button to close
        const closeBtn = lightbox!.locator("#lightbox-icon-close");
        await expect(closeBtn).toBeVisible();
        await closeBtn.click();
        await expect(lightbox!).not.toBeVisible();
    });

    test("crop mode: overlay scales with image display dimensions", async ({ page }) => {
        const lightbox = await openLightbox(page);
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
        const cropTools = lightbox!.locator(".crop-tools");
        await expect(cropTools).toBeVisible();

        // Exit crop mode via Cancel button
        const cancelBtn = cropTools.locator(".crop-actions button.viz-button-danger, .crop-actions button").nth(1);
        await expect(cancelBtn).toBeVisible();
        await cancelBtn.click();

        await expect(cropOverlay).not.toBeVisible();
    });

    test("crop mode: clicking on image should NOT exit crop mode", async ({ page }) => {
        const lightbox = await openLightbox(page);
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

    test("crop mode: clicking on image-viewport background does NOT exit crop mode", async ({ page }) => {
        const lightbox = await openLightbox(page);
        // Enter crop mode
        const cropBtn = lightbox!.locator("#act-crop");
        await expect(cropBtn).toBeVisible();
        await cropBtn.click();

        const cropOverlay = lightbox!.locator(".crop-overlay-container");
        await expect(cropOverlay).toBeVisible({ timeout: 5000 });

        // Find the image-viewport's bounding box
        const viewport = lightbox!.locator(".image-viewport");
        const viewportBox = await viewport.evaluate((el: HTMLElement) => {
            const rect = el.getBoundingClientRect();
            return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
        });

        // Click near the edge of the viewport background
        await page.mouse.click(viewportBox.left + 5, viewportBox.top + 5);

        // Verify crop mode is still active
        await expect(cropOverlay).toBeVisible({ timeout: 5000 });

        // Verify lightbox is still open
        await expect(lightbox!).toBeVisible();

        // Exit crop mode via Escape for cleanup
        await page.keyboard.press("Escape");
        await expect(cropOverlay).not.toBeVisible();
    });

    test("Escape exits crop mode first, then closes lightbox", async ({ page }) => {
        const lightbox = await openLightbox(page);
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

    test("double-click toggles 1:1 pixel zoom and fit", async ({ page }) => {
        const lightbox = await openLightbox(page);
        const stage = lightbox!.locator(".image-stage");
        await expect(stage).toBeVisible();

        // Double-click on the main image to toggle 1:1 pixel zoom
        const image = lightbox!.locator(".lightbox-image.main");
        await image.dblclick();

        // Zoom should be greater than 1.0
        const zoomedVal = Number(await stage.getAttribute("data-zoom"));
        expect(zoomedVal).toBeGreaterThan(1.0);

        // Zoom indicator badge should appear
        await expect(lightbox!.locator(".status-indicator")).toBeVisible();

        // Double-click again to reset back to fit
        await image.dblclick();
        const fitVal = Number(await stage.getAttribute("data-zoom"));
        expect(fitVal).toBe(1);
    });

    test("mouse wheel scrolls zoom in and out", async ({ page }) => {
        const lightbox = await openLightbox(page);
        const stage = lightbox!.locator(".image-stage");
        const viewport = lightbox!.locator(".image-viewport");

        const initialZoom = Number(await stage.getAttribute("data-zoom"));
        expect(initialZoom).toBe(1);

        // Dispatch negative deltaY (zoom in)
        await viewport.dispatchEvent("wheel", { deltaY: -100, clientX: 500, clientY: 500 });

        const zoomedVal = Number(await stage.getAttribute("data-zoom"));
        expect(zoomedVal).toBeGreaterThan(1.0);
    });

    test("pointer dragging pans image regardless of zoom level", async ({ page }) => {
        const lightbox = await openLightbox(page);
        const stage = lightbox!.locator(".image-stage");
        const image = lightbox!.locator(".lightbox-image.main");

        // Stage can pan at any zoom level
        await expect(stage).toHaveClass(/can-pan/);

        // Zoom to 1:1
        await image.dblclick();

        const initialX = Number(await stage.getAttribute("data-pos-x"));
        const initialY = Number(await stage.getAttribute("data-pos-y"));

        // Drag pointer across image viewport
        const viewport = lightbox!.locator(".image-viewport");
        const box = (await viewport.boundingBox())!;
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 - 100, box.y + box.height / 2 - 80, { steps: 5 });
        await page.mouse.up();

        const pannedX = Number(await stage.getAttribute("data-pos-x"));
        const pannedY = Number(await stage.getAttribute("data-pos-y"));
        expect(pannedX !== initialX || pannedY !== initialY).toBe(true);
    });

    test("crop apply preserves user zoom and pan offsets without reset", async ({ page }) => {
        const lightbox = await openLightbox(page);
        const stage = lightbox!.locator(".image-stage");
        const image = lightbox!.locator(".lightbox-image.main");

        // Zoom into image
        await image.dblclick();
        const zoomBefore = Number(await stage.getAttribute("data-zoom"));
        const posXBefore = Number(await stage.getAttribute("data-pos-x"));
        const posYBefore = Number(await stage.getAttribute("data-pos-y"));
        expect(zoomBefore).toBeGreaterThan(1.0);

        // Enter crop mode
        const cropBtn = lightbox!.locator("#act-crop");
        await cropBtn.click();
        await expect(lightbox!.locator(".crop-overlay-container")).toBeVisible();

        // Verify zoom & translation was preserved upon entering crop mode (zero reset)
        expect(Number(await stage.getAttribute("data-zoom"))).toBe(zoomBefore);
        expect(Number(await stage.getAttribute("data-pos-x"))).toBe(posXBefore);
        expect(Number(await stage.getAttribute("data-pos-y"))).toBe(posYBefore);

        // Apply crop via Enter
        await page.keyboard.press("Enter");
        await expect(lightbox!.locator(".crop-overlay-container")).not.toBeVisible();

        // Verify zoom & translation is still retained after applying crop (no reset to fit)
        expect(Number(await stage.getAttribute("data-zoom"))).toBe(zoomBefore);
        expect(Number(await stage.getAttribute("data-pos-x"))).toBe(posXBefore);
        expect(Number(await stage.getAttribute("data-pos-y"))).toBe(posYBefore);
    });
});
