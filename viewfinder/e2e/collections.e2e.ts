import { test, expect } from '@playwright/test';

test('collections page shows empty state and opens create modal', async ({ page }) => {
    await page.goto('/collections');

    // Expect the empty state prompt (no-collections)
    await expect(page.locator('#no-collections-container')).toBeVisible();

    // Click create button and expect modal to appear
    await page.click('#create-collection-button');
    await expect(page.locator('#viz-collection-modal')).toBeVisible();
});
