import { expect, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

// Ensure tests run unauthenticated by clearing cookies and storage
test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/auth/login");
    await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
    });
});

test.describe("Auth flows", () => {
    test("login shows validation message when submitting empty form", async ({ page }) => {
        await page.goto("/auth/login");
        await page.fill("#login-email", "invalid@test.com");
        await page.fill("#login-password", "wrongpass");
        await page.click("#login-submit");
        await expect(page.locator(".viz-toast-error")).toBeVisible({ timeout: 10000 });
    });

    test("register shows validation messages for incomplete form", async ({ page }) => {
        await page.goto("/auth/register");
        await page.fill("#reg-email", "tester@test.com");
        await page.fill("#reg-name", "Tester");
        await page.fill("#reg-password", "pass123");
        await page.fill("#reg-password-confirm", "mismatch123");
        await page.click("#reg-submit");
        await expect(page.locator(".viz-toast-error")).toBeVisible({ timeout: 10000 });
    });
});
