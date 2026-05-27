import { test, expect } from '@playwright/test';

test.describe('Workspace Layout & Persistence', () => {
    
    test.beforeEach(async ({ page }) => {
        test.slow();
        // Go to home to establish origin
        await page.goto('/');
        
        // Set layout in localStorage to ensure predictable starting point
        await page.evaluate(() => {
            const singleLayout = {
                root: {
                    type: "tab-group",
                    id: "tg-main",
                    size: 100,
                    locked: false,
                    activeViewId: 1,
                    views: [
                        { name: "Clock", id: 1, isActive: true },
                        { name: "Filter", id: 2, isActive: false },
                        { name: "Collections", id: 3, isActive: false, path: "/collections" }
                    ]
                },
                activeGroupId: "tg-main"
            };
            localStorage.setItem("viz:workspaceLayout", JSON.stringify(singleLayout));
        });

        // Reload to load the single group layout
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Wait for the workspace to initialize
        await expect(page.locator('.viz-workspace')).toBeVisible({ timeout: 15000 });
    });

    test('should persist open collection tabs after page reload', async ({ page }) => {
        // 1. Find the "Collections" tab and click it
        const collectionsTab = page.locator('button[role="tab"]').filter({ hasText: 'Collections' });
        await expect(collectionsTab).toBeVisible();
        await collectionsTab.click();

        // 2. Wait for collection cards to load
        const collectionCard = page.locator('.coll-card').first();
        await expect(collectionCard).toBeVisible({ timeout: 10000 });

        const collectionName = await collectionCard.locator('.coll-name').textContent();
        expect(collectionName).toBeTruthy();
        const trimmedName = collectionName!.trim();
        console.log(`Opening collection: "${trimmedName}"`);

        // 3. Open the collection via DOUBLE CLICK (as required by AssetGrid)
        await collectionCard.dblclick();
        
        // 4. Verify a new tab opened with the collection name and is active
        try {
            const dynamicTab = page.locator('button[role="tab"]').filter({ hasText: trimmedName });
            await expect(dynamicTab.first()).toBeVisible({ timeout: 10000 });
        } catch (e) {
            const allTabs = await page.locator('button[role="tab"]').allTextContents();
            console.log('All visible tabs:', allTabs);
            throw e;
        }

        // Wait for Svelte to save the updated layout to localStorage
        await expect(async () => {
            const layout = await page.evaluate(() => localStorage.getItem('viz:workspaceLayout'));
            expect(layout).toContain(trimmedName);
        }).toPass({ timeout: 5000 });

        // 5. Reload the page
        await page.reload();
        await page.waitForLoadState('networkidle');

        // 6. Verify the tab is still there, active, and has the correct name
        await expect(page.locator('.viz-workspace')).toBeVisible({ timeout: 15000 });
        const persistedTab = page.locator('button[role="tab"]').filter({ hasText: trimmedName });
        await expect(persistedTab.first()).toBeVisible({ timeout: 15000 });
        
        // 7. Verify the content of the tab is loaded
        await expect(page.locator('.tab-group-content').first()).not.toContainText('No active view');
    });

    test('should persist tab group splits after page reload', async ({ page }) => {
        // 1. Identify the initial tab group
        const firstTab = page.locator('button[role="tab"]').first();
        await expect(firstTab).toBeVisible();

        // 2. Perform a split via context menu
        const tabName = await firstTab.locator('.tab-name').textContent();
        const trimmedName = tabName!.trim();
        await firstTab.click({ button: 'right' });

        // 3. Select "Split Right" from the context menu
        const splitRightOption = page.locator('text="Split Right"');
        await expect(splitRightOption).toBeVisible();
        await splitRightOption.click();
        
        // Wait for the layout to update
        await page.waitForTimeout(1000);

        // 4. Verify we now have multiple tab groups (indicated by splitters)
        const splitter = page.locator('.splitpanes__splitter');
        await expect(splitter.first()).toBeVisible();

        // Wait for Svelte to save the updated split layout to localStorage
        await expect(async () => {
            const layout = await page.evaluate(() => localStorage.getItem('viz:workspaceLayout'));
            expect(layout).toContain('split');
        }).toPass({ timeout: 5000 });

        // 5. Reload the page
        await page.reload();
        await page.waitForLoadState('networkidle');

        // 6. Verify the split persisted
        await expect(page.locator('.splitpanes__splitter').first()).toBeVisible({ timeout: 15000 });
        await expect(page.locator('button[role="tab"]').filter({ hasText: trimmedName }).first()).toBeVisible();
    });

    test('should handle closing tabs and persist the change', async ({ page }) => {
        // 1. Open a collection to have an extra tab
        await page.locator('button[role="tab"]').filter({ hasText: 'Collections' }).click();
        
        const collectionCard = page.locator('.coll-card').first();
        await expect(collectionCard).toBeVisible();
        const collectionName = await collectionCard.locator('.coll-name').textContent();
        const trimmedName = collectionName!.trim();
        await collectionCard.dblclick(); // Double click here too!
        
        const dynamicTab = page.locator('button[role="tab"]').filter({ hasText: trimmedName });
        await expect(dynamicTab.first()).toBeVisible({ timeout: 10000 });

        // 2. Close the tab via context menu
        await dynamicTab.first().click({ button: 'right' });
        const closeOption = page.locator('text="Close Tab"');
        await expect(closeOption).toBeVisible();
        await closeOption.click();
        
        await page.waitForTimeout(1000);

        // 3. Verify it's gone
        await expect(dynamicTab).not.toBeVisible();

        // Wait for Svelte to save the updated layout to localStorage
        await expect(async () => {
            const layout = await page.evaluate(() => localStorage.getItem('viz:workspaceLayout'));
            expect(layout).not.toContain(trimmedName);
        }).toPass({ timeout: 5000 });

        // 4. Reload
        await page.reload();
        await page.waitForLoadState('networkidle');

        // 5. Verify it's still gone
        await expect(page.locator('button[role="tab"]').filter({ hasText: trimmedName })).not.toBeVisible();
    });
});
