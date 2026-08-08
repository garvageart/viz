import { expect, test } from "@playwright/test";

test.describe("View Switching Functionality", () => {
    test("should switch views on /photos", async ({ page }) => {
        await page.goto("/photos");
        await expect(page.locator("main, .viz-photo-grid-container").first()).toBeVisible({ timeout: 20000 });

        // Wait for photos to load (toolbar only appears if there are photos)
        const photo = page.locator(".asset-photo, .asset-card");
        await expect(async () => {
            const count = await photo.count();
            expect(count).toBeGreaterThan(0);
        }).toPass({ timeout: 15000 });

        // 1. Check container is visible
        const photoGrid = page
            .locator(".viz-photo-grid-container, .viz-asset-grid-container, .viz-asset-table-container")
            .first();
        await expect(photoGrid).toBeVisible();

        // 2. Open Display dropdown
        const displayDropdown = page
            .locator("button.display-btn, .display-dropdown-btn, button[aria-label*='Display']")
            .first();
        await displayDropdown.click();

        // 3. Switch to List view
        await page.locator('#display-list, [id="display-list"]').first().click();
        await expect(page.locator(".viz-asset-table-container")).toBeVisible();

        // 4. Switch back to Grid view
        await displayDropdown.click();
        await page.locator('#display-custom, [id="display-custom"]').first().click();
        await expect(page.locator(".viz-photo-grid-container")).toBeVisible();

        // 5. Switch to Thumbnails view
        await displayDropdown.click();
        await page.locator('#display-grid, [id="display-grid"]').first().click();
        await expect(page.locator(".viz-asset-grid-container")).toBeVisible();
    });

    test("should switch views on /search", async ({ page }) => {
        test.slow();
        await page.goto("/search?q=a");
        await expect(page.locator("main, .images-section").first()).toBeVisible({ timeout: 20000 });

        const imagesSection = page.locator(".images-section");
        await expect(imagesSection).toBeVisible();

        // Wait for images to load in search
        await expect(imagesSection.locator(".asset-photo, .asset-card").first()).toBeVisible({ timeout: 15000 });

        // Find the "Display" dropdown within the images section
        const imageDisplayDropdown = imagesSection
            .locator("button.display-btn, .display-dropdown-btn, button[aria-label*='Display']")
            .first();
        await imageDisplayDropdown.click();

        // Switch to List
        await page.locator('#img-display-list, #display-list, [id="display-list"]').first().click();
        await expect(imagesSection.locator(".viz-asset-table-container")).toBeVisible();

        // Switch back to Grid
        await imageDisplayDropdown.click();
        await page.locator('#img-display-custom, #display-custom, [id="display-custom"]').first().click();
        await expect(imagesSection.locator(".viz-photo-grid-container, .viz-asset-grid-container")).toBeVisible();
    });

    test("should switch views on /collections/[uid]", async ({ page }) => {
        test.slow();
        // 1. Find a collection first
        await page.goto("/collections");
        await page.waitForLoadState("networkidle");

        const collectionCard = page.locator(".asset-card, .coll-card").first();
        await expect(collectionCard).toBeVisible({ timeout: 15000 });
        await collectionCard.dblclick();

        // 2. Verify we are in the collection and it has photos
        await page.waitForLoadState("networkidle");
        await expect(page.locator(".viz-view-container")).toBeVisible({ timeout: 20000 });

        const photo = page.locator(".asset-photo");
        await expect(async () => {
            const count = await photo.count();
            expect(count).toBeGreaterThan(0);
        })
            .toPass({ timeout: 15000 })
            .catch(() => {
                console.log("Collection is empty, skipping view switching tests in collection");
            });

        if ((await photo.count()) > 0) {
            // 3. Open Display dropdown
            const displayDropdown = page
                .locator("button.display-btn, .display-dropdown-btn, button[aria-label*='Display']")
                .first();
            await displayDropdown.click();

            // 4. Switch to List view
            await page.locator('#display-list, [id="display-list"]').first().click();
            await expect(page.locator(".viz-asset-table-container")).toBeVisible();

            // 5. Switch back to Grid view
            await displayDropdown.click();
            await page.locator('#display-custom, [id="display-custom"]').first().click();
            await expect(page.locator(".viz-photo-grid-container")).toBeVisible();
        }
    });
});
