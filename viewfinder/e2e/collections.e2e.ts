import { test, expect } from '@playwright/test';

test.describe('Collection Lifecycle & Context Menus', () => {

    test.beforeEach(async ({ page }) => {
        test.slow();
        // Go directly to collections workspace page
        await page.goto('/collections');
        await page.waitForLoadState('networkidle');
        
        // Wait for the view container to appear
        await expect(page.locator('.viz-view-container')).toBeVisible({ timeout: 20000 });
    });

    test('should perform full collection lifecycle (Create -> Edit -> Delete)', async ({ page }) => {
        // 1. Open Create Collection Modal
        const createBtn = page.getByRole('button', { name: 'Create Collection' }).first();
        await expect(createBtn).toBeVisible({ timeout: 10000 });
        await createBtn.click();

        await expect(page.locator('#viz-collection-modal')).toBeVisible();

        // 2. Fill Form and Create
        const collectionName = `E2E-Coll-${Date.now()}`;
        const collectionDesc = `E2E Test Description for ${collectionName}`;

        await page.locator('#collection-name').fill(collectionName);
        await page.locator('#collection-description').fill(collectionDesc);
        
        // Submit
        await page.locator('#collection-submit').click();

        // Wait for modal to close
        await expect(page.locator('#viz-collection-modal')).not.toBeVisible({ timeout: 10000 });

        // Go back to the main collections view to find the card in the list
        await page.goto('/collections');
        await page.waitForLoadState('networkidle');

        // Wait for card to appear in the grid
        const collCard = page.locator('.coll-card').filter({ hasText: collectionName });
        await expect(collCard.first()).toBeVisible({ timeout: 15000 });

        // 3. Right click the card to open context menu and Edit
        await collCard.first().click({ button: 'right' });
        
        const contextMenu = page.locator('.context-menu');
        await expect(contextMenu).toBeVisible();

        const editOption = contextMenu.locator('text="Edit"');
        await expect(editOption).toBeVisible();
        await editOption.click();

        // Edit modal should open
        await expect(page.locator('#viz-collection-modal')).toBeVisible();

        // Rename the collection
        const updatedName = `${collectionName}-Edit`;
        await page.locator('#collection-name').fill(updatedName);
        await page.locator('#collection-submit').click();

        // Wait for modal to close
        await expect(page.locator('#viz-collection-modal')).not.toBeVisible();

        // Assert card name updated in grid
        const updatedCard = page.locator('.coll-card').filter({ hasText: updatedName });
        await expect(updatedCard.first()).toBeVisible({ timeout: 15000 });

        // 4. Delete the collection via context menu
        await updatedCard.first().click({ button: 'right' });
        await expect(contextMenu).toBeVisible();

        const deleteOption = contextMenu.locator('text="Delete"');
        await expect(deleteOption).toBeVisible();

        // Set up handler to accept the native browser confirm dialog
        page.once('dialog', async (dialog) => {
            expect(dialog.message()).toContain('Delete collection');
            await dialog.accept();
        });

        await deleteOption.click();

        // Verify the card is deleted from UI
        await expect(updatedCard).not.toBeVisible({ timeout: 15000 });
    });
});
