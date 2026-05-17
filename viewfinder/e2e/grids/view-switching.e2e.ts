import { test, expect } from '@playwright/test';

test.describe('View Switching Functionality', () => {

    test('should switch views on /photos', async ({ page }) => {
        await page.goto('/photos');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('.viz-view-container')).toBeVisible({ timeout: 20000 });

        // Wait for photos to load (toolbar only appears if there are photos)
        const photo = page.locator('.asset-photo');
        await expect(async () => {
            const count = await photo.count();
            expect(count).toBeGreaterThan(0);
        }).toPass({ timeout: 15000 });

        // 1. Check default view (typically Grid for photos)
        const photoGrid = page.locator('.viz-photo-grid-container');
        await expect(photoGrid).toBeVisible();

        // 2. Open Display dropdown
        const displayDropdown = page.getByRole('button', { name: 'Display' }).first();
        await displayDropdown.click();
        
        // 3. Switch to List view
        await page.getByRole('menuitem', { name: 'List' }).click();
        await expect(page.locator('.viz-asset-table-container')).toBeVisible();

        // 4. Switch back to Grid view
        await displayDropdown.click();
        await page.getByRole('menuitem', { name: 'Grid' }).click();
        await expect(page.locator('.viz-photo-grid-container')).toBeVisible();

        // 5. Switch to Thumbnails view
        await displayDropdown.click();
        await page.getByRole('menuitem', { name: 'Thumbnails' }).click();
        await expect(page.locator('.viz-asset-grid-container')).toBeVisible();
    });

    test('should switch views on /search', async ({ page }) => {
        await page.goto('/search?q=a');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('.viz-view-container')).toBeVisible({ timeout: 20000 });

        const imagesSection = page.locator('.images-section');
        await expect(imagesSection).toBeVisible();
        
        // Wait for images to load in search
        await expect(imagesSection.locator('.asset-photo').first()).toBeVisible({ timeout: 15000 });

        // Find the "Display" dropdown within the images section
        const imageDisplayDropdown = imagesSection.getByRole('button', { name: 'Display' }).first();
        await imageDisplayDropdown.click();

        // Switch to List
        await page.getByRole('menuitem', { name: 'List' }).click();
        await expect(imagesSection.locator('.viz-asset-table-container')).toBeVisible();

        // Switch back to Grid
        await imageDisplayDropdown.click();
        await page.getByRole('menuitem', { name: 'Grid' }).click();
        await expect(imagesSection.locator('.viz-photo-grid-container')).toBeVisible();
    });

    test('should switch views on /collections/[uid]', async ({ page }) => {
        // 1. Find a collection first
        await page.goto('/collections');
        await page.waitForLoadState('networkidle');
        
        const collectionCard = page.locator('.coll-card').first();
        await expect(collectionCard).toBeVisible({ timeout: 15000 });
        await collectionCard.dblclick();
        
        // 2. Verify we are in the collection and it has photos
        await page.waitForLoadState('networkidle');
        await expect(page.locator('.viz-view-container')).toBeVisible({ timeout: 20000 });
        
        const photo = page.locator('.asset-photo');
        await expect(async () => {
            const count = await photo.count();
            expect(count).toBeGreaterThan(0);
        }).toPass({ timeout: 15000 }).catch(() => {
            console.log('Collection is empty, skipping view switching tests in collection');
        });

        if (await photo.count() > 0) {
            // 3. Open Display dropdown
            const displayDropdown = page.getByRole('button', { name: 'Display' }).first();
            await displayDropdown.click();
            
            // 4. Switch to List view
            await page.getByRole('menuitem', { name: 'List' }).click();
            await expect(page.locator('.viz-asset-table-container')).toBeVisible();

            // 5. Switch back to Grid view
            await displayDropdown.click();
            await page.getByRole('menuitem', { name: 'Grid' }).click();
            await expect(page.locator('.viz-photo-grid-container')).toBeVisible();
        }
    });
});
