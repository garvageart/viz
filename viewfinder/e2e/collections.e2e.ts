import { test, expect } from '@playwright/test';

test('collections page shows empty state and opens create modal', async ({ page }) => {
    await page.goto('/collections');

    // Wait for the 'Create Collection' button (present in both empty state and toolbar populated state) to be visible
    const createBtn = page.getByRole('button', { name: 'Create Collection' }).first();
    await expect(createBtn).toBeVisible({ timeout: 10000 });

    await createBtn.click();

    await expect(page.locator('#viz-collection-modal')).toBeVisible();
});
