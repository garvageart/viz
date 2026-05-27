import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

// Ensure tests run unauthenticated by clearing cookies and storage
test.beforeEach(async ({ page }) => {
    // Navigate to app origin so localStorage/sessionStorage can be cleared
    await page.goto('/auth/login');
    await page.context().clearCookies();
    await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
    });
});

test.describe('Auth flows', () => {
    test('login shows validation message when submitting empty form', async ({ page }) => {
        await page.goto('/auth/login');
        await page.evaluate(() => {
            document.querySelectorAll('input').forEach(input => input.removeAttribute('required'));
        });
        await page.click('#login-submit');
        await expect(page.locator('text=Please fill in all fields')).toBeVisible();
    });

    test('register shows validation messages for incomplete form', async ({ page }) => {
        await page.goto('/auth/register');
        await page.evaluate(() => {
            document.querySelectorAll('input').forEach(input => input.removeAttribute('required'));
        });
        await page.click('#reg-submit');
        await expect(page.locator('text=Please fill in all fields')).toBeVisible();

        // Fill email and name only, expect password confirm message when password missing
        await page.fill('#reg-email', 'a@b.com');
        await page.fill('#reg-name', 'Tester');
        await page.click('#reg-submit');
        await expect(page.locator('text=Please fill in all fields')).toBeVisible();
    });
});
