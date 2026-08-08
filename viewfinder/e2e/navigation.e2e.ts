import { expect, test } from "@playwright/test";

test.describe("Unauthenticated navigation", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("navigation between auth pages works", async ({ page }) => {
        await page.goto("/auth/login");

        // Click the Register link and expect to land on register page
        await page.locator('a[href="/auth/register"]').click();
        await expect(page).toHaveURL(/\/auth\/register/);
        await expect(page.locator(".auth-heading").first()).toBeVisible();
    });
});

test("home page has expected skip-to-main link", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".viz-workspace, main").first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator("a.skip-to-main")).toBeAttached();
});
