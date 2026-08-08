import { expect, test } from "@playwright/test";
import { cleanupSpecificCollections, trackCreatedCollections } from "./helpers";

test.describe("Collection Lifecycle & Context Menus", () => {
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

    test("should perform full collection lifecycle (Create -> Edit -> Delete)", async ({ page }) => {
        // 1. Open Create Collection Modal
        const createBtn = page
            .locator(
                "#create-collection, #create_collection-button, button.create-collection-btn, button.viz-button-info, .header-actions button"
            )
            .first();
        await expect(createBtn).toBeVisible({ timeout: 10000 });
        await createBtn.click();

        await expect(page.locator("#viz-collection-modal")).toBeVisible();

        // 2. Fill Form and Create
        const collectionName = `E2E-Coll-${Date.now()}`;
        const collectionDesc = `E2E Test Description for ${collectionName}`;

        await page.locator("#collection-name").fill(collectionName);
        await page.locator("#collection-description").fill(collectionDesc);

        // Submit
        await page.locator("#collection-submit").click();

        // Wait for modal to close
        await expect(page.locator("#viz-collection-modal")).not.toBeVisible({ timeout: 10000 });

        // Go back to the main collections view to find the card in the list
        await page.goto("/collections");
        await page.waitForLoadState("networkidle");

        // Wait for card to appear in the grid
        const collCard = page.locator(".coll-card").filter({ hasText: collectionName });
        await expect(collCard.first()).toBeVisible({ timeout: 15000 });

        // 3. Right click the card to open context menu and Edit
        await collCard.first().click({ button: "right" });

        const contextMenu = page.locator(".context-menu");
        await expect(contextMenu).toBeVisible();

        const editOption = contextMenu.locator('[id^="edit-"], button.edit, .menu-item').first();
        await expect(editOption).toBeVisible();
        await editOption.click();

        // Edit modal should open
        await expect(page.locator("#viz-collection-modal")).toBeVisible();

        // Rename the collection
        const updatedName = `${collectionName}-Edit`;
        await page.locator("#collection-name").fill(updatedName);
        await page.locator("#collection-submit").click();

        // Wait for modal to close
        await expect(page.locator("#viz-collection-modal")).not.toBeVisible();

        // Assert card name updated in grid
        const updatedCard = page.locator(".coll-card").filter({ hasText: updatedName });
        await expect(updatedCard.first()).toBeVisible({ timeout: 15000 });

        // 4. Delete the collection via context menu
        await updatedCard.first().click({ button: "right" });
        await expect(contextMenu).toBeVisible();

        const deleteOption = contextMenu.locator('[id^="delete-"], button.delete, .menu-item.danger').first();
        await expect(deleteOption).toBeVisible();

        await deleteOption.click();

        // Expect the confirmation modal to be visible
        const confirmModal = page.locator(".confirmation-modal");
        await expect(confirmModal).toBeVisible();

        // Click the confirm button in the modal
        const confirmBtn = confirmModal
            .locator(".onconfirm-btn, .modal-actions button.viz-button-danger, .modal-actions button:last-child")
            .first();
        await expect(confirmBtn).toBeVisible();
        await confirmBtn.click();

        // Verify the card is deleted from UI
        await expect(updatedCard).not.toBeVisible({ timeout: 15000 });
    });
});
