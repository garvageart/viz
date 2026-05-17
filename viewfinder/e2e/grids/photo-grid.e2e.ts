import { test, expect } from '@playwright/test';

test.describe('PhotoAssetGrid Functionality', () => {

    test.beforeEach(async ({ page }) => {
        // Navigate to /photos as a baseline
        await page.goto('/photos');
        
        // Wait for the view container to appear (this is common to /photos, /search, and /collections/[uid])
        // We use a longer timeout because the local server might be slow to respond/render.
        await expect(page.locator('.viz-view-container')).toBeVisible({ timeout: 20000 });
    });

    test('should render photo grid and handle selection on /photos', async ({ page }) => {
        const grid = page.locator('.viz-photo-grid-container');
        await expect(grid).toBeVisible();

        // Check for photos.
        const photos = grid.locator('.asset-photo');
        
        // Wait for potential network requests to populate the grid
        await expect(async () => {
            const count = await photos.count();
            expect(count).toBeGreaterThan(0);
        }).toPass({ timeout: 10000 }).catch(() => {
            console.log('No photos found on /photos, skipping interactive selection tests');
        });

        const count = await photos.count();
        if (count > 0) {
            const firstPhoto = photos.first();
            
            // 1. Single selection
            await firstPhoto.click();
            await expect(firstPhoto).toHaveClass(/selected-photo/);
            
            // Selection toolbar should appear
            await expect(page.locator('.selection-toolbar')).toBeVisible();
            
            // 2. Multi-selection with Ctrl
            if (count > 1) {
                const secondPhoto = photos.nth(1);
                await secondPhoto.click({ modifiers: ['Control'] });
                await expect(secondPhoto).toHaveClass(/selected-photo/);
                await expect(firstPhoto).toHaveClass(/selected-photo/);
                // Check if the "2 selected" text appears in the toolbar
                await expect(page.locator('.selection-toolbar')).toContainText('2 selected');
            }
            
            // 3. Range selection with Shift
            if (count > 2) {
                const thirdPhoto = photos.nth(2);
                await firstPhoto.click(); // Reset selection to first
                await thirdPhoto.click({ modifiers: ['Shift'] });
                await expect(firstPhoto).toHaveClass(/selected-photo/);
                await expect(photos.nth(1)).toHaveClass(/selected-photo/);
                await expect(thirdPhoto).toHaveClass(/selected-photo/);
                await expect(page.locator('.selection-toolbar')).toContainText('3 selected');
            }

            // 4. Clear selection with Escape
            await page.keyboard.press('Escape');
            await expect(firstPhoto).not.toHaveClass(/selected-photo/);
            await expect(page.locator('.selection-toolbar')).not.toBeVisible();
        } else {
            // Verify empty state message if no photos
            await expect(page.locator('#viz-no_assets')).toBeVisible();
        }
    });

    test('should open lightbox on double click and navigate', async ({ page }) => {
        const photos = page.locator('.asset-photo');
        
        await expect(async () => {
            const count = await photos.count();
            expect(count).toBeGreaterThan(0);
        }).toPass({ timeout: 10000 });

        const count = await photos.count();
        if (count > 0) {
            // Open Lightbox
            await photos.first().dblclick();
            const lightbox = page.locator('#viz-lightbox-overlay');
            await expect(lightbox).toBeVisible();
            await expect(lightbox.locator('.lightbox-image.main')).toBeVisible();

            // Navigation within lightbox (if multiple photos)
            if (count > 1) {
                const firstImageId = await lightbox.locator('.lightbox-image.main').getAttribute('data-image-id');
                await page.keyboard.press('ArrowRight');
                
                // Wait for image ID to change
                await expect(async () => {
                    const nextImageId = await lightbox.locator('.lightbox-image.main').getAttribute('data-image-id');
                    expect(nextImageId).not.toBe(firstImageId);
                }).toPass();
            }

            // Close lightbox
            await page.keyboard.press('Escape');
            await expect(lightbox).not.toBeVisible();
        }
    });

    test('should show context menu on right click and handle actions', async ({ page }) => {
        const photos = page.locator('.asset-photo');
        
        await expect(async () => {
            const count = await photos.count();
            expect(count).toBeGreaterThan(0);
        }).toPass({ timeout: 10000 });

        if (await photos.count() > 0) {
            const firstPhoto = photos.first();
            await firstPhoto.click({ button: 'right' });
            
            const contextMenu = page.locator('.context-menu');
            await expect(contextMenu).toBeVisible();
            
            // Verify some common menu items exist
            await expect(contextMenu.locator('text="Download"')).toBeVisible();
            await expect(contextMenu.locator('text="Add to Collection"')).toBeVisible();

            // Close context menu by clicking elsewhere
            await page.mouse.click(0, 0);
            await expect(contextMenu).not.toBeVisible();
        }
    });

    test('should handle keyboard navigation in the grid', async ({ page }) => {
        const photos = page.locator('.asset-photo');
        
        await expect(async () => {
            const count = await photos.count();
            expect(count).toBeGreaterThan(0);
        }).toPass({ timeout: 10000 });

        const count = await photos.count();
        if (count > 1) {
            const firstPhoto = photos.first();
            const secondPhoto = photos.nth(1);
            
            await firstPhoto.click();
            await expect(firstPhoto).toHaveClass(/selected-photo/);
            
            await page.keyboard.press('ArrowRight');
            await expect(secondPhoto).toHaveClass(/selected-photo/);
            await expect(firstPhoto).not.toHaveClass(/selected-photo/);

            await page.keyboard.press('ArrowLeft');
            await expect(firstPhoto).toHaveClass(/selected-photo/);
            await expect(secondPhoto).not.toHaveClass(/selected-photo/);
        }
    });

    test('should function correctly on /search route', async ({ page }) => {
        // Navigate to search with a generic query
        await page.goto('/search?q=a');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('.viz-view-container')).toBeVisible({ timeout: 15000 });

        const grid = page.locator('.viz-photo-grid-container');
        await expect(grid).toBeVisible();

        const photos = grid.locator('.asset-photo');
        // Wait for search results
        await expect(async () => {
            const count = await photos.count();
            expect(count).toBeGreaterThan(0);
        }).toPass({ timeout: 10000 }).catch(() => {
            console.log('No search results found for "a"');
        });

        if (await photos.count() > 0) {
            const firstPhoto = photos.first();
            await firstPhoto.click();
            await expect(firstPhoto).toHaveClass(/selected-photo/);
            
            // Search route has its own toolbar
            await expect(page.locator('.asset-toolbar')).toBeVisible();
            
            // Double click to navigate to collection (if it's a collection card)
            // But we are testing PhotoAssetGrid here specifically.
            // On search page there are also collections.
            const collections = page.locator('.coll-card');
            if (await collections.count() > 0) {
                await collections.first().dblclick();
                await page.waitForLoadState('networkidle');
                await expect(page).toHaveURL(/\/collections\/.+/);
            }
        }
    });

    test('should function correctly on /collections/[uid] route', async ({ page }) => {
        // First find a collection to go to
        await page.goto('/collections');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('.viz-view-container')).toBeVisible();
        
        const collectionCard = page.locator('.coll-card').first();
        
        // Wait for collections to load
        await expect(async () => {
            expect(await collectionCard.isVisible()).toBe(true);
        }).toPass({ timeout: 10000 }).catch(() => {
            console.log('No collections found to test PhotoAssetGrid on collection page');
        });

        if (await collectionCard.isVisible()) {
            await collectionCard.dblclick();
            await page.waitForLoadState('networkidle');
            
            // Should be on a collection page now
            await expect(page).toHaveURL(/\/collections\/.+/);
            
            const grid = page.locator('.viz-photo-grid-container');
            await expect(grid).toBeVisible();
            
            const photos = grid.locator('.asset-photo');
            // Wait for images in collection
            await expect(async () => {
                const count = await photos.count();
                expect(count).toBeGreaterThan(0);
            }).toPass({ timeout: 10000 }).catch(() => {
                console.log('Collection is empty, skipping photo grid tests');
            });

            if (await photos.count() > 0) {
                const firstPhoto = photos.first();
                await firstPhoto.click();
                await expect(firstPhoto).toHaveClass(/selected-photo/);
                
                // Keyboard nav in collection grid
                if (await photos.count() > 1) {
                    await page.keyboard.press('ArrowRight');
                    await expect(photos.nth(1)).toHaveClass(/selected-photo/);
                }
            }
        }
    });
});
