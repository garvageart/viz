import { test, expect } from '@playwright/test';

test('navigation between auth pages works', async ({ page }) => {
    await page.goto('/auth/login');

    // Click the Register link and expect to land on register page
    await page.click('text=Register');
    await expect(page).toHaveURL(/\/auth\/register/);
    await expect(page.locator('#reg-heading')).toBeVisible();
});

test('home page has expected skip-to-main link', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('a.skip-to-main')).toBeVisible();
});
