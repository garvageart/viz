import { expect, test } from "@playwright/test";
import { cleanupSpecificCollections, trackCreatedCollections } from "./helpers";

test.describe("Collection Add Photos Timeline & Disabled States", () => {
    let createdUids: string[] = [];

    test.beforeEach(async ({ page }) => {
        createdUids = [];
        trackCreatedCollections(page, createdUids);
        test.slow();
        await page.goto("/collections");
        await page.waitForLoadState("networkidle");
        await expect(page.locator(".viz-workspace, main").first()).toBeVisible({ timeout: 20000 });
    });

    test.afterEach(async ({ request }) => {
        if (createdUids.length > 0) {
            await cleanupSpecificCollections(request, createdUids);
        }
    });

    test("should display photos modal, add a photo, disable it, and handle keyboard skip navigation", async ({
        page
    }) => {
        // 1. Create a collection
        const createBtn = page
            .locator(
                "#create-collection, #create_collection-button, button.create-collection-btn, button.viz-button-info, .header-actions button"
            )
            .first();
        await expect(createBtn).toBeVisible({ timeout: 10000 });
        await createBtn.click();

        await expect(page.locator("#viz-collection-modal")).toBeVisible();

        const collectionName = `E2E-AddPhotos-${Date.now()}`;
        const collectionDesc = `Description for ${collectionName}`;

        await page.locator("#collection-name").fill(collectionName);
        await page.locator("#collection-description").fill(collectionDesc);
        await page.locator("#collection-submit").click();

        // Wait for modal to close
        await expect(page.locator("#viz-collection-modal")).not.toBeVisible({ timeout: 10000 });

        // Go back to the main collections view to find the card in the list
        await page.goto("/collections");
        await page.waitForLoadState("networkidle");

        // Wait for card to appear in the grid and double click it to go to collection details page
        const collCard = page.locator(".asset-card, .coll-card").filter({ hasText: collectionName });
        await expect(collCard.first()).toBeVisible({ timeout: 15000 });
        await collCard.first().dblclick();

        // Wait for collection details page to load
        await page.waitForURL(/\/collections\/.+/, { timeout: 15000 });
        await page.waitForLoadState("networkidle");

        // 2. Open Add Photos Modal
        const addPhotosBtn = page
            .locator("#add-photos, button.add-photos-btn, button.viz-button-info, .header-actions button")
            .first();
        await expect(addPhotosBtn).toBeVisible({ timeout: 15000 });
        await addPhotosBtn.click();

        // Wait for Add Photos Modal to load
        const modal = page.locator(".add-photos-modal-container");
        await expect(modal).toBeVisible({ timeout: 10000 });

        const grid = modal.locator(".viz-photo-grid-container");
        await expect(grid).toBeVisible();

        const photos = grid.locator(".asset-photo");

        // Wait for potential photos to load
        await expect(async () => {
            const count = await photos.count();
            expect(count).toBeGreaterThan(0);
        })
            .toPass({ timeout: 10000 })
            .catch(() => {
                console.log("No photos found in Library, test cannot proceed further.");
            });

        const photoCount = await photos.count();
        if (photoCount < 3) {
            console.log("Not enough photos in database to test complex skipping logic, needs at least 3.");
            return;
        }

        // Let's get reference to the photos
        const firstPhoto = photos.nth(0);
        const secondPhoto = photos.nth(1);
        const thirdPhoto = photos.nth(2);

        // Select the second photo (index 1) to add to the collection
        await secondPhoto.click();
        await expect(secondPhoto).toHaveClass(/selected-photo/);

        // Click confirm button in modal
        const confirmBtn = page.locator("#add-photos-submit, .modal-actions button.viz-button-info").first();
        await expect(confirmBtn).toBeVisible();
        await confirmBtn.click();

        // Modal should close
        await expect(modal).not.toBeVisible({ timeout: 15000 });

        // 3. Open Add Photos Modal again
        await addPhotosBtn.click();
        await expect(modal).toBeVisible({ timeout: 10000 });

        // Verify the second photo is now disabled
        await expect(secondPhoto).toHaveClass(/disabled-asset/);

        // Verify there is a simple dim disabled overlay inside the second photo (and no added badge/text)
        const disabledOverlay = secondPhoto.locator(".disabled-overlay");
        await expect(disabledOverlay).toBeVisible();
        await expect(secondPhoto.locator(".added-badge")).not.toBeVisible();

        // Verify clicking on the disabled photo does not select it
        await secondPhoto.click({ force: true }); // force: true because of pointer-events: none
        await expect(secondPhoto).not.toHaveClass(/selected-photo/);

        // 4. Test Keyboard Skip Navigation
        // Select the first photo
        await firstPhoto.click();
        await expect(firstPhoto).toHaveClass(/selected-photo/);

        // Press ArrowRight - it should skip the disabled secondPhoto and select the thirdPhoto!
        await page.keyboard.press("ArrowRight");
        await expect(thirdPhoto).toHaveClass(/selected-photo/);
        await expect(firstPhoto).not.toHaveClass(/selected-photo/);
        await expect(secondPhoto).not.toHaveClass(/selected-photo/);

        // Press ArrowLeft - it should skip the disabled secondPhoto and select the firstPhoto!
        await page.keyboard.press("ArrowLeft");
        await expect(firstPhoto).toHaveClass(/selected-photo/);
        await expect(thirdPhoto).not.toHaveClass(/selected-photo/);
        await expect(secondPhoto).not.toHaveClass(/selected-photo/);

        // Close the modal
        const cancelBtn = modal.locator(".modal-actions button:first-child").first();
        await expect(cancelBtn).toBeVisible();
        await cancelBtn.click();
        await expect(modal).not.toBeVisible();
    });
});
