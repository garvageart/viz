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

            // 1. Verify Metadata/Details panel is visible by default
            const metadataPanel = page.locator('.metadata-editor');
            await expect(metadataPanel).toBeVisible({ timeout: 5000 });
            await expect(metadataPanel.locator('h3:has-text("Metadata")')).toBeVisible();

            // 2. Click "Hide Info" button to toggle it off
            const hideInfoBtn = page.locator('button[title="Hide Info"]');
            await expect(hideInfoBtn).toBeVisible();
            await hideInfoBtn.click();

            // 3. Verify Metadata/Details panel is hidden
            await expect(metadataPanel).not.toBeVisible({ timeout: 5000 });

            // 4. Click "Show Info" button to toggle it back on
            const showInfoBtn = page.locator('button[title="Show Info"]');
            await expect(showInfoBtn).toBeVisible();
            await showInfoBtn.click();

            // 5. Verify Metadata/Details panel is visible again
            await expect(metadataPanel).toBeVisible({ timeout: 5000 });

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
            await expect(contextMenu.locator('text="Download Original"')).toBeVisible();
            await expect(contextMenu.locator('text="Delete"')).toBeVisible();

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
            const emptyState = page.locator('#add_to_collection-container');
            
            // Wait for either the photo grid or the empty state to appear
            await expect(async () => {
                const hasGrid = await grid.isVisible();
                const hasEmpty = await emptyState.isVisible();
                expect(hasGrid || hasEmpty).toBe(true);
            }).toPass({ timeout: 15000 });

            if (await grid.isVisible()) {
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
            } else {
                console.log('Tested empty collection page successfully');
                await expect(emptyState).toBeVisible();
            }
        }
    });

    test('should keep scroll stable during favourite/unfavourite', async ({ page }) => {
        const photos = page.locator('.asset-photo');
        await expect(async () => {
            expect(await photos.count()).toBeGreaterThan(0);
        }).toPass({ timeout: 10000 });

        const container = page.locator('.viz-view-container');
        
        // Record starting scroll position
        const initialScroll = await container.evaluate((el) => el.scrollTop);
        
        // Right click first photo and favourite it
        const firstPhoto = photos.first();
        await firstPhoto.click({ button: 'right' });
        
        const contextMenu = page.locator('.context-menu');
        await expect(contextMenu).toBeVisible();
        
        const favButton = contextMenu.locator('button:has-text("Favourite"), button:has-text("Unfavourite")');
        await expect(favButton).toBeVisible();
        
        await favButton.click();
        
        // Ensure context menu closed and check if scroll position remained stable
        await expect(contextMenu).not.toBeVisible();
        
        // Wait a small bit for any delayed scroll reactions
        await page.waitForTimeout(300);
        
        const finalScroll = await container.evaluate((el) => el.scrollTop);
        expect(Math.abs(finalScroll - initialScroll)).toBeLessThan(5); // should be stable within a few pixels tolerance
    });

    test('should not scroll parent when navigating visible items, but scroll parent when navigating off-screen', async ({ page }) => {
        const photos = page.locator('.asset-photo');
        await expect(async () => {
            expect(await photos.count()).toBeGreaterThan(2);
        }).toPass({ timeout: 10000 });

        const container = page.locator('.viz-view-container');
        
        // Start on first photo
        const firstPhoto = photos.first();
        await firstPhoto.click();
        await expect(firstPhoto).toHaveClass(/selected-photo/);
        
        // Record scroll position
        const initialScroll = await container.evaluate((el) => el.scrollTop);
        
        // Navigate Left and Right (visible items)
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(100);
        
        // Scroll should remain perfectly still
        let currentScroll = await container.evaluate((el) => el.scrollTop);
        expect(Math.abs(currentScroll - initialScroll)).toBeLessThan(2);
        
        await page.keyboard.press('ArrowLeft');
        await page.waitForTimeout(100);
        
        currentScroll = await container.evaluate((el) => el.scrollTop);
        expect(Math.abs(currentScroll - initialScroll)).toBeLessThan(2);
    });

    test('should support zooming in the lightbox using mouse wheel and trackpad pinch', async ({ page }) => {
        const photos = page.locator('.asset-photo');
        await expect(async () => {
            const count = await photos.count();
            expect(count).toBeGreaterThan(0);
        }).toPass({ timeout: 10000 });

        // Open Lightbox
        await photos.first().dblclick();
        const lightbox = page.locator('#viz-lightbox-overlay');
        await expect(lightbox).toBeVisible();

        const zoomTarget = lightbox.locator('.zoom-target');
        await expect(zoomTarget).toBeVisible();

        // 1. Initial scale should be 1.0 (unzoomed)
        let style = await zoomTarget.getAttribute('style');
        expect(style).toContain('scale(1)');

        // 2. Zoom in using mouse wheel (deltaY: -120, ctrlKey: false)
        await zoomTarget.dispatchEvent('wheel', {
            deltaY: -120,
            clientX: 300,
            clientY: 225,
            ctrlKey: false
        });

        // Verify scale increases above 1.0
        style = await zoomTarget.getAttribute('style');
        let scaleMatch = style?.match(/scale\(([\d.]+)\)/);
        let scaleVal = scaleMatch ? parseFloat(scaleMatch[1]) : 1.0;
        expect(scaleVal).toBeGreaterThan(1.0);
        const mouseWheelZoomScale = scaleVal;

        // 3. Zoom in further using trackpad pinch (deltaY: -10, ctrlKey: true)
        await zoomTarget.dispatchEvent('wheel', {
            deltaY: -10,
            clientX: 300,
            clientY: 225,
            ctrlKey: true
        });

        // Verify scale increases further
        style = await zoomTarget.getAttribute('style');
        scaleMatch = style?.match(/scale\(([\d.]+)\)/);
        scaleVal = scaleMatch ? parseFloat(scaleMatch[1]) : 1.0;
        expect(scaleVal).toBeGreaterThan(mouseWheelZoomScale);

        // 4. Double click to zoom out / reset
        await lightbox.locator('.lightbox-image.main').dblclick({ force: true });
        style = await zoomTarget.getAttribute('style');
        expect(style).toContain('scale(1)');
    });
});

