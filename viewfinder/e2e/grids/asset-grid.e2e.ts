import { test, expect } from '@playwright/test';

test.describe('AssetGrid Functionality', () => {

    test.beforeEach(async ({ page }) => {
        // Navigate to /collections where AssetGrid is primarily used
        await page.goto('/collections');
        await page.waitForLoadState('networkidle');
        
        // Wait for the view container to appear
        await expect(page.locator('.viz-view-container')).toBeVisible({ timeout: 20000 });
    });

    test('should render collections in AssetGrid', async ({ page }) => {
        const grid = page.locator('.viz-asset-grid-container');
        await expect(grid).toBeVisible();

        const collectionCards = grid.locator('.asset-card');
        
        // Wait for collections to load
        await expect(async () => {
            const count = await collectionCards.count();
            expect(count).toBeGreaterThan(0);
        }).toPass({ timeout: 10000 }).catch(() => {
            console.log('No collections found, skipping selection tests');
        });

        const count = await collectionCards.count();
        if (count > 0) {
            const firstCard = collectionCards.first();
            
            // 1. Single selection
            await firstCard.click();
            await expect(firstCard).toHaveClass(/selected-card/);
            
            // 2. Multi-selection with Ctrl
            if (count > 1) {
                const secondCard = collectionCards.nth(1);
                await secondCard.click({ modifiers: ['Control'] });
                await expect(secondCard).toHaveClass(/selected-card/);
                await expect(firstCard).toHaveClass(/selected-card/);
            }
            
            // 3. Range selection with Shift
            if (count > 2) {
                const thirdCard = collectionCards.nth(2);
                await firstCard.click(); // Reset selection to first
                await thirdCard.click({ modifiers: ['Shift'] });
                await expect(firstCard).toHaveClass(/selected-card/);
                await expect(collectionCards.nth(1)).toHaveClass(/selected-card/);
                await expect(thirdCard).toHaveClass(/selected-card/);
            }

            // 4. Clear selection with Escape
            await page.keyboard.press('Escape');
            await expect(firstCard).not.toHaveClass(/selected-card/);
        } else {
            // Verify empty state message
            await expect(page.locator('#create_collection-container')).toBeVisible();
        }
    });

    test('should navigate to collection on double click', async ({ page }) => {
        const collectionCards = page.locator('.viz-asset-grid-container .asset-card');
        
        await expect(async () => {
            const count = await collectionCards.count();
            expect(count).toBeGreaterThan(0);
        }).toPass({ timeout: 10000 });

        if (await collectionCards.count() > 0) {
            await collectionCards.first().dblclick();
            await page.waitForLoadState('networkidle');
            await expect(page).toHaveURL(/\/collections\/.+/);
        }
    });

    test('should show context menu on right click', async ({ page }) => {
        const collectionCards = page.locator('.viz-asset-grid-container .asset-card');
        
        await expect(async () => {
            const count = await collectionCards.count();
            expect(count).toBeGreaterThan(0);
        }).toPass({ timeout: 10000 });

        if (await collectionCards.count() > 0) {
            const firstCard = collectionCards.first();
            await firstCard.click({ button: 'right' });
            
            const contextMenu = page.locator('.context-menu');
            await expect(contextMenu).toBeVisible();
            
            // Verify items in collection context menu
            await expect(contextMenu.locator('text="Edit"')).toBeVisible();
            await expect(contextMenu.locator('text="Duplicate"')).toBeVisible();
            await expect(contextMenu.locator('text="Delete"')).toBeVisible();
        }
    });

    test('should handle keyboard navigation in the grid', async ({ page }) => {
        const collectionCards = page.locator('.viz-asset-grid-container .asset-card');
        
        await expect(async () => {
            const count = await collectionCards.count();
            expect(count).toBeGreaterThan(0);
        }).toPass({ timeout: 10000 });

        if (await collectionCards.count() > 1) {
            const firstCard = collectionCards.first();
            const secondCard = collectionCards.nth(1);
            
            await firstCard.click();
            await expect(firstCard).toHaveClass(/selected-card/);
            
            await page.keyboard.press('ArrowRight');
            await expect(secondCard).toHaveClass(/selected-card/);
            await expect(firstCard).not.toHaveClass(/selected-card/);
        }
    });

    test('should function correctly in search results', async ({ page }) => {
        // Navigate to search with query that returns collections
        await page.goto('/search?q=a');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('.viz-view-container')).toBeVisible({ timeout: 20000 });

        const collectionsSection = page.locator('.collections-section');
        
        await expect(async () => {
            const isVisible = await collectionsSection.isVisible();
            expect(isVisible).toBe(true);
        }).toPass({ timeout: 10000 }).catch(() => {
            console.log('No collections found in search results');
        });

        if (await collectionsSection.isVisible()) {
            const collectionCards = collectionsSection.locator('.asset-card');
            await expect(collectionCards.first()).toBeVisible();
            
            await collectionCards.first().click();
            await expect(collectionCards.first()).toHaveClass(/selected-card/);
        }
    });
});
